import crypto from "crypto";
import { getSettings } from "@/lib/settings";
import { CRYPTOMUS_MINIMUM_TL } from "@/lib/payment-minimums";
import { gatewayFetchJson, GatewayPermanentError } from "@/lib/gateway-fetch";

export { CRYPTOMUS_MINIMUM_TL };

export type CryptomusConfig = {
  merchantId: string;
  apiKey: string; // Payment API Key (API istek imzası + webhook doğrulama)
  enabled: boolean;
};

export async function getCryptomusConfig(): Promise<CryptomusConfig> {
  const settings = await getSettings([
    "cryptomus_enabled",
    "cryptomus_merchant_id",
    "cryptomus_api_key",
  ]);

  return {
    merchantId: (settings.cryptomus_merchant_id || "").trim(),
    apiKey: (settings.cryptomus_api_key || "").trim(),
    enabled: settings.cryptomus_enabled === "1",
  };
}

export function generateCryptomusSignature(data: Record<string, unknown>, apiKey: string): string {
  const cleanData: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (data[key] !== undefined) {
      cleanData[key] = data[key];
    }
  }
  const jsonData = JSON.stringify(cleanData);
  const b64Data = Buffer.from(jsonData).toString("base64");
  return crypto.createHash("md5").update(b64Data + apiKey.trim()).digest("hex");
}

export function verifyCryptomusSignature(
  data: Record<string, unknown>,
  receivedSignature: string,
  apiKey: string,
): boolean {
  const expected = Buffer.from(generateCryptomusSignature(data, apiKey), "utf8");
  const received = Buffer.from(receivedSignature.trim().toLowerCase(), "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function createCryptomusInvoice(
  params: {
    amount: string;
    currency: string;
    orderId: string;
    urlCallback: string;
    urlReturn: string;
    toCurrency?: string;
    network?: string;
  },
  config: CryptomusConfig
): Promise<{ url: string; uuid: string }> {
  const payload = {
    amount: params.amount,
    currency: params.currency,
    order_id: params.orderId,
    url_callback: params.urlCallback,
    url_return: params.urlReturn,
    ...(params.toCurrency ? { to_currency: params.toCurrency } : {}),
    ...(params.network ? { network: params.network } : {}),
  };

  const sign = generateCryptomusSignature(payload, config.apiKey);

  const { json: data } = await gatewayFetchJson<{ state: number; message?: string; result?: {
    url: string;
    uuid: string;
  } }>("https://api.cryptomus.com/v1/payment", {
    label: "Cryptomus",
    headers: {
      "Content-Type": "application/json",
      merchant: config.merchantId,
      sign: sign,
    },
    body: JSON.stringify(payload),
  });

  if (data.state !== 0) {
    // Aynı sipariş için açık fatura varsa yeniden denemek sonucu değiştirmez.
    if (/already exists/i.test(data.message ?? "")) {
      throw new GatewayPermanentError(data.message || "Cryptomus fatura oluşturma hatası");
    }
    throw new Error(data.message || "Cryptomus fatura oluşturma hatası");
  }

  if (!data.result?.url) {
    throw new Error("Cryptomus fatura yanıtı beklenen formatta değil.");
  }

  return data.result; // url ve uuid barındırır
}
