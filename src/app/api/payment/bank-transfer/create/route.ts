import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const MINIMUM_TRANSFER_TL = 500;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
  if (rateLimit(`bank-transfer:${session.user.id}:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Çok fazla talep oluşturdunuz. Lütfen bekleyin." }, { status: 429 });
  }

  const settings = await getSettings(["bank_transfer_enabled"]);
  if ((settings.bank_transfer_enabled || "1") !== "1") {
    return NextResponse.json({ error: "Havale / EFT şu anda kullanılamıyor." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < MINIMUM_TRANSFER_TL || amount > 1_000_000) {
    return NextResponse.json({ error: `Havale / EFT ile en az ${MINIMUM_TRANSFER_TL} TL yükleyebilirsiniz.` }, { status: 400 });
  }

  const payment = await db.payment.create({
    data: {
      userId: session.user.id,
      amount: Number(amount.toFixed(2)),
      method: "BANK_TRANSFER",
      status: "PENDING",
      externalId: `HVL-${Date.now().toString(36).toUpperCase()}`,
    },
    select: { id: true, amount: true, externalId: true },
  });

  return NextResponse.json({ paymentId: payment.id, amount: payment.amount, reference: payment.externalId });
}
