import { db } from "@/lib/db";
import { CRYPTOMUS_MINIMUM_TL } from "@/lib/payment-minimums";

/**
 * Destek ajanı için kapsamlı bağlam üretici.
 * Müşterinin tüm bilgilerini (profil, siparişler, ödemeler, talepler) ve
 * sitenin vaatlerini/katalogunu toplayarak AI'a "tüm siteye hakim" bir zemin sunar.
 */

export type TicketContext = Awaited<ReturnType<typeof buildTicketContext>>;

/** Sipariş durumlarının müşteri dostu Türkçe karşılıkları. */
const ORDER_STATUS_TR: Record<string, string> = {
  PENDING: "Beklemede (kuyruğa alındı)",
  PROCESSING: "İşleniyor",
  IN_PROGRESS: "İşleniyor",
  COMPLETED: "Tamamlandı",
  PARTIAL: "Kısmen tamamlandı",
  CANCELED: "İptal edildi",
  REFUNDED: "İade edildi",
  FAILED: "Başarısız",
};

const PAYMENT_STATUS_TR: Record<string, string> = {
  PENDING: "Beklemede",
  COMPLETED: "Onaylandı",
  APPROVED: "Onaylandı",
  FAILED: "Başarısız",
  CANCELED: "İptal edildi",
  REFUNDED: "İade edildi",
};

export function describeOrderStatus(status: string) {
  return ORDER_STATUS_TR[status] || status;
}

function money(value: number | null | undefined) {
  return `₺${Number(value ?? 0).toFixed(2)}`;
}

/**
 * Bir destek talebi için tüm bağlamı toplar. Tüm sorgular ilgili müşteriye
 * sınırlandırılır; tedarikçi kimliği gibi iç detaylar AI'a sızmaz.
 */
export async function buildTicketContext(ticketId: string) {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      order: {
        include: {
          service: {
            select: {
              name: true,
              category: { select: { name: true } },
              min: true,
              max: true,
              price: true,
              retailPrice: true,
              avgCompletionMinutes: true,
              canRefill: true,
              canCancel: true,
            },
          },
          refillRequests: { orderBy: { requestedAt: "desc" }, take: 3 },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          balance: true,
          spent: true,
          banned: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) return null;

  const userId = ticket.userId;

  const [recentOrders, totalOrders, completedOrders, activeOrders, totalTickets, openTickets, recentPayments] =
    await Promise.all([
      db.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          link: true,
          quantity: true,
          charge: true,
          startCount: true,
          remains: true,
          createdAt: true,
          providerStatus: true,
          service: { select: { name: true, category: { select: { name: true } } } },
        },
      }),
      db.order.count({ where: { userId } }),
      db.order.count({ where: { userId, status: "COMPLETED" } }),
      db.order.count({ where: { userId, status: { in: ["PENDING", "PROCESSING"] } } }),
      db.ticket.count({ where: { userId } }),
      db.ticket.count({ where: { userId, status: { in: ["OPEN", "PENDING", "ANSWERED"] } } }),
      db.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { amount: true, method: true, status: true, createdAt: true, failureReason: true },
      }),
    ]);

  return {
    ticket,
    recentOrders,
    stats: { totalOrders, completedOrders, activeOrders, totalTickets, openTickets },
    recentPayments,
  };
}

/** Sitenin sabit vaatleri ve işleyişi — her destek yanıtının zemin bilgisi. */
export const SITE_KNOWLEDGE = `OPTISMM HAKKINDA VE SİTE VAATLERİ
- OptiSMM, Türkiye merkezli bir SMM (sosyal medya büyütme) panelidir. Instagram, TikTok, YouTube, Twitter/X, Facebook, Telegram, Spotify ve benzeri platformlar için takipçi, beğeni, izlenme, abone, yorum hizmetleri sunar.
- OptiSMM tüm hizmetlerin DOĞRUDAN VE TEK sağlayıcısıdır. Aracı, bayi, tedarikçi, alt sağlayıcı gibi ifadeler ASLA kullanılmaz; tüm işler OptiSMM'nin kendi altyapısında yürür.
- Slogan vaatleri: Anında teslimat başlangıcı, güvenli ödeme, iade garantisi, 7/24 destek.
- FİYATLANDIRMA: Tüm servis fiyatları 1000 adet (binlik) üzerinden belirtilir. Miktar fiyatı = (binlik fiyat / 1000) x istenen miktar formülüyle hesaplanır.
- TESLİMAT: Siparişler genelde anında kuyruğa alınır; yoğunluğa bağlı olarak başlangıç 0-24 saat sürebilir. Servislerin ortalama tamamlanma süreleri sistemde servis bazında kayıtlıdır.
- İADE GARANTİSİ: Teslim edilemeyen, iptal edilen veya düşüş telafisi (refill) kapsamında karşılanamayan siparişlerin tutarı bakiyeye iade edilir. Düşüş telafisi yalnızca refill desteği olan servislerde ve servis sayfasında belirtilen süre içinde geçerlidir.
- İPTAL: Yalnızca henüz başlamamış (Beklemede/İşleniyor) ve iptal edilebilir (canCancel) servisler iptal edilebilir; tamamlanan gönderimler geri alınamaz.
- ÖDEME YÖNTEMLERİ: Kripto (Cryptomus, min ${CRYPTOMUS_MINIMUM_TL} ₺) veya banka havalesi / EFT (min 500 ₺). Havale ile bakiye, yönetici transferi doğrulayıp onayladıktan sonra yüklenir. Servis ve paket sipariş toplamlarına admin ayarındaki KDV oranı eklenir.
- BAYİLİK: Üyeler giriş yapıp /dashboard/reseller/apply sayfasından bayilik başvurusu yaparak indirimli bayi fiyatlarından yararlanabilir.
- API: Tüm üyelere programatik erişim için API desteği verilir. Dokümantasyon /api-docs adresinde; üye API anahtarı Hesap Ayarları (/dashboard/settings) sayfasındadır.
- SİPARİŞ TAKİBİ: Müşteriler siparişlerini /dashboard/orders sayfasından takip edebilir; sitede ayrıca sipariş takip sayfası (/order-tracking) vardır.
- DESTEK: 7/24 destek talebi (ticket) sistemi ve sohbet asistanı mevcuttur; WhatsApp desteği de sitede belirtilmiştir.
- Ajanın tarayıp doğrulama yapabileceği önemli sayfalar: /api-docs, /bayilik, /services, /servis-listesi, /smm-panel, /order-tracking, /contact, /blog`;

/** Aktif kataloğun canlı özeti: kategoriler, servis sayıları, fiyat aralıkları, öne çıkan paketler. */
export async function buildCatalogSnapshot(): Promise<string> {
  try {
    const [categories, featuredPackages, serviceCount] = await Promise.all([
      db.category.findMany({
        where: { status: true },
        select: {
          name: true,
          _count: { select: { services: { where: { status: true } } } },
          services: { where: { status: true }, select: { price: true, retailPrice: true }, take: 200 },
        },
      }),
      db.package.findMany({
        where: { status: true, showOnHomepage: true },
        select: { name: true, price: true, retailPrice: true },
        take: 8,
      }),
      db.service.count({ where: { status: true } }),
    ]);

    const catLines = categories
      .filter((c) => c._count.services > 0)
      .map((c) => {
        const prices = c.services.map((s) => s.retailPrice ?? s.price).filter((p) => p > 0);
        const min = prices.length > 0 ? Math.min(...prices) : null;
        const max = prices.length > 0 ? Math.max(...prices) : null;
        const range = min !== null ? ` (1000 adet ${money(min)} - ${money(max)})` : "";
        return `- ${c.name}: ${c._count.services} aktif servis${range}`;
      })
      .join("\n");

    const pkgLines = featuredPackages
      .map((p) => `- ${p.name}: ${money(p.retailPrice ?? p.price)}`)
      .join("\n");

    return `GÜNCEL KATALOG ÖZETİ (canlı veri)
- Sitede toplam ${serviceCount} aktif servis bulunuyor.
- Kategoriler ve binlik fiyat aralıkları:
${catLines || "  Kategori bulunamadı."}
${pkgLines ? `\n- Ana sayfada öne çıkan paketler:\n${pkgLines}` : ""}`;
  } catch (err) {
    console.warn("[Support Context] Katalog özeti üretilemedi:", err);
    return "GÜNCEL KATALOG ÖZETİ: şu anda okunamadı.";
  }
}

