import { db } from "@/lib/db";
import { getTranslatedName } from "@/lib/i18n-db";
import { browsePageContent } from "./chat-agent";
import type { ToolSpec } from "./agent-loop";

/**
 * Destek ajanının araştırma araçları. Tüm araçlar ilgili müşteriye (userId)
 * sınırlandırılır; tedarikçi kimliği gibi iç detaylar asla döndürülmez.
 */

/** Ajanın bilgi edinmesi için önemli site sayfaları. */
export const KNOWN_SITE_PATHS = [
  "/api-docs",
  "/bayilik",
  "/contact",
  "/order-tracking",
  "/services",
  "/servis-listesi",
  "/smm-panel",
  "/blog",
];

export const SUPPORT_TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "search_packages",
      description:
        "Aktif sosyal medya servislerini platform, kategori veya anahtar kelimeye göre arar. Fiyat önerirken veya alternatif servis önerecekken kullan.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", description: "Örn: instagram, tiktok, youtube, twitter" },
          category: { type: "string", description: "Örn: takipçi, beğeni, izlenme, abone" },
          keyword: { type: "string", description: "Kalite/tip anahtar kelimesi (türk, gerçek, bot, ucuz vb.)" },
        },
        required: ["platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_details",
      description:
        "Bu müşterinin tek bir siparişinin tüm detaylarını getirir (durum, kalan miktar, refill talepleri, iç işlem durumu). Sipariş numarasının son 8 hanesi veya tam numarası ile arama yapılır.",
      parameters: {
        type: "object",
        properties: {
          orderRef: { type: "string", description: "Sipariş numarası (tam veya sondaki kısmı, # işareti olmadan)" },
        },
        required: ["orderRef"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payment_history",
      description: "Bu müşterinin son bakiye yükleme/ödeme işlemlerini listeler. Ödeme yatmadı şikayetlerinde kullan.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_page_content",
      description: `Sitenin herhangi bir genel sayfasını okuyup güncel bilgi alır (vaatler, kampanyalar, SSS, dökümantasyon). Önemli sayfalar: ${KNOWN_SITE_PATHS.join(", ")}`,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Taranacak sayfanın yolu. Örn: /api-docs, /bayilik, /services" },
        },
        required: ["path"],
      },
    },
  },
];

/**
 * Araç çağrılarını yürüten executor üretir. Tüm sorgular yalnızca ilgili müşterinin
 * kendi kayıtlarına erişir.
 */
export function createSupportToolExecutor(userId: string, locale: string = "tr") {
  return async function executeTool(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case "search_packages":
        return searchPackagesTool(args.platform || "", args.category, args.keyword, locale);

      case "get_order_details":
        return getOrderDetailsTool(userId, String(args.orderRef || ""));

      case "get_payment_history":
        return getPaymentHistoryTool(userId);

      case "browse_page_content":
        return browsePageContent(String(args.path || "/"));

      default:
        return { error: `Bilinmeyen araç: ${name}` };
    }
  };
}

/** Aktif servislerde arama; sonuçlar fiyat artan sıralı ve en fazla 8 kayıt. */
async function searchPackagesTool(platform: string, category?: string, keyword?: string, locale: string = "tr") {
  try {
    const andConditions: any[] = [{ status: true }];

    if (platform) {
      andConditions.push({
        OR: [
          { name: { contains: platform, mode: "insensitive" } },
          { category: { name: { contains: platform, mode: "insensitive" } } },
        ],
      });
    }
    if (category) {
      andConditions.push({
        OR: [
          { name: { contains: category, mode: "insensitive" } },
          { category: { name: { contains: category, mode: "insensitive" } } },
        ],
      });
    }
    if (keyword) {
      andConditions.push({
        OR: [
          { name: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { category: { name: { contains: keyword, mode: "insensitive" } } },
        ],
      });
    }

    const services = await db.service.findMany({
      where: { AND: andConditions },
      select: {
        id: true,
        name: true,
        min: true,
        max: true,
        price: true,
        retailPrice: true,
        avgCompletionMinutes: true,
        canRefill: true,
        canCancel: true,
        translations: true,
      },
      take: 30,
    });

    return services
      .sort((a, b) => (a.retailPrice ?? a.price) - (b.retailPrice ?? b.price))
      .slice(0, 8)
      .map((s) => ({
        serviceId: s.id,
        name: getTranslatedName(s.name, s.translations as any, locale),
        min: s.min,
        max: s.max,
        pricePerThousand: s.retailPrice ?? s.price,
        avgCompletionMinutes: s.avgCompletionMinutes,
        refillSupported: s.canRefill,
        cancellable: s.canCancel,
      }));
  } catch {
    return { error: "Servis araması başarısız oldu." };
  }
}

/** Müşterinin kendi sipariş detayı; tedarikçi adı gibi iç bilgiler hariç. */
async function getOrderDetailsTool(userId: string, orderRef: string) {
  try {
    const ref = orderRef.replace(/[#\s]/g, "");
    if (!ref) return { error: "Sipariş referansı boş." };

    const order = await db.order.findFirst({
      where: {
        userId,
        OR: [{ id: ref }, { id: { endsWith: ref } }],
      },
      include: {
        service: {
          select: {
            name: true,
            category: { select: { name: true } },
            avgCompletionMinutes: true,
            canRefill: true,
            canCancel: true,
          },
        },
        refillRequests: { orderBy: { requestedAt: "desc" }, take: 3 },
      },
    });

    if (!order) return { error: "Bu müşteriye ait böyle bir sipariş bulunamadı." };

    return {
      orderId: order.id,
      shortId: order.id.slice(-8).toUpperCase(),
      serviceName: order.service.name,
      category: order.service.category?.name,
      status: order.status,
      quantity: order.quantity,
      remains: order.remains,
      startCount: order.startCount,
      charge: order.charge,
      refundedAmount: order.refundedAmount,
      link: order.link,
      createdAt: order.createdAt,
      internalProcessingStatus: order.providerStatus,
      avgCompletionMinutes: order.service.avgCompletionMinutes,
      refillSupported: order.service.canRefill,
      cancellable: order.service.canCancel,
      refillRequests: order.refillRequests.map((r) => ({ status: r.status, requestedAt: r.requestedAt })),
    };
  } catch {
    return { error: "Sipariş detayı okunamadı." };
  }
}

/** Müşterinin son 10 ödemesi. */
async function getPaymentHistoryTool(userId: string) {
  try {
    const payments = await db.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        amount: true,
        method: true,
        status: true,
        createdAt: true,
        failureReason: true,
        gatewayStatus: true,
      },
    });
    return payments;
  } catch {
    return { error: "Ödeme geçmişi okunamadı." };
  }
}
