import "server-only";

const FALLBACK_APP_URL = "https://optismm.com";

/**
 * Returns the configured public origin. Never derive payment callback or return
 * URLs from request Host/X-Forwarded-* headers: those values may be attacker
 * controlled when a reverse proxy is misconfigured.
 */
export function getAppOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    FALLBACK_APP_URL;

  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    return url.origin;
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Geçerli bir NEXT_PUBLIC_APP_URL veya AUTH_URL yapılandırılmalıdır.");
    }
    return FALLBACK_APP_URL;
  }
}
