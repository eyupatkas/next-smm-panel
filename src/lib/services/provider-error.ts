export type ProviderFailureCategory =
  | "CUSTOMER_INPUT"
  | "PROVIDER_BALANCE"
  | "PROVIDER_CONFIG"
  | "TRANSIENT"
  | "AMBIGUOUS"
  | "UNKNOWN";

export type ProviderFailureResolution =
  | "CANCEL_AND_REFUND"
  | "RETRY_LATER"
  | "MANUAL_REVIEW";

export type ProviderFailureInfo = {
  category: ProviderFailureCategory;
  resolution: ProviderFailureResolution;
  code: string;
  title: string;
  message: string;
  action: string;
  retryable: boolean;
  suggestedLinkFormat?: "USERNAME";
};

function extractProviderMessage(error?: string | null, raw?: string | null) {
  const values = [error, raw].filter((value): value is string => Boolean(value?.trim()));

  for (const value of values) {
    try {
      const parsed = JSON.parse(value) as { error?: unknown; message?: unknown } | null;
      if (typeof parsed?.error === "string") return parsed.error.trim();
      if (typeof parsed?.message === "string") return parsed.message.trim();
    } catch {
      // Provider responses are frequently plain text rather than JSON.
    }
  }

  return values[0]?.trim() || "Bilinmeyen sağlayıcı hatası";
}