/** Toplanan bağlamı AI prompt'una eklenmek üzere düz metne dönüştürür. */
export function formatTicketContextAsText(ctx: NonNullable<TicketContext>, catalogSnapshot: string): string {
  const { ticket, recentOrders, stats, recentPayments } = ctx;
  const user = ticket.user;

  const roleLabel = user.role === "RESELLER" ? "Bayi" : user.role === "ADMIN" ? "Admin" : "Standart Üye";

  const ordersLines = recentOrders.map((o) => {
    const bits = [
      `#${o.id.slice(-8).toUpperCase()}`,
      o.service.name,
      describeOrderStatus(o.status),
      `Miktar: ${o.quantity.toLocaleString("tr-TR")}`,
      money(o.charge),
      new Date(o.createdAt).toLocaleDateString("tr-TR"),
    ];
    if (o.remains > 0 && ["PENDING", "PROCESSING", "IN_PROGRESS"].includes(o.status)) {
      bits.push(`Kalan: ${o.remains.toLocaleString("tr-TR")}`);
    }
    return `  • ${bits.join(" | ")}`;
  });

  const paymentsLines = recentPayments.map(
    (p) =>
      `  • ${money(p.amount)} — ${p.method} — ${PAYMENT_STATUS_TR[p.status] || p.status} — ${new Date(p.createdAt).toLocaleString("tr-TR")}${
        p.failureReason ? ` (not: ${p.failureReason})` : ""
      }`
  );

  const linkedOrder = ticket.order
    ? `İLGİLİ SİPARİŞ (talebe bağlı):
  - No: #${ticket.order.id.slice(-8).toUpperCase()}
  - Servis: ${ticket.order.service.name} (${ticket.order.service.category?.name || "Genel"})
  - Durum: ${describeOrderStatus(ticket.order.status)}
  - Miktar: ${ticket.order.quantity.toLocaleString("tr-TR")}, Kalan: ${ticket.order.remains.toLocaleString("tr-TR")}, Başlangıç: ${ticket.order.startCount.toLocaleString("tr-TR")}
  - Tutar: ${money(ticket.order.charge)}
  - Link: ${ticket.order.link}
  - Oluşturma: ${new Date(ticket.order.createdAt).toLocaleString("tr-TR")}
  - Ortalama teslim süresi: ${ticket.order.service.avgCompletionMinutes ? `${Math.round(ticket.order.service.avgCompletionMinutes / 60)} saat` : "servis bazlı değişken"}
  - Refill (düşüş telafisi): ${ticket.order.service.canRefill ? "Var" : "Yok"} | İptal edilebilir: ${ticket.order.service.canCancel ? "Evet" : "Hayır"}
  - Refill talepleri: ${
    ticket.order.refillRequests.length > 0
      ? ticket.order.refillRequests.map((r) => `${r.status} (${new Date(r.requestedAt).toLocaleDateString("tr-TR")})`).join(", ")
      : "Yok"
  }`
    : "Bu talebe bağlı bir sipariş yok.";

  const conversation = ticket.messages
    .map((m) => {
      const who = m.isAdmin ? "[Destek Ekibi]" : "[Müşteri]";
      return `${who} (${new Date(m.createdAt).toLocaleString("tr-TR")}):\n${m.message}`;
    })
    .join("\n\n---\n\n");

  return `MÜŞTERİ PROFİLİ
- Ad: ${user.name || user.username || "Değerli Müşterimiz"} (${user.email})
- Telefon: ${user.phone || "Kayıtlı değil"}
- Hesap Türü: ${roleLabel}
- Üyelik başlangıcı: ${new Date(user.createdAt).toLocaleDateString("tr-TR")}
- Bakiye: ${money(user.balance)} | Toplam Harcama: ${money(user.spent)}
- Toplam ${stats.totalOrders} sipariş (${stats.completedOrders} tamamlandı, ${stats.activeOrders} devam ediyor) ve ${stats.totalTickets} destek talebi geçmişi var${user.banned ? "\n- DİKKAT: Hesabı yönetim tarafından dondurulmuş (banned)." : ""}

SON SİPARİŞLER (en yeni 10)
${ordersLines.join("\n") || "  Sipariş geçmişi yok."}

SON ÖDEMELER (en yeni 5)
${paymentsLines.join("\n") || "  Ödeme geçmişi yok."}

${linkedOrder}

${catalogSnapshot}

${SITE_KNOWLEDGE}

KONUŞMA GEÇMİŞİ
Konu: ${ticket.subject} (Talep durumu: ${ticket.status})

${conversation}`;
}
