import type { OrderStatus } from "@prisma/client";

export type ProviderAddOrderInput = {
  apiUrl: string;
  apiKey: string;
  externalServiceId: string;
  link: string;
  quantity: number;
  /** For Custom Comments service type — newline-separated comments. Replaces quantity. */
  comments?: string;
};

export type ProviderOrderStatusInput = {
  apiUrl: string;
  apiKey: string;
  apiOrderId: string;
};

export type ProviderAddOrderResult = {
  ok: boolean;
  apiOrderId?: string;
  raw: string;
  error?: string;
};

export type ProviderOrderStatusResult = {
  ok: boolean;
  status?: OrderStatus | null;
  rawStatus?: string;
  startCount?: number;
  remains?: number;
  charge?: number;
  raw: string;
  error?: string;
};

function toNormalizedToken(value: string | undefined) {
  return (value || "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeStatus(value: string | undefined): OrderStatus | null {
  const normalized = toNormalizedToken(value);

  if (
    [
      "completed",
      "complete",
      "success",
      "successful",
      "done",
      "delivered",
      "tamamlandi",
      "tamamlanmis",
      "finished",
      "finish",
      "ordercompleted",
      "servicecompleted",
    ].includes(normalized)
  ) {
    return "COMPLETED";
  }

  if (
    [
      "partial",
      "partiallycompleted",
      "partiallycomplete",
      "kismi",
      "kismitamamlandi",
      "partiallydelivered",
    ].includes(normalized)
  ) {
    return "PARTIAL";
  }

  if (
    [
      "canceled",
      "cancelled",
      "cancel",
      "cancelledorder",
      "cancelrequestapproved",
      "iptal",
      "iptaledildi",
      "failed",
      "fail",
      "rejected",
      "error",
    ].includes(normalized)
  ) {
    return "CANCELED";
  }

  if (
    [
      "processing",
      "inprogress",
      "progress",
      "inprocess",
      "running",
      "islemsirasinda",
      "devamediyor",
      "yukleniyor",
      "yukleme",
      "loading",
      "active",
      "working",
      "started",
    ].includes(normalized)
  ) {
    return "PROCESSING";
  }

  if (
    [
      "pending",
      "pendingpayment",
      "queued",
      "queue",
      "waiting",
      "beklemede",
      "new",
      "created",
      "received",
    ].includes(normalized)
  ) {
    return "PENDING";
  }

  return null;
}

async function sendProviderRequest(apiUrl: string, body: URLSearchParams) {
  const configuredTimeout = Number(process.env.PROVIDER_API_TIMEOUT_MS || 20_000);
  const timeoutMs = Math.max(3_000, Math.min(60_000, Number.isFinite(configuredTimeout) ? configuredTimeout : 20_000));
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const raw = await response.text();

  if (!response.ok) {
    return { raw, parsed: null, httpError: `HTTP ${response.status}` };
  }

  try {
    return { raw, parsed: JSON.parse(raw) as Record<string, unknown> | null, httpError: null };
  } catch {
    return { raw, parsed: null, httpError: "Saglayici JSON cevabi cozumlenemedi" };
  }
}

export async function addProviderOrder(input: ProviderAddOrderInput): Promise<ProviderAddOrderResult> {
  const body = new URLSearchParams({
    key: input.apiKey,
    action: "add",
    service: input.externalServiceId,
    link: input.link,
  });

  if (input.comments) {
    // Custom Comments service type: send comments, quantity is derived from line count
    body.set("comments", input.comments);
  } else {
    body.set("quantity", String(input.quantity));
  }

  try {
    const { raw, parsed, httpError } = await sendProviderRequest(input.apiUrl, body);

    if (httpError) {
      return { ok: false, raw, error: httpError };
    }

    const apiOrderId = parsed?.order;

    if (typeof apiOrderId === "string" || typeof apiOrderId === "number") {
      return { ok: true, raw, apiOrderId: String(apiOrderId) };
    }

    const providerError =
      typeof parsed?.error === "string"
        ? parsed.error
        : typeof parsed?.message === "string"
          ? parsed.message
          : "Saglayici siparis kabul etmedi";

    return { ok: false, raw, error: providerError };
  } catch (error) {
    return {
      ok: false,
      raw: JSON.stringify({ message: error instanceof Error ? error.message : "Unknown provider error" }),
      error: error instanceof Error ? error.message : "Saglayici istegi basarisiz oldu",
    };
  }
}

export async function getProviderOrderStatus(
  input: ProviderOrderStatusInput
): Promise<ProviderOrderStatusResult> {  const body = new URLSearchParams({
    key: input.apiKey,
    action: "status",
    order: input.apiOrderId,
  });

  try {
    const { raw, parsed, httpError } = await sendProviderRequest(input.apiUrl, body);

    if (httpError) {
      return { ok: false, raw, error: httpError };
    }

    if (!parsed) {
      return { ok: false, raw, error: "Saglayici cevabi bos" };
    }

    return {
      ok: true,
      raw,
      rawStatus: typeof parsed.status === "string" ? parsed.status : undefined,
      status: normalizeStatus(typeof parsed.status === "string" ? parsed.status : undefined),
      startCount: Number(parsed.start_count || 0),
      remains: Number(parsed.remains || 0),
      charge: Number(parsed.charge || 0),
    };
  } catch (error) {
    return {
      ok: false,
      raw: JSON.stringify({ message: error instanceof Error ? error.message : "Unknown provider error" }),
      error: error instanceof Error ? error.message : "Saglayici durum istegi basarisiz oldu",
    };
  }
}

export async function getProviderOrdersStatusBatch(input: {
  apiUrl: string;
  apiKey: string;
  apiOrderIds: string[];
}) {
  const ids = input.apiOrderIds.filter(Boolean);
  if (ids.length === 0) {
    return { ok: true, results: {} as Record<string, ProviderOrderStatusResult> };
  }

  const body = new URLSearchParams({
    key: input.apiKey,
    action: "status",
    orders: ids.join(","),
  });

  try {
    const { raw, parsed, httpError } = await sendProviderRequest(input.apiUrl, body);

    if (httpError || !parsed) {
      return { ok: false, error: httpError || "Saglayici toplu durum cevabi bos", raw };
    }

    const results: Record<string, ProviderOrderStatusResult> = {};

    const parseEntry = (payload: Record<string, unknown>) => ({
      ok: true,
      raw,
      rawStatus: typeof payload.status === "string" ? payload.status : undefined,
      status: normalizeStatus(typeof payload.status === "string" ? payload.status : undefined),
      startCount: Number(payload.start_count || 0),
      remains: Number(payload.remains || 0),
      charge: Number(payload.charge || 0),
    } as ProviderOrderStatusResult);

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        const orderId = String(row.order || row.id || "");
        if (!orderId) continue;
        results[orderId] = parseEntry(row);
      }
    } else {
      for (const [orderId, value] of Object.entries(parsed)) {
        if (!value || typeof value !== "object") continue;
        results[orderId] = parseEntry(value as Record<string, unknown>);
      }
    }

    return { ok: true, results };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Saglayici toplu durum istegi basarisiz oldu",
      raw: "",
    };
  }
}

