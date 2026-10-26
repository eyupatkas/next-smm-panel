import { syncProviderOrdersBatch } from "@/lib/services/provider-order-sync";
import { getSchedulerSettings } from "@/lib/settings";
import { runAutoBlogPost } from "@/lib/services/blog-ai";
import { runProviderServiceSync } from "@/lib/services/provider-service-sync";
import { db } from "@/lib/db";

declare global {
  var smmSchedulerStarted: boolean | undefined;
  var smmSchedulerTimer: NodeJS.Timeout | undefined;
  var smmSchedulerRunning: boolean | undefined;
  var smmBlogSchedulerTimer: NodeJS.Timeout | undefined;
  var smmServiceSyncTimer: NodeJS.Timeout | undefined;
  var smmServiceSyncRunning: boolean | undefined;
  var smmAbandonedOrderTimer: NodeJS.Timeout | undefined;
}

function clearScheduledTimer() {
  if (globalThis.smmSchedulerTimer) {
    clearTimeout(globalThis.smmSchedulerTimer);
    globalThis.smmSchedulerTimer = undefined;
  }
}

async function scheduleNextRun() {
  clearScheduledTimer();

  let settings;
  try {
    settings = await getSchedulerSettings();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[scheduler] using default interval because settings could not be loaded", error);
    }
    settings = {
      intervalMs: Number(process.env.PROVIDER_SYNC_INTERVAL_MS || 60000),
      batchLimit: Number(process.env.PROVIDER_SYNC_BATCH_LIMIT || 25),
    };
  }

  globalThis.smmSchedulerTimer = setTimeout(() => {
    void runProviderSyncJob();
  }, settings.intervalMs);

  if (typeof globalThis.smmSchedulerTimer.unref === "function") {
    globalThis.smmSchedulerTimer.unref();
  }
}

async function runProviderSyncJob() {
  if (globalThis.smmSchedulerRunning) {
    return;
  }

  globalThis.smmSchedulerRunning = true;

  try {
    let settings;
    try {
      settings = await getSchedulerSettings();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[scheduler] using default batch settings", error);
      }
      settings = {
        intervalMs: Number(process.env.PROVIDER_SYNC_INTERVAL_MS || 60000),
        batchLimit: Number(process.env.PROVIDER_SYNC_BATCH_LIMIT || 25),
      };
    }
    const result = await syncProviderOrdersBatch(settings.batchLimit, "scheduler");

    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[scheduler] provider sync scanned=${result.scanned} synced=${result.synced} failures=${result.failures} refunded=${result.refundedTotal}`
      );
    }
  } catch (error) {
    console.error("[scheduler] provider sync failed", error);
  } finally {
    globalThis.smmSchedulerRunning = false;
    await scheduleNextRun();
  }
}

export function startEmbeddedScheduler() {
  if (globalThis.smmSchedulerStarted) {
    return;
  }

  globalThis.smmSchedulerStarted = true;

  void runProviderSyncJob();
  void scheduleBlogAutoPost();
  void scheduleServiceSync();
  void scheduleAbandonedOrderCleanup();

  console.info(
    `[scheduler] embedded provider sync started`
  );
}

// Blog otomasyon scheduler - her 30dk kontrol eder
async function scheduleBlogAutoPost() {
  const BLOG_CHECK_INTERVAL = 30 * 60 * 1000; // 30 dakikada bir kontrol

  async function runBlogCheck() {
    try {
      const result = await runAutoBlogPost();
      if (result.success) {
        console.info(`[blog-scheduler] ${result.message}`);
      }
    } catch (error) {
      console.error("[blog-scheduler] auto post failed", error);
    }

    globalThis.smmBlogSchedulerTimer = setTimeout(() => {
      void runBlogCheck();
    }, BLOG_CHECK_INTERVAL);

    if (typeof globalThis.smmBlogSchedulerTimer.unref === "function") {
      globalThis.smmBlogSchedulerTimer.unref();
    }
  }

  // İlk çalıştırma 5dk sonra (boot sırasında yük olmasın)
  globalThis.smmBlogSchedulerTimer = setTimeout(() => {
    void runBlogCheck();
  }, 5 * 60 * 1000);

  if (typeof globalThis.smmBlogSchedulerTimer.unref === "function") {
    globalThis.smmBlogSchedulerTimer.unref();
  }
}

// ─── Provider Service Fiyat Sync Scheduler ──────────────────────────────────

async function scheduleServiceSync() {
  async function getIntervalMs() {
    try {
      const scheduler = await getSchedulerSettings();
      return scheduler.serviceSyncIntervalHours * 60 * 60 * 1000;
    } catch {
      return 6 * 60 * 60 * 1000; // 6 saat varsayılan
    }
  }

  async function runServiceSyncJob() {
    if (globalThis.smmServiceSyncRunning) return;
    globalThis.smmServiceSyncRunning = true;

    try {
      const summary = await runProviderServiceSync();
      console.info(
        `[service-sync] tamamlandı scanned=${summary.totalScanned} updated=${summary.totalUpdated} new=${summary.totalNew} deactivated=${summary.totalDeactivated} errors=${summary.totalErrors} ms=${summary.durationMs}`
      );
    } catch (error) {
      console.error("[service-sync] servis sync hatası", error);
    } finally {
      globalThis.smmServiceSyncRunning = false;
      const nextMs = await getIntervalMs();
      globalThis.smmServiceSyncTimer = setTimeout(() => {
        void runServiceSyncJob();
      }, nextMs);
      if (typeof globalThis.smmServiceSyncTimer.unref === "function") {
        globalThis.smmServiceSyncTimer.unref();
      }
    }
  }

  // İlk sync 15 dakika sonra başlasın
  const firstDelay = 15 * 60 * 1000;
  globalThis.smmServiceSyncTimer = setTimeout(() => {
    void runServiceSyncJob();
  }, firstDelay);

  if (typeof globalThis.smmServiceSyncTimer.unref === "function") {
    globalThis.smmServiceSyncTimer.unref();
  }
}

// ─── Terk Edilen Sipariş Temizleme ──────────────────────────────────────────

async function runAbandonedOrderCleanup() {
  const TIMEOUT_MS = 60 * 60 * 1000; // 1 saat bekleyen siparişler

  try {
    const cutoff = new Date(Date.now() - TIMEOUT_MS);
    const result = await db.order.updateMany({
      where: {
        status: "PENDING",
        error: "awaiting_payment",
        createdAt: { lt: cutoff },
      },
      data: {
        status: "CANCELED",
        error: "Ödeme süresi doldu",
      },
    });

    if (result.count > 0) {
      console.info(`[abandoned-cleanup] ${result.count} terk edilen sipariş iptal edildi.`);
    }
  } catch (error) {
    console.error("[abandoned-cleanup] hata", error);
  }
}

async function scheduleAbandonedOrderCleanup() {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 dakikada bir çalış

  async function runAndSchedule() {
    await runAbandonedOrderCleanup();
    globalThis.smmAbandonedOrderTimer = setTimeout(() => {
      void runAndSchedule();
    }, INTERVAL_MS);
    if (typeof globalThis.smmAbandonedOrderTimer?.unref === "function") {
      globalThis.smmAbandonedOrderTimer.unref();
    }
  }

  // İlk çalışma 10 dakika sonra
  globalThis.smmAbandonedOrderTimer = setTimeout(() => {
    void runAndSchedule();
  }, 10 * 60 * 1000);

  if (typeof globalThis.smmAbandonedOrderTimer?.unref === "function") {
    globalThis.smmAbandonedOrderTimer.unref();
  }
}