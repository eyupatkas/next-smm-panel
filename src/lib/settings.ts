import { db } from "@/lib/db";
import { getLiveCurrencyRates } from "@/lib/exchange-rates";

export type SettingMap = Record<string, string>;

// Keep card processors disabled server-side while only crypto and manual bank transfer are accepted.
export function areCardPaymentsDisabled() {
  return true;
}

export type SchedulerSettings = {
  intervalMs: number;
  batchLimit: number;
  serviceSyncIntervalHours: number;
};

export async function getSettings(keys: string[]): Promise<SettingMap> {
  const map: SettingMap = {};
  for (const key of keys) map[key] = "";

  let rows: Array<{ key: string; value: string }> = [];

  try {
    rows = await db.setting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[settings] falling back to env/default values", error);
    }
    return map;
  }

  for (const row of rows) map[row.key] = row.value;

  return map;
}

export async function setSettings(values: SettingMap) {
  const entries = Object.entries(values);
  await db.$transaction(
    entries.map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
}

export async function getSchedulerSettings(): Promise<SchedulerSettings> {
  const settings = await getSettings(["provider_sync_interval_ms", "provider_sync_batch_limit", "service_sync_interval_hours"]);

  const intervalRaw = Number(settings.provider_sync_interval_ms || process.env.PROVIDER_SYNC_INTERVAL_MS || 60000);
  const batchRaw = Number(settings.provider_sync_batch_limit || process.env.PROVIDER_SYNC_BATCH_LIMIT || 25);
  const syncHours = Number(settings.service_sync_interval_hours);

  return {
    intervalMs: Number.isFinite(intervalRaw) && intervalRaw >= 15000 ? intervalRaw : 60000,
    batchLimit: Number.isFinite(batchRaw) && batchRaw >= 1 ? Math.min(batchRaw, 100) : 25,
    serviceSyncIntervalHours: Number.isFinite(syncHours) && syncHours >= 1 ? syncHours : 6,
  };
}

export type MarkupSettings = {
  retailMarkupPercent: number;
  resellerMarkupPercent: number;
};

export async function getMarkupSettings(): Promise<MarkupSettings> {
  const settings = await getSettings([
    "retail_markup_percent",
    "reseller_markup_percent",
  ]);

  const retail = Number(settings.retail_markup_percent);
  const reseller = Number(settings.reseller_markup_percent);

  return {
    retailMarkupPercent: Number.isFinite(retail) && retail >= 0 ? retail : 200,
    resellerMarkupPercent: Number.isFinite(reseller) && reseller >= 0 ? reseller : 100,
  };
}

export async function getVatRate(): Promise<number> {
  const settings = await getSettings(["vat_rate"]);
  const rate = Number(settings.vat_rate);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 20;
}

export async function getUsdToTryRate(): Promise<number> {
  try {
    const liveRates = await getLiveCurrencyRates();
    if (liveRates.USD && liveRates.USD > 0) {
      const rate = 1 / liveRates.USD;
      if (rate >= 30 && rate <= 100) return rate;
    }
  } catch (error) {
    console.error("[settings] Live USD rate fetch failed, using fallback:", error);
  }
  const s = await getSettings(["usd_to_try_rate"]);
  const r = Number(s.usd_to_try_rate);
  return Number.isFinite(r) && r > 0 ? r : 50.0;
}

export async function getInrToTryRate(): Promise<number> {
  try {
    const liveRates = await getLiveCurrencyRates();
    if (liveRates.INR && liveRates.INR > 0) {
      const rate = 1 / liveRates.INR;
      if (rate >= 0.2 && rate <= 2.0) return rate;
    }
  } catch (error) {
    console.error("[settings] Live INR rate fetch failed, using fallback:", error);
  }
  const s = await getSettings(["inr_to_try_rate"]);
  const r = Number(s.inr_to_try_rate);
  return Number.isFinite(r) && r > 0 ? r : 0.60;
}