// ─── Cancel Orders ────────────────────────────────────────────────────────────

export type ProviderCancelResult = {
  ok: boolean;
  cancelled: string[];   // başarılı iptal edilen apiOrderId'ler
  failed: Array<{ apiOrderId: string; error: string }>;
  raw: string;
};

type ProviderCancelItem = {
  order?: string | number;
  cancel?: 1 | true | { error?: unknown } | string | null;
};

function hasProviderCancelError(cancel: ProviderCancelItem["cancel"]): cancel is { error?: unknown } {
  return typeof cancel === "object" && cancel !== null && "error" in cancel;
}

export async function cancelProviderOrders(
  apiUrl: string,
  apiKey: string,
  apiOrderIds: string[]
): Promise<ProviderCancelResult> {
  const body = new URLSearchParams({
    key: apiKey,
    action: "cancel",
    orders: apiOrderIds.join(","),
  });

  try {
    const { raw, parsed, httpError } = await sendProviderRequest(apiUrl, body);

    if (httpError || !parsed) {
      return { ok: false, cancelled: [], failed: apiOrderIds.map((id) => ({ apiOrderId: id, error: httpError || "Boş yanıt" })), raw: raw ?? "" };
    }

    const results: ProviderCancelResult = { ok: true, cancelled: [], failed: [], raw };

    // API yanıtı: [{order: 2, cancel: 1}, {order: 9, cancel: {error: "..."}}]
    const list: ProviderCancelItem[] = Array.isArray(parsed)
      ? parsed as ProviderCancelItem[]
      : Object.entries(parsed).map(([order, cancel]) => ({
          order,
          cancel: cancel as ProviderCancelItem["cancel"],
        }));

    for (const item of list) {
      const orderId = String(item.order ?? "");
      if (!orderId) continue;

      if (hasProviderCancelError(item.cancel) && item.cancel.error) {
        results.failed.push({ apiOrderId: orderId, error: String(item.cancel.error) });
      } else {
        results.cancelled.push(orderId);
      }
    }

    return results;
  } catch (error) {
    return {
      ok: false,
      cancelled: [],
      failed: apiOrderIds.map((id) => ({ apiOrderId: id, error: error instanceof Error ? error.message : "Bilinmeyen hata" })),
      raw: "",
    };
  }
}