function normalized(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

function technicalCode(message: string) {
  const namedCode = message.match(/(?:neworder|order|service|api)\.error\.[a-z0-9_.-]+/i)?.[0];
  if (namedCode) return namedCode.toLocaleLowerCase("tr");

  const httpCode = message.match(/http\s+\d{3}/i)?.[0];
  if (httpCode) return httpCode.toUpperCase().replace(/\s+/, "_");

  return normalized(message)
    .replace(/https?:\/\/\S+/g, "url")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "unknown";
}

function hasAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

export function classifyProviderFailure(error?: string | null, raw?: string | null): ProviderFailureInfo {
  const message = extractProviderMessage(error, raw);
  const text = normalized(message);
  const code = technicalCode(message);

  if (hasAny(text, ["link_duplicate", "duplicate link", "same link", "ayni link", "active order for this link"])) {
    return {
      category: "CUSTOMER_INPUT",
      resolution: "CANCEL_AND_REFUND",
      code,
      title: "Aynı bağlantı için aktif sipariş var",
      message: "Sağlayıcı bu bağlantıda devam eden başka bir sipariş bulunduğu için yeni siparişi kabul etmedi.",
      action: "Sipariş otomatik iptal edilir ve tahsil edilen tutar bakiyeye iade edilir.",
      retryable: false,
    };
  }

  if (hasAny(text, ["neworder.error.username", "missing username", "incorrect username", "invalid username", "kullanici adi"])) {
    return {
      category: "CUSTOMER_INPUT",
      resolution: "CANCEL_AND_REFUND",
      code,
      title: "Kullanıcı adı biçimi geçersiz",
      message: "Bu servis tam profil bağlantısı yerine yalnızca kullanıcı adı bekliyor.",
      action: "Sipariş otomatik iptal edilir, ücret iade edilir ve servis kullanıcı adı biçimine geçirilir.",
      retryable: false,
      suggestedLinkFormat: "USERNAME",
    };
  }

  if (hasAny(text, ["min_quantity", "minimum quantity", "quantity is less", "below minimum", "minimum order"])) {
    return {
      category: "CUSTOMER_INPUT",
      resolution: "CANCEL_AND_REFUND",
      code,
      title: "Miktar sağlayıcı alt sınırının altında",
      message: "Servisin sağlayıcıdaki minimum miktarı değişmiş veya girilen miktar kabul edilmiyor.",
      action: "Sipariş otomatik iptal edilir ve ücret bakiyeye iade edilir. Servis limitleri güncellenmelidir.",
      retryable: false,
    };
  }

  if (hasAny(text, ["max_quantity", "maximum quantity", "quantity is more", "above maximum", "maximum order"])) {
    return {
      category: "CUSTOMER_INPUT",
      resolution: "CANCEL_AND_REFUND",
      code,
      title: "Miktar sağlayıcı üst sınırını aşıyor",
      message: "Servisin sağlayıcıdaki maksimum miktarı değişmiş veya girilen miktar kabul edilmiyor.",
      action: "Sipariş otomatik iptal edilir ve ücret bakiyeye iade edilir. Servis limitleri güncellenmelidir.",
      retryable: false,
    };
  }

  if (hasAny(text, [
    "invalid link", "incorrect link", "link is invalid", "wrong link", "bad link",
    "link not found", "page not found", "media not found", "account is private", "private account",
  ])) {
    return {
      category: "CUSTOMER_INPUT",
      resolution: "CANCEL_AND_REFUND",
      code,
      title: "Bağlantı sağlayıcı tarafından kabul edilmedi",
      message: "Bağlantı hatalı, erişilemiyor veya hedef hesap/gönderi gizli olabilir.",
      action: "Sipariş otomatik iptal edilir ve ücret bakiyeye iade edilir.",
      retryable: false,
    };
  }

  if (hasAny(text, [
    "not_enough_funds", "not enough funds", "insufficient balance", "enough balance",
    "provider balance", "yetersiz bakiye", "bakiye yetersiz",
  ])) {
    return {
      category: "PROVIDER_BALANCE",
      resolution: "RETRY_LATER",
      code,
      title: "Sağlayıcı bakiyesi yetersiz",
      message: "Sipariş müşteriden kaynaklanmayan bir sağlayıcı bakiye sorunu nedeniyle iletilemedi.",
      action: "Alternatif sağlayıcı kurtarma akışı çalıştırılmalı veya sağlayıcı bakiyesi tamamlanmalıdır.",
      retryable: true,
    };
  }

  if (hasAny(text, [
    "invalid api key", "incorrect api key", "api key", "unauthorized", "forbidden",
    "service not found", "invalid service", "service disabled", "service is inactive",
  ])) {
    return {
      category: "PROVIDER_CONFIG",
      resolution: "RETRY_LATER",
      code,
      title: "Sağlayıcı yapılandırması kontrol edilmeli",
      message: "API anahtarı veya servis eşlemesi sağlayıcı tarafından kabul edilmedi.",
      action: "Sağlayıcı ayarları düzeltildikten sonra sipariş yeniden denenebilir.",
      retryable: true,
    };
  }

  if (hasAny(text, [
    "fetch failed", "network error", "socket hang up", "econnreset", "econnrefused",
    "etimedout", "timeout", "timed out", "aborterror", "zaman asimi", "json cevabi cozumlenemedi",
    "unexpected end of json", "invalid json",
  ])) {
    return {
      category: "AMBIGUOUS",
      resolution: "MANUAL_REVIEW",
      code,
      title: "Sağlayıcı yanıtı doğrulanamadı",
      message: "İsteğin sağlayıcıya ulaşıp ulaşmadığı kesin değil. Otomatik tekrar çift sipariş oluşturabilir.",
      action: "Sağlayıcı paneli kontrol edilmeli; ardından servis değiştirme veya yetkili manuel yeniden deneme yapılmalıdır.",
      retryable: false,
    };
  }

  if (hasAny(text, ["http 429", "too many requests", "rate limit", "temporarily unavailable", "try again later"]) || /http\s+5\d\d/i.test(message)) {
    return {
      category: "TRANSIENT",
      resolution: "RETRY_LATER",
      code,
      title: "Sağlayıcı geçici olarak yanıt veremiyor",
      message: "Sağlayıcı yoğunluk veya geçici sunucu hatası bildirdi.",
      action: "Sipariş güvenli bekleme süresinden sonra otomatik yeniden denenecektir.",
      retryable: true,
    };
  }

  return {
    category: "UNKNOWN",
    resolution: "RETRY_LATER",
    code,
    title: "Sağlayıcı siparişi kabul etmedi",
    message: "Sağlayıcı tanımlanmamış bir hata döndürdü; teknik kod yönetici incelemesi için saklandı.",
    action: "Kısa bir beklemeden sonra yeniden denenecek; tekrar ederse servis eşlemesi kontrol edilmelidir.",
    retryable: true,
  };
}
