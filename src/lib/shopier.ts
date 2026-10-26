import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shopier OAuth + Webhook yardımcıları.
 * Gizli anahtarlar YALNIZCA ortam değişkenlerinden okunur (kaynak koda gömülmez):
 *   SHOPIER_CLIENT_ID, SHOPIER_CLIENT_SECRET, SHOPIER_WEBHOOK_TOKEN
 * Dokümantasyon: developer.shopier.com (OAuth 2.0 — Authorization Code grant)
 */

const AUTHORIZE_URL = "https://shopier.com/m/login.php";
const TOKEN_URL = "https://api.shopier.com:8443/v1/oauth2/token";

export const SHOPIER_CALLBACK_PATH = "/api/payment/shopier/oauth/callback";

export type ShopierOAuthConfig = {
  clientId: string;
  clientSecret: string;
  configured: boolean;
};

export function getShopierOAuthConfig(): ShopierOAuthConfig {
  const clientId = process.env.SHOPIER_CLIENT_ID ?? "";
  const clientSecret = process.env.SHOPIER_CLIENT_SECRET ?? "";
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

export function getShopierWebhookToken(): string {
  return process.env.SHOPIER_WEBHOOK_TOKEN ?? "";
}

/**
 * Sunucu isteği atılacak adresleri doğrulanır: yalnızca https ve
 * localhost/loopback/özel/rezerve adresler reddedilir.
 */
export function assertPublicHttpsUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Shopier: geçersiz URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Shopier: yalnızca https adreslere istek atılabilir");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isPrivateV4 =
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  const isPrivateV6 =
    host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || isPrivateV4 || isPrivateV6) {
    throw new Error("Shopier: özel/loopback adreslere istek atılamaz");
  }
  return url;
}

export function buildShopierAuthorizeUrl(options: {
  redirectUri: string;
  state: string;
}): string {
  assertPublicHttpsUrl(options.redirectUri);
  const { clientId } = getShopierOAuthConfig();
  if (!clientId) throw new Error("Shopier: SHOPIER_CLIENT_ID yapılandırılmamış");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: options.redirectUri,
    state: options.state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type ShopierTokenResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
};

function parseTokenResponse(text: string): Record<string, string> {
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v ?? "")]));
  } catch {
    return Object.fromEntries(new URLSearchParams(text).entries());
  }
}

/** Authorization code → access token değişimi (refresh da aynı endpoint). */
export async function exchangeShopierAuthorizationCode(options: {
  code: string;
  redirectUri: string;
}): Promise<ShopierTokenResult> {
  const { clientId, clientSecret } = getShopierOAuthConfig();
  if (!clientId || !clientSecret) throw new Error("Shopier: OAuth yapılandırılmamış");
  assertPublicHttpsUrl(options.redirectUri);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
    cache: "no-store",
  });
  const text = await res.text();
  const parsed = parseTokenResponse(text);
  if (!res.ok || !parsed.access_token) {
    throw new Error(`Shopier token hatası (${res.status}): ${text.slice(0, 300)}`);
  }
  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token || undefined,
    expiresIn: parsed.expires_in ? Number(parsed.expires_in) : undefined,
    scope: parsed.scope || undefined,
  };
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type WebhookVerification =
  | { ok: true; method: string }
  | { ok: false; reason: string };

/**
 * Shopier webhook doğrulaması. Bildirim imzası header (x-shopier-signature vb.)
 * veya gövde içinde (token/hash alanları) gelebildiği için her iki yol da
 * desteklenir; doğrulama webhook token'ı ile HMAC-SHA256 üzerinden yapılır.
 */
export function verifyShopierWebhook(rawBody: string, headers: Headers): WebhookVerification {
  const token = getShopierWebhookToken();
  if (!token) return { ok: false, reason: "webhook_token_yok" };

  const expected = createHmac("sha256", token).update(rawBody, "utf8").digest("hex");

  const signatureHeaders = [
    "x-shopier-signature",
    "x-shopier-signature-sha256",
    "x-signature",
    "signature",
  ];
  for (const header of signatureHeaders) {
    const value = headers.get(header);
    if (!value) continue;
    const normalized = value.replace(/^sha256=/i, "").trim().toLowerCase();
    if (safeEqualHex(normalized, expected)) {
      return { ok: true, method: `header:${header}` };
    }
    // Bazı sağlayıcılar imza yerine doğrudan token'ı header'da iletir.
    if (safeEqualHex(normalized, token.toLowerCase())) {
      return { ok: true, method: `header-token:${header}` };
    }
    return { ok: false, reason: `imza_eslesmedi:${header}` };
  }

  try {
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    for (const field of ["token", "webhook_token", "hash", "signature"]) {
      const value = body[field];
      if (typeof value !== "string" || !value) continue;
      const normalized = value.replace(/^sha256=/i, "").trim().toLowerCase();
      if (safeEqualHex(normalized, expected) || safeEqualHex(normalized, token.toLowerCase())) {
        return { ok: true, method: `body:${field}` };
      }
    }
  } catch {
    // JSON olmayan gövde — imza header'ı da yoksa reddedilir.
  }

  return { ok: false, reason: "imza_bulunamadi" };
}
