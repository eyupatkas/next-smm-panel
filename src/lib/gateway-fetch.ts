/**
 * Ödeme sağlayıcılarına yapılan giden HTTP istekleri için dayanıklı fetch katmanı.
 *
 * Sağlayıcı tarafında yaşanan GEÇİCİ sorunlar (Cloudflare 52x, 5xx, 429,
 * ağ kesintisi, yarım/boş yanıt gövdesi) checkout'un anında 500 ile ölmesine
 * neden olmasın: istek kısa üstel beklemeyle yeniden denenir ve her istek
 * zaman aşımına bağlıdır; sonsuz "Hazırlanıyor..." durumu oluşmaz.
 */

const RETRYABLE_STATUS = new Set([
  408, 429, 500, 502, 503, 504,
  // Cloudflare
  520, 521, 522, 523, 524, 525, 526, 527, 530,
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sağlayıcı HTTP düzeyinde hata döndürdü (4xx/5xx). */
export class GatewayHttpError extends Error {
  readonly status: number;
  readonly bodyPreview: string;

  constructor(label: string, status: number, bodyText: string) {
    const friendly =
      status >= 500 || status === 429
        ? `${label} ödeme sağlayıcısı şu anda yoğun/yanıt vermiyor (HTTP ${status}). Lütfen kısa süre sonra tekrar deneyin.`
        : `${label} ödeme sağlayıcısı isteği reddetti (HTTP ${status}).`;
    super(friendly);
    this.name = "GatewayHttpError";
    this.status = status;
    this.bodyPreview = bodyText.slice(0, 300);
  }
}

/** İş kuralı kaynaklı red — yeniden denemek anlamsız (ör. kart reddi, geçersiz anahtar). */
export class GatewayPermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayPermanentError";
  }
}

export interface GatewayFetchOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  /** Deneme başına zaman aşımı (ms). Varsayılan 15 sn. */
  timeoutMs?: number;
  /** Toplam deneme sayısı. Varsayılan 3. */
  maxAttempts?: number;
  /** Hata mesajlarında görünecek sağlayıcı adı, örn. "PayTR". */
  label: string;
  /** 200 dönüp gövde boş/yarım geldiğinde (sağlayıcı sessiz reddi) kullanılacak hata mesajı. */
  emptyBodyError?: string;
}

/**
 * JSON bekleyen ödeme sağlayıcı çağrıları için: timeout + retry + güvenli parse.
 * 200 dönüp gövde boş/yarım geldiyse de yeniden dener; son denemede açıklayıcı
 * hata fırlatır.
 */
export async function gatewayFetchJson<T = Record<string, unknown>>(
  url: string,
  options: GatewayFetchOptions
): Promise<{ status: number; json: T }> {
  const { timeoutMs = 15_000, maxAttempts = 3, label } = options;
  let lastError: unknown = new Error(`${label}: istek başarısız`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method ?? "POST",
        headers: options.headers,
        body: options.body,
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });

      const text = await response.text();

      if (!response.ok) {
        throw new GatewayHttpError(label, response.status, text);
      }

      try {
        return { status: response.status, json: JSON.parse(text) as T };
      } catch {
        // 200 döndü ama gövde boş/yarım — geçici sorun, tekrar dene.
        throw new Error(
          options.emptyBodyError ?? `${label}: yanıt gövdesi eksik veya bozuk geldi.`
        );
      }
    } catch (error) {
      lastError = error;
      if (error instanceof GatewayPermanentError) throw error;
      if (error instanceof GatewayHttpError) {
        // 4xx kalıcıdır (429 hariç), yeniden denemenin anlamı yok.
        if (!RETRYABLE_STATUS.has(error.status) || attempt === maxAttempts) throw error;
      } else if (attempt === maxAttempts) {
        // Ağ kesintisi / yarım yanıt / timeout — deneme hakkı bittiyse yukarı fırlat.
        throw lastError;
      }
    }

    await sleep(400 * 2 ** (attempt - 1)); // 400ms → 800ms
  }

  throw lastError;
}

/**
 * Callback tabanlı SDK çağrıları (ör. iyzipay) için retry sarmalayıcı.
 * GatewayPermanentError ile fırlatılan hatalar (kart reddi vb.) tekrar denenmez.
 */
export async function withGatewayRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error instanceof GatewayPermanentError || attempt === maxAttempts) throw error;
    }

    await sleep(400 * 2 ** (attempt - 1));
  }

  throw lastError;
}
