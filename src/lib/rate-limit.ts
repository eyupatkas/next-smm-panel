/**
 * Basit bellek-içi sliding-window rate limiter.
 * PM2 fork modu (instances: 1) için yeterli.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 50_000;

function cleanupExpired(now: number) {
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

function enforceCapacity(now: number) {
  if (store.size < MAX_ENTRIES) return;
  cleanupExpired(now);
  while (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

// Bellek sızıntısını önlemek için periyodik temizlik
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  cleanupExpired(now);
}, 60_000);
cleanupTimer.unref();

/**
 * @param key    Benzersiz tanımlayıcı (örn. "login:<ip>")
 * @param limit  Pencere başına izin verilen maksimum istek sayısı
 * @param windowMs  Pencere süresi (ms)
 * @returns true  → limit aşıldı (isteği reddet)
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    enforceCapacity(now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > limit) return true; // aşıldı

  return false;
}

/** İstekten gerçek IP adresini al (proxy destekli) */
export function getClientIp(req: Request): string {
  const headers = req instanceof Request ? req.headers : (req as { headers: Headers }).headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
