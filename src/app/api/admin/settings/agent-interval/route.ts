import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const interval = parseInt(body.interval, 10);
    
    if (isNaN(interval) || interval <= 0) {
      return NextResponse.json({ error: "Lütfen 0'dan büyük geçerli bir dakika girin." }, { status: 400 });
    }

    await db.setting.upsert({
      where: { key: "autonomous_agent_interval_minutes" },
      update: { value: String(interval) },
      create: { key: "autonomous_agent_interval_minutes", value: String(interval) },
    });

    return NextResponse.json({ success: true, interval }, { status: 200 });
  } catch (error) {
    console.error("[Agent Interval API Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "İç sunucu hatası." },
      { status: 500 }
    );
  }
}
