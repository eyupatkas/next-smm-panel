import { randomInt } from "crypto";
import { db } from "@/lib/db";

/**
 * Merkezi AI Gateway.
 * Tüm yapay zeka çağrıları bu katmandan geçer:
 *  - 429/5xx (örn. Gemini 503 "high demand") hatalarında exponential backoff ile retry
 *  - API anahtarı rotasyonu (round-robin; 429'da sıradaki anahtara geçer)
 *  - Model fallback zinciri (bir model aşırı yükteyse sıradaki güncel model denenir)
 *  - Sağlayıcı fallback'i (Gemini tamamen düşünse DeepSeek üzerinden devam eder)
 */

export type GatewayMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
};

export type GatewayUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type GatewayResult = {
  ok: boolean;
  content?: string;
  tool_calls?: any[];
  message?: any;
  usage?: GatewayUsage;
  provider?: string;
  model?: string;
  error?: string;
  attempts: string[];
};

type ProviderConfig = {
  slug: string;
  name: string;
  model: string;
  endpoint: string;
  apiKeys: string[];
  fallbackModels: string[];
};

// ── Güncel model tanımları (Eylül 2026) ────────────────────────────────────
// Gemini: 2.0/2.5 ailesi ve 1.5 kullanımdan kalktı; stabil serinin en yeni üyesi 3.8 Flash.
// DeepSeek: eski "deepseek-chat"/"deepseek-reasoner" adları 2026-07-24'te emekli edildi.
export const GEMINI_DEFAULT_MODEL = "gemini-3.8-flash";
export const DEEPSEEK_DEFAULT_MODEL = "deepseek-flash";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

// Bir model aşırı yüklenirse sırasıyla denenecek yedekler (hepsi güncel ve stabil).
const GEMINI_FALLBACK_MODELS = [GEMINI_DEFAULT_MODEL, "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
const DEEPSEEK_FALLBACK_MODELS = [DEEPSEEK_DEFAULT_MODEL, "deepseek-v4-pro"];

// Bu HTTP durumları geçicidir: aynı modelde yeniden denemeye değer.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// API'den tamamen kapanan modeller: DB'de eski kayıt kalmışsa hiç denenmeden atlanır.
const RETIRED_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "deepseek-chat",
  "deepseek-reasoner",
  "deepseek-v4-flash",
]);

const REQUEST_TIMEOUT_MS = 45_000;
const ATTEMPT_BACKOFF_BASE_MS = 700;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attemptIndex: number) {
  return ATTEMPT_BACKOFF_BASE_MS * Math.pow(2, attemptIndex) + randomInt(250);
}

function defaultModelForSlug(slug: string) {
  return slug === "deepseek" ? DEEPSEEK_DEFAULT_MODEL : GEMINI_DEFAULT_MODEL;
}

function fallbackModelsForSlug(slug: string) {
  return slug === "deepseek" ? DEEPSEEK_FALLBACK_MODELS : GEMINI_FALLBACK_MODELS;
}

function endpointForSlug(slug: string) {
  return slug === "deepseek" ? DEEPSEEK_ENDPOINT : GEMINI_ENDPOINT;
}

/**
 * Aktif sağlayıcıları öncelik sırasıyla döndürür:
 * 1) Varsayılan olarak işaretli aktif DB sağlayıcısı
 * 2) Diğer aktif DB sağlayıcıları
 * 3) Ortam değişkeni anahtarları (DB'de hiç anahtar yoksa)
 */
export async function getProviderChain(extraKeysBySlug?: Record<string, string[]>): Promise<ProviderConfig[]> {
  const chain: ProviderConfig[] = [];

  try {
    const providers = await db.aiProvider.findMany({ where: { enabled: true } });
    providers.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

    for (const p of providers) {
      const keys = ((p.apiKeys as string[]) || []).filter(Boolean);
      if (keys.length === 0) continue;
      const slug = p.slug === "deepseek" ? "deepseek" : "gemini";
      chain.push({
        slug,
        name: p.name,
        model: p.model || defaultModelForSlug(slug),
        endpoint: endpointForSlug(slug),
        apiKeys: keys,
        fallbackModels: fallbackModelsForSlug(slug),
      });
    }
  } catch (err) {
    console.warn("[AI Gateway] Veritabanından sağlayıcılar okunamadı:", err);
  }

  // Ortam değişkeni yedekleri (yalnızca o slug için zaten anahtar yoksa ekle)
  const envKeys: Record<string, string[]> = {
    gemini: process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [],
    deepseek: process.env.DEEPSEEK_API_KEY ? [process.env.DEEPSEEK_API_KEY] : [],
  };
  for (const [slug, extra] of Object.entries(extraKeysBySlug || {})) {
    envKeys[slug] = [...(envKeys[slug] || []), ...extra.filter(Boolean)];
  }

  for (const slug of ["gemini", "deepseek"]) {
    const keys = envKeys[slug].filter(Boolean);
    if (keys.length === 0) continue;
    if (chain.some((c) => c.slug === slug)) continue;
    chain.push({
      slug,
      name: slug === "deepseek" ? "DeepSeek" : "Gemini",
      model: defaultModelForSlug(slug),
      endpoint: endpointForSlug(slug),
      apiKeys: keys,
      fallbackModels: fallbackModelsForSlug(slug),
    });
  }

  return chain;
}

