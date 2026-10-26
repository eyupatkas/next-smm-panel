export type ProviderServiceRow = {
  service?: string | number;
  name?: string;
  type?: string;
  category?: string;
  rate?: string | number;
  min?: string | number;
  max?: string | number;
  status?: string | number;
  refill?: boolean | string | number;
  cancel?: boolean | string | number;
  dripfeed?: boolean | string | number;
  description?: unknown;
  desc?: unknown;
  details?: unknown;
  serviceDescription?: unknown;
  service_description?: unknown;
};

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeUnknownText(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = decodeHtmlEntities(
      value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
        .replace(/<li>/gi, "- ")
        .replace(/<[^>]+>/g, " ")
    )
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    return normalized || null;
  }

  if (Array.isArray(value)) {
    const lines = value
      .map((entry) => normalizeUnknownText(entry))
      .filter((entry): entry is string => Boolean(entry));

    return lines.length > 0 ? lines.join("\n") : null;
  }

  if (value && typeof value === "object") {
    const nested = Object.values(value as Record<string, unknown>)
      .map((entry) => normalizeUnknownText(entry))
      .filter((entry): entry is string => Boolean(entry));

    return nested.length > 0 ? nested.join("\n") : null;
  }

  return null;
}

export function getProviderServiceDescription(item: ProviderServiceRow): string | null {
  return (
    normalizeUnknownText(item.description) ||
    normalizeUnknownText(item.desc) ||
    normalizeUnknownText(item.details) ||
    normalizeUnknownText(item.serviceDescription) ||
    normalizeUnknownText(item.service_description)
    // item.type kasıtlı olarak çıkarıldı: "Default", "Package" gibi
    // anlamsız değerleri açıklama olarak kaydetmemek için
  );
}

function parseBooleanField(value: boolean | string | number | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
}

export function getProviderServiceFeatures(item: ProviderServiceRow): {
  canRefill: boolean;
  canCancel: boolean;
  hasDripfeed: boolean;
} {
  return {
    canRefill: parseBooleanField(item.refill),
    canCancel: parseBooleanField(item.cancel),
    hasDripfeed: parseBooleanField(item.dripfeed),
  };
}

export async function fetchProviderServices(
  apiUrl: string,
  apiKey: string
): Promise<ProviderServiceRow[]> {
  const body = new URLSearchParams({ key: apiKey, action: "services" });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const raw = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Provider JSON parse hatasi");
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? Object.values(parsed as Record<string, unknown>)
      : [];

  return list as ProviderServiceRow[];
}