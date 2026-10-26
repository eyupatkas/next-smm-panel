import { startEmbeddedScheduler } from "@/lib/services/embedded-scheduler";

export async function register() {
  const shouldStartInDev = process.env.ENABLE_EMBEDDED_SCHEDULER_DEV === "1";
  const schedulerDisabled = process.env.DISABLE_EMBEDDED_SCHEDULER === "1";

  if (!schedulerDisabled && process.env.NEXT_RUNTIME === "nodejs" && (process.env.NODE_ENV === "production" || shouldStartInDev)) {
    startEmbeddedScheduler();
  }
}
