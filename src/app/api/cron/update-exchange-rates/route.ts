import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLiveCurrencyRates } from "@/lib/exchange-rates";
import { setSettings } from "@/lib/settings";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    
    // Fail closed: üretimde kaynak koda gömülü veya varsayılan bir cron anahtarı kullanma.
    const secret = process.env.CRON_SECRET;
    if (!secret || key !== secret) {
      return NextResponse.json({ error: "Yetkisiz işlem." }, { status: 401 });
    }

    const startTime = Date.now();
    const liveRates = await getLiveCurrencyRates();

    if (!liveRates.USD || !liveRates.INR) {
      throw new Error("API kurları eksik veya hatalı.");
    }

    const usdToTry = 1 / liveRates.USD;
    const inrToTry = 1 / liveRates.INR;

    // Veritabanı ayarlarını güncelle
    await setSettings({
      usd_to_try_rate: usdToTry.toFixed(4),
      inr_to_try_rate: inrToTry.toFixed(4),
    });

    // JobRun kaydı ekle
    await db.jobRun.create({
      data: {
        jobName: "ExchangeRatesUpdate",
        status: "SUCCESS",
        trigger: "CRON",
        scanned: 2,
        synced: 2,
        sent: 0,
        failures: 0,
        refundedTotal: 0,
        details: `USD/TRY: ${usdToTry.toFixed(4)} · INR/TRY: ${inrToTry.toFixed(4)}`,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startTime,
      rates: {
        USD: usdToTry,
        INR: inrToTry,
      },
    });
  } catch (error) {
    console.error("[Cron ExchangeRates] Hata:", error);
    
    // Hata durumunda da JobRun kaydı ekleyelim
    try {
      await db.jobRun.create({
        data: {
          jobName: "ExchangeRatesUpdate",
          status: "FAILED",
          trigger: "CRON",
          scanned: 0,
          synced: 0,
          sent: 0,
          failures: 1,
          refundedTotal: 0,
          details: error instanceof Error ? error.message : "Bilinmeyen hata",
          finishedAt: new Date(),
        },
      });
    } catch (dbErr) {
      console.error("[Cron ExchangeRates] JobRun kaydı eklenemedi:", dbErr);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Kurlar güncellenirken hata oluştu.",
    }, { status: 500 });
  }
}
