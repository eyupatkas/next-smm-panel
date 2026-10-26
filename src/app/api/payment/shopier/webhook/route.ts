import { NextRequest, NextResponse } from "next/server";
import { setSettings } from "@/lib/settings";
import { verifyShopierWebhook } from "@/lib/shopier";

/**
 * Shopier webhook bildirimleri (Notification URL).
 * İmza/token doğrulaması yapılar; geçerli olaylar kayıt altına alınır.
 * Sipariş-bakiye eşleştirme akışı, ödeme alma akışı devreye alındığında buraya bağlanacak.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > 200_000) {
    return NextResponse.json({ error: "Aşırı büyük istek." }, { status: 413 });
  }

  const verification = verifyShopierWebhook(rawBody, request.headers);
  if (!verification.ok) {
    // Başarısız doğrulamalar izlenebilirlik için loglanır, içerik işlenmez.
    console.warn(`[Shopier Webhook] reddedildi (${verification.reason})`, rawBody.slice(0, 500));
    return NextResponse.json({ error: "Doğrulama başarısız." }, { status: 401 });
  }

  console.log(`[Shopier Webhook] doğrulandı (${verification.method}):`, rawBody.slice(0, 2000));

  try {
    await setSettings({
      shopier_last_webhook_at: new Date().toISOString(),
      shopier_last_webhook_event: rawBody.slice(0, 4000),
    });
  } catch (error) {
    // Kayıt tutulamasa bile bildirimi onaylıyoruz; Shopier retry fırtınası yaşanmasın.
    console.error("[Shopier Webhook] olay kaydedilemedi:", error);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Yalnızca POST." }, { status: 405 });
}
