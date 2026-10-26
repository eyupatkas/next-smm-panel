import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { calculateProviderCost } from "@/lib/pricing";
import { applyPricingGuard, getPricingGuard } from "@/lib/pricing-guard";
import { cleanLink } from "@/lib/services/dashboard-checkout";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { applyUserMoneyDelta } from "@/lib/money";
import { getEffectiveAvailableBalance } from "@/lib/services/dashboard-checkout";

// ─── Hazır Paket Satın Alma ───────────────────────────────────────────────────
// Güvenlik: Fiyat tamamen sunucu tarafında DB'den alınır.
// Frontend'den sadece packageId ve link gelir.

function getPackagePriceByRole(
  role: string,
  pkg: { price: number; retailPrice: number | null; resellerPrice: number | null }
): number {
  if (role === "RESELLER") return pkg.resellerPrice ?? pkg.price;
  return pkg.retailPrice ?? pkg.price;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }
    if (rateLimit(`package-checkout:${session.user.id}:${getClientIp(request)}`, 10, 60_000)) {
      return NextResponse.json({ error: "Çok fazla sipariş denemesi. Lütfen bekleyin." }, { status: 429 });
    }

    // Admin impersonation desteği
    const jar = await cookies();
    const impersonateId =
      session.user.role === "ADMIN" ? jar.get("admin_impersonate")?.value : undefined;
    const userId = impersonateId ?? session.user.id;

    let body: { packageId?: unknown; link?: unknown };
    try {
      body = (await request.json()) as { packageId?: unknown; link?: unknown };
    } catch {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const packageId = String(body.packageId ?? "").trim();
    const link = cleanLink(String(body.link ?? "").trim());

    if (!packageId || !link) {
      return NextResponse.json(
        { error: "Paket ve link zorunludur." },
        { status: 400 }
      );
    }

    // Basit URL doğrulaması
    try {
      const url = new URL(link.startsWith("http") ? link : `https://${link}`);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ error: "Geçerli bir URL girin." }, { status: 400 });
    }

    // Kullanıcıyı çek
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, balance: true, spent: true, banned: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }
    if (user.banned) {
      return NextResponse.json({ error: "Hesabınız askıya alındı." }, { status: 403 });
    }

    // Paketi DB'den çek — fiyat sunucudan
    const pkg = await db.package.findFirst({
      where: { id: packageId, status: true },
      select: {
        id: true,
        name: true,
        quantity: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        service: {
          select: {
            id: true,
            name: true,
            min: true,
            max: true,
            serviceType: true,
            externalId: true,
            price: true,
            retailPrice: true,
            resellerPrice: true,
            status: true,
            provider: {
              select: {
                id: true,
                name: true,
                apiUrl: true,
                apiKey: true,
                status: true,
                retailMarkupPercent: true,
                resellerMarkupPercent: true,
              },
            },
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Paket bulunamadı veya pasif." }, { status: 404 });
    }

    if (!pkg.service.status) {
      return NextResponse.json({ error: "Bu paketin servisi şu an pasif." }, { status: 400 });
    }

    if (pkg.quantity < pkg.service.min || pkg.quantity > pkg.service.max) {
      return NextResponse.json(
        { error: "Paket miktarı servis limitleri dışında." },
        { status: 400 }
      );
    }

    // Fiyatı rol bazlı hesapla — zarar önleyici guard maliyet + min kâr tabanını uygular
    const guard = await getPricingGuard();
    const providerCost = calculateProviderCost(pkg.service, pkg.quantity);
    const packageCharge = applyPricingGuard(Number(getPackagePriceByRole(user.role, pkg).toFixed(4)), providerCost, guard);
    const charge = Number(Math.max(packageCharge, providerCost).toFixed(4));

    if (charge <= 0) {
      return NextResponse.json({ error: "Geçersiz paket fiyatı." }, { status: 400 });
    }

    if (Number(user.balance) < charge) {
      return NextResponse.json(
        {
          error: `Yetersiz bakiye. Gerekli: ${charge.toFixed(2)} TL, Mevcut: ${Number(user.balance).toFixed(2)} TL`,
        },
        { status: 402 }
      );
    }

    // Siparişi oluştur + bakiyeyi transaction içinde düş
    let order;
    try {
      order = await db.$transaction(async (tx) => {
        const freshUserResult = await tx.$queryRaw<{balance: number}[]>`SELECT balance FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        const freshUser = freshUserResult[0];

        if (!freshUser || (await getEffectiveAvailableBalance(tx, user.id, freshUser.balance)) < charge) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const created = await tx.order.create({
          data: {
            userId: user.id,
            serviceId: pkg.service.id,
            link,
            quantity: pkg.quantity,
            charge,
            status: "PENDING",
            apiOrderId: null,
            remains: pkg.quantity,
            providerStatus: null,
            providerRawStatus: null,
            providerSentAt: null,
            providerSyncError: null,
            error: null,
          },
          select: { id: true },
        });

        await applyUserMoneyDelta(tx, user.id, {
          balance: -charge,
          spent: charge,
        });

        return created;
      });
    } catch (err) {
      if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "Yetersiz bakiye." }, { status: 400 });
      }
      throw err;
    }

    const sendResult = pkg.service.provider?.status && pkg.service.externalId
      ? await sendOrderToProvider(order.id)
      : null;

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/packages");

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      charge,
      message: sendResult?.resolved && sendResult.status === "CANCELED"
        ? "Sipariş sağlayıcı tarafından reddedildi; ücret bakiyenize otomatik iade edildi."
        : "Siparişiniz oluşturuldu.",
    });
  } catch (error) {
    console.error("[package-checkout] Error:", error);
    return NextResponse.json(
      { error: "Sipariş oluşturulurken hata oluştu." },
      { status: 500 }
    );
  }
}
