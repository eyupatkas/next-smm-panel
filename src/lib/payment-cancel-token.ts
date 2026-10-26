import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 30 * 60;

function secret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET ödeme iptal yetkilendirmesi için zorunludur.");
  }
  return value;
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createPaymentCancelToken(paymentId: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${paymentId}.${expiresAt}`;
  return `${expiresAt}.${signature(payload)}`;
}

export function verifyPaymentCancelToken(
  paymentId: string,
  token: string,
  now = Date.now(),
): boolean {
  const [expiresRaw, suppliedSignature, ...extra] = token.split(".");
  if (!expiresRaw || !suppliedSignature || extra.length > 0) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(now / 1000)) return false;
  if (expiresAt > Math.floor(now / 1000) + TOKEN_TTL_SECONDS + 60) return false;

  const expected = signature(`${paymentId}.${expiresAt}`);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
