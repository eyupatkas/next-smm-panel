/**
 * PayTR iFrame Entegrasyon Yardımcı Modülü
 * Referans: https://dev.paytr.com/iframe-api
 */

import crypto from "crypto";
import { getSettings } from "@/lib/settings";
import { gatewayFetchJson } from "@/lib/gateway-fetch";

export interface PayTRConfig {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
}

/**
 * Tutarı PayTR'nin kuruş cinsinden tamsayı değerine çevirir.
 * Token oluşturma ve callback doğrulaması AYNI fonksiyonu kullanmalı;
 * aksi hâlde 31.395 gibi küsuratlı tutarlarda "31.39 tahsil edilip 31.40
 * beklenir" biçiminde yanlış AMOUNT_MISMATCH oluşur.
 */
export function paytrMinorAmount(amount: number): number {
  return Math.max(1, Math.round(Number(amount.toFixed(2)) * 100));
}

export async function getPayTRConfig(): Promise<PayTRConfig> {
  const s = await getSettings([
    "paytr_merchant_id",
    "paytr_merchant_key",
    "paytr_merchant_salt",
  ]);
  return {
    merchantId: s.paytr_merchant_id,
    merchantKey: s.paytr_merchant_key,
    merchantSalt: s.paytr_merchant_salt,
  };
}

export interface PayTRIframeParams {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  userIp: string;
  merchantOid: string; // Sipariş ID (max 64 karakter)
  email: string;
  paymentAmount: number; // Kuruş cinsinden (100 = 1 TL)
  basketItems: Array<{ name: string; price: string; count: number }>;
  userName: string;
  userAddress: string;
  userPhone: string;
  merchantOkUrl: string;
  merchantFailUrl: string;
  currency?: string; // "TL" (default)
  testMode?: "0" | "1";
  noInstallment?: "0" | "1";
  maxInstallment?: string;
  lang?: string; // "tr" (default)
}

export async function createPayTRToken(params: PayTRIframeParams): Promise<string> {
  const {
    merchantId,
    merchantKey,
    merchantSalt,
    userIp,
    merchantOid,
    email,
    paymentAmount,
    basketItems,
    userName,
    userAddress,
    userPhone,
    merchantOkUrl,
    merchantFailUrl,
    currency = "TL",
    testMode = "0",
    noInstallment = "1",
    maxInstallment = "0",
    lang = "tr",
  } = params;

  const basketJson = JSON.stringify(
    basketItems.map((item) => [item.name, item.price, item.count])
  );
  // PayTR hash hesaplamasında user_basket BASE64 encode edilmiş hali kullanılır
  const basketBase64 = Buffer.from(basketJson).toString("base64");

  const hashStr =
    merchantId +
    userIp +
    merchantOid +
    email +
    paymentAmount +
    basketBase64 +      // raw JSON DEĞİL, base64
    noInstallment +
    maxInstallment +
    currency +
    testMode;

  // PayTR dökümana göre: HMAC-SHA256(data = hashStr + merchantSalt, key = merchantKey)
  const payTRToken = crypto
    .createHmac("sha256", merchantKey)
    .update(hashStr + merchantSalt, "utf8")
    .digest("base64");

  const formParams = new URLSearchParams({
    merchant_id: merchantId,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email,
    payment_amount: String(paymentAmount),
    paytr_token: payTRToken,
    user_basket: basketBase64,
    debug_on: "0",
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: userName,
    user_address: userAddress,
    user_phone: userPhone,
    merchant_ok_url: merchantOkUrl,
    merchant_fail_url: merchantFailUrl,
    currency,
    test_mode: testMode,
    lang,
    client_lang: lang,
  });

  // PayTR önünde Cloudflare var; 522/5xx ve yarım yanıt durumlarında
  // gatewayFetchJson kısa bekleyip yeniden dener.
  // Boş 200 gövdesi: PayTR isteği parametre aşamasından geçip imza/IP/mağaza
  // kontrolünde sessizce düşürmüş demektir (tipik olarak paneldeki API IP
  // kısıtlamasının eski sunucu IP'sini işaret etmesi).
  const { json: result } = await gatewayFetchJson<{ status: string; token?: string; reason?: string }>(
    "https://www.paytr.com/odeme/api/get-token",
    {
      label: "PayTR",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formParams.toString(),
      emptyBodyError:
        "PayTR ödeme sağlayıcısı boş yanıt döndürdü. PayTR panelinde mağaza onay durumu ve API IP kısıtlaması (beyaz liste) ayarlarını kontrol edin; kısıtlama açıksa sunucunun güncel çıkış IP'si beyaz listede olmalı.",
    }
  );

  if (result.status !== "success" || !result.token) {
    throw new Error(`PayTR token hatası: ${result.reason ?? "Bilinmeyen hata"}`);
  }

  return result.token;
}

/**
 * PayTR callback hash doğrulaması
 */
export function verifyPayTRCallback(
  params: {
    merchant_oid: string;
    status: string;
    total_amount: string;
    hash: string;
  },
  config: PayTRConfig
): boolean {
  const { merchant_oid, status, total_amount, hash } = params;

  // PayTR dökümana göre: HMAC-SHA256(data = merchant_oid + merchantSalt + status + total_amount, key = merchantKey)
  const expectedHash = crypto
    .createHmac("sha256", config.merchantKey)
    .update(merchant_oid + config.merchantSalt + status + total_amount, "utf8")
    .digest("base64");

  const expected = Buffer.from(expectedHash, "utf8");
  const received = Buffer.from(hash, "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