type GatewayCallOptions = {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: GatewayMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  /** Model başına en fazla deneme sayısı (geçici hatalar için). Varsayılan 2. */
  triesPerModel?: number;
  /** Toplam ağ çağrısı üst sınırı. Varsayılan 8. */
  maxNetworkCalls?: number;
  /** Bu slug'lar için ek yedek anahtarlar (örn. eski blog_ai_api_key ayarı). */
  extraKeysBySlug?: Record<string, string[]>;
};

/**
 * Tüm aktif sağlayıcı/modeller üzerinde retry + fallback ile sohbet tamamlama çağrısı.
 */
export async function callAiGateway(options: GatewayCallOptions): Promise<GatewayResult> {
  const attempts: string[] = [];
  const providers = await getProviderChain(options.extraKeysBySlug);

  if (providers.length === 0) {
    return { ok: false, error: "Aktif yapay zeka sağlayıcısı veya API anahtarı bulunamadı.", attempts };
  }

  const apiMessages: GatewayMessage[] = options.messages ? [...options.messages] : [];
  if (!options.messages && options.systemPrompt && options.userPrompt) {
    apiMessages.push({ role: "system", content: options.systemPrompt });
    apiMessages.push({ role: "user", content: options.userPrompt });
  }

  if (apiMessages.length === 0) {
    return { ok: false, error: "Gönderilecek mesaj yok.", attempts };
  }

  const triesPerModel = options.triesPerModel ?? 2;
  const maxNetworkCalls = options.maxNetworkCalls ?? 8;
  let networkCalls = 0;
  let lastError = "Bilinmeyen hata";

  for (const provider of providers) {
    // Yapılandırılan model (emekli değilse) + sağlayıcının güncel yedek modelleri (tekrarsız)
    const models = [provider.model, ...provider.fallbackModels].filter(
      (m, i, arr) => Boolean(m) && !RETIRED_MODELS.has(m) && arr.indexOf(m) === i
    );
    if (models.length === 0) {
      attempts.push(`${provider.name}: yalnızca kullanımdan kalkmış model kaydı var, atlanıyor.`);
      continue;
    }

    for (const model of models) {
      let keyOffset = randomInt(provider.apiKeys.length);

      for (let attempt = 0; attempt < triesPerModel; attempt++) {
        if (networkCalls >= maxNetworkCalls) {
          attempts.push(`Ağ çağrısı sınırına ulaşıldı (${maxNetworkCalls}), durduruluyor.`);
          return { ok: false, error: lastError, attempts };
        }
        networkCalls++;

        const apiKey = provider.apiKeys[keyOffset % provider.apiKeys.length];
        const body: Record<string, any> = {
          model,
          messages: apiMessages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 2000,
        };
        if (options.jsonMode) body.response_format = { type: "json_object" };
        if (options.tools && options.tools.length > 0) body.tools = options.tools;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const res = await fetch(provider.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            const data = (await res.json()) as any;
            const assistantMessage = data?.choices?.[0]?.message;
            const content = assistantMessage?.content;
            const toolCalls = assistantMessage?.tool_calls;

            if (!content && !toolCalls) {
              lastError = `${provider.name}/${model} boş yanıt döndürdü.`;
              attempts.push(`✗ ${provider.name}/${model}: ${lastError}`);
              break; // sonraki modele geç
            }

            if (data?.usage) {
              console.log(
                `[AI Gateway] ${provider.name}/${model} — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}`
              );
            }

            attempts.push(`✓ ${provider.name}/${model} başarılı (${networkCalls}. ağ çağrısı).`);
            return {
              ok: true,
              content: content ?? undefined,
              tool_calls: toolCalls,
              message: assistantMessage,
              usage: data?.usage,
              provider: provider.name,
              model,
              attempts,
            };
          }

          const errText = await res.text().catch(() => "");
          const shortErr = errText.slice(0, 180);

          if (res.status === 429) {
            // Kota/hız sınırı: sıradaki anahtara geç ve yeniden dene
            keyOffset++;
            lastError = `${provider.name}/${model} hız sınırı (429).`;
            attempts.push(`✗ ${provider.name}/${model}: 429, anahtar rotasyonu ile tekrar denenecek.`);
          } else if (RETRYABLE_STATUS.has(res.status)) {
            lastError = `${provider.name}/${model} geçici hata (HTTP ${res.status}).`;
            attempts.push(`✗ ${provider.name}/${model}: HTTP ${res.status} — ${shortErr}`);
          } else if (res.status === 401 || res.status === 403) {
            keyOffset++;
            lastError = `${provider.name}/${model} yetkilendirme hatası (HTTP ${res.status}).`;
            attempts.push(`✗ ${provider.name}/${model}: HTTP ${res.status} — anahtar reddedildi, sıradaki anahtar denenecek.`);
          } else {
            // 400 vb. kalıcı hatalar: bu modeli bir daha denemeden atla
            lastError = `${provider.name}/${model} kalıcı hata (HTTP ${res.status}).`;
            attempts.push(`✗ ${provider.name}/${model}: HTTP ${res.status} — ${shortErr}, model atlanıyor.`);
            break;
          }
        } catch (err: any) {
          clearTimeout(timeout);
          const isAbort = err?.name === "AbortError";
          lastError = `${provider.name}/${model} ${isAbort ? "zaman aşımı" : "bağlantı hatası"}: ${
            err instanceof Error ? err.message : String(err)
          }`;
          attempts.push(`✗ ${lastError}`);
        }

        if (attempt < triesPerModel - 1) {
          await sleep(backoffMs(attempt));
        }
      }
    }
  }

  return { ok: false, error: lastError, attempts };
}
