import crypto from "crypto";
import { getSettings } from "@/lib/settings";
import { gatewayFetchJson, GatewayHttpError } from "@/lib/gateway-fetch";

export type PolarConfig = {
  apiKey: string;
  productId: string;
  webhookSecret: string;
  enabled: boolean;
};

export async function getPolarConfig(): Promise<PolarConfig> {
  const settings = await getSettings([
    "polar_enabled",
    "polar_api_key",
    "polar_product_id",
    "polar_webhook_secret",
  ]);

  return {
    apiKey: (settings.polar_api_key || "").trim(),
    productId: (settings.polar_product_id || "f0c65608-b7a7-4a74-91e6-921b8ba1caa7").trim(),
    webhookSecret: (settings.polar_webhook_secret || "").trim(),
    enabled: settings.polar_enabled === "1",
  };
}

export function verifyPolarWebhook(
  payload: string,
  headers: Record<string, string>,
  secret: string
): boolean {
  const webhookId = headers["webhook-id"] || headers["Webhook-Id"];
  const webhookTimestamp = headers["webhook-timestamp"] || headers["Webhook-Timestamp"];
  const webhookSignature = headers["webhook-signature"] || headers["Webhook-Signature"];

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return false;
  }

  // Standard Webhooks tekrar saldırılarına karşı yalnızca yakın tarihli imzaları kabul et.
  const timestampSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 5 * 60) return false;

  const msg = `${webhookId}.${webhookTimestamp}.${payload}`;
  const cleanSecret = secret.replace(/^whsec_/, "");
  const secretBytes = Buffer.from(cleanSecret, "base64");
  
  const hmac = crypto.createHmac("sha256", secretBytes);
  hmac.update(msg);
  const expectedSignature = hmac.digest("base64");

  const signatures = webhookSignature.split(" ");
  for (const sig of signatures) {
    const parts = sig.split(",");
    if (parts.length === 2) {
      const [version, value] = parts;
      if (version === "v1") {
        const expected = Buffer.from(expectedSignature, "utf8");
        const received = Buffer.from(value, "utf8");
        if (expected.length === received.length && crypto.timingSafeEqual(expected, received)) {
          return true;
        }
      }
    }
  }

  return false;
}

export async function createPolarCheckout(
  params: {
    amountInCents: number;
    currency: string;
    successUrl: string;
    paymentId: string;
  },
  config: PolarConfig
): Promise<{ id: string; url: string }> {
  const payload = {
    products: [config.productId],
    success_url: params.successUrl,
    prices: {
      [config.productId]: [
        {
          amount_type: "fixed",
          price_amount: params.amountInCents,
          price_currency: params.currency.toLowerCase(),
        }
      ]
    },
    metadata: {
      paymentId: params.paymentId,
    }
  };

  // HTTP hatalarında gatewayFetchJson GatewayHttpError fırlatır; dönen gövdedeki
  // açıklama (detail/message) varsa kullanıcıya o gösterilsin.
  try {
    const { json: data } = await gatewayFetchJson<{ id?: string; url?: string }>(
      "https://api.polar.sh/v1/checkouts/",
      {
        label: "Polar",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (!data.id || !data.url) {
      throw new Error("Polar.sh checkout yanıtı beklenen formatta değil.");
    }
    return { id: data.id, url: data.url };
  } catch (error) {
    if (error instanceof GatewayHttpError) {
      try {
        const body = JSON.parse(error.bodyPreview) as { detail?: string; message?: string };
        const detail = body.detail || body.message;
        if (detail) throw new Error(detail);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== error.message) throw parseError;
      }
    }
    throw error;
  }
}