// ─── Create Refill ────────────────────────────────────────────────────────────

export type ProviderRefillResult = {
  ok: boolean;
  refillId?: string;
  error?: string;
  raw: string;
};

export async function createProviderRefill(
  apiUrl: string,
  apiKey: string,
  apiOrderId: string
): Promise<ProviderRefillResult> {
  const body = new URLSearchParams({
    key: apiKey,
    action: "refill",
    order: apiOrderId,
  });

  try {
    const { raw, parsed, httpError } = await sendProviderRequest(apiUrl, body);

    if (httpError) return { ok: false, raw: raw ?? "", error: httpError };
    if (!parsed) return { ok: false, raw: raw ?? "", error: "Boş yanıt" };

    if (typeof parsed.refill === "number" || typeof parsed.refill === "string") {
      return { ok: true, raw, refillId: String(parsed.refill) };
    }

    const err = typeof parsed.error === "string" ? parsed.error : "Refill kabul edilmedi";
    return { ok: false, raw, error: err };
  } catch (error) {
    return {
      ok: false,
      raw: "",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    };
  }
}

// ─── Get Refill Status ────────────────────────────────────────────────────────

export type ProviderRefillStatusResult = {
  ok: boolean;
  status?: string;
  raw: string;
  error?: string;
};

export async function getProviderRefillStatus(
  apiUrl: string,
  apiKey: string,
  providerRefillId: string
): Promise<ProviderRefillStatusResult> {
  const body = new URLSearchParams({
    key: apiKey,
    action: "refill_status",
    refill: providerRefillId,
  });

  try {
    const { raw, parsed, httpError } = await sendProviderRequest(apiUrl, body);

    if (httpError) return { ok: false, raw: raw ?? "", error: httpError };
    if (!parsed) return { ok: false, raw: raw ?? "", error: "Boş yanıt" };

    if (typeof parsed.status === "string") {
      return { ok: true, raw, status: parsed.status };
    }

    const err = typeof parsed.error === "string" ? parsed.error : "Refill durumu alınamadı";
    return { ok: false, raw, error: err };
  } catch (error) {
    return {
      ok: false,
      raw: "",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    };
  }
}
