import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  const settings = await getSettings(["cryptomus_enabled"]);
  
  const paymentMethods = {
    paytr: false,
    iyzico: false,
    cryptomus: settings.cryptomus_enabled === "1",
  };

  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, paymentMethods });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false, paymentMethods });
  }

  return NextResponse.json({
    authenticated: true,
    name: user.name,
    email: user.email,
    phone: user.phone,
    paymentMethods,
  });
}
