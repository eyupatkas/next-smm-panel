import { db } from "@/lib/db";
import { getTranslatedName } from "@/lib/i18n-db";
import { calculateSafeServiceCharge } from "@/lib/pricing";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { applyUserMoneyDelta } from "@/lib/money";
import { getEffectiveAvailableBalance } from "@/lib/services/dashboard-checkout";
import { callAiGateway, getProviderChain, type GatewayMessage } from "./ai-gateway";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
};

export type ChatAgentResponse = {
  reply: string;
  action?: "PAYMENT_REQUIRED" | "ORDER_COMPLETED";
  metadata?: any;
  suggestedPackages?: any[];
  history: ChatMessage[];
};

/**
 * Aktif AI sağlayıcı yapılandırmasının varlığını kontrol eder (detaylı seçim gateway'de yapılır).
 */
async function hasActiveProvider(): Promise<{ apiKey: string; providerName: string }> {
  const chain = await getProviderChain();
  const primary = chain[0];
  return {
    apiKey: primary?.apiKeys[0] || "",
    providerName: primary?.name || "Gemini",
  };
}

/**
 * Yapay Zeka Hızlı Sipariş Ajan Döngüsü (NL2Order)
 */
export async function runChatOrderAgent({
  userId,
  message,
  history = [],
  locale = "tr",
}: {
  userId?: string | null;
  message: string;
  history: ChatMessage[];
  locale?: string;
}): Promise<ChatAgentResponse> {
  const { apiKey, providerName } = await hasActiveProvider();
  if (!apiKey) {
    return {
      reply: `Sistemde aktif yapay zeka sağlayıcısı (${providerName}) veya API anahtarı tanımlı değil. Lütfen yöneticinizle iletişime geçin.`,
      history,
    };
  }

  // 1. Kullanıcı bilgilerini çek (eğer giriş yapmışsa)
  let user: any = null;
  let recentOrders: any[] = [];
  let openTickets: any[] = [];

  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        spent: true,
        role: true,
        banned: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        apiKey: true,
      },
    });

    if (user) {
      // Son 3 siparişi çek
      recentOrders = await db.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          status: true,
          charge: true,
          quantity: true,
          link: true,
          createdAt: true,
          service: {
            select: { name: true },
          },
        },
      });

      // Açık/Cevaplanmış destek taleplerini çek
      openTickets = await db.ticket.findMany({
        where: { userId, status: { in: ["PENDING", "ANSWERED"] } },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: {
          id: true,
          subject: true,
          status: true,
          updatedAt: true,
        },
      });
    }
  }

  // 2. Mesaj geçmişine yeni kullanıcı mesajını ekle
  const currentMessages: ChatMessage[] = [
    ...history,
    { role: "user", content: message },
  ];

  // 3. System Prompt'u oluştur
  let userStatusText = "";
  if (user) {
    const ordersSummary = recentOrders.length > 0
      ? recentOrders.map(o => `- [Sipariş #${o.id}] Hizmet: ${o.service.name}, Miktar: ${o.quantity}, Durum: ${o.status}, Harcanan: ₺${o.charge.toFixed(2)}, Link: ${o.link}, Tarih: ${o.createdAt.toLocaleDateString("tr-TR")}`).join("\n")
      : "Henüz verilmiş bir sipariş bulunmuyor.";

    const ticketsSummary = openTickets.length > 0
      ? openTickets.map(t => `- [Talep #${t.id}] Konu: ${t.subject}, Durum: ${t.status}, Son Hareket: ${t.updatedAt.toLocaleDateString("tr-TR")}`).join("\n")
      : "Açık destek talebi bulunmuyor.";

    userStatusText = `Müşteri Tanıma Kartı (Sistemde Giriş Yapmış Üye):
- ID: ${user.id}
- İsim: ${user.name || "Kullanıcı"}
- E-posta: ${user.email}
- Telefon: ${user.phone || "Belirtilmemiş"}
- Rolü: ${user.role}
- Kayıt Tarihi: ${user.createdAt.toLocaleDateString("tr-TR")}
- Güncel Bakiye: ₺${user.balance.toFixed(2)}
- Toplam Harcama: ₺${user.spent.toFixed(2)}
- API Key (API Anahtarı): ${user.apiKey}

Son 3 Sipariş Geçmişi:
${ordersSummary}

Açık/Aktif Destek Talepleri:
${ticketsSummary}

KULLANIM TALİMATI:
Müşteri sohbete başladığında veya kendisini sorduğunda ona ismiyle hitap et ve tanıdığını belli et. Siparişlerinin durumunu sorduğunda veya destek taleplerinden bahsettiğinde yukarıdaki özet bilgileri kullanarak doğrudan bilgi ver.`;
  } else {
    userStatusText = "Kullanıcı Durumu: Giriş yapılmamış (Ziyaretçi/Misafir). Sipariş oluşturabilmesi için isim, e-posta ve telefon bilgisi almamız gerekecektir.";
  }

  const systemPrompt = `Sen OptiSMM Panelinin otonom Hızlı Sipariş Ajanısın. Görevin, müşterilerin veya ziyaretçilerin doğal dilde yazışarak sipariş vermesini sağlamaktır.
  
${userStatusText}

KURALLAR:
1. Sipariş vermek için şu bilgilere ihtiyacın var: Servis ID (search_packages aracıyla bul), Geçerli bir Link, Miktar.
2. Kullanıcının bakiyesi varsa ve yetiyorsa, siparişi otonom olarak 'place_order' aracı ile oluştur.
3. Kullanıcı giriş yapmamışsa (ziyaretçi ise) veya bakiyesi yetmiyorsa, siparişi oluşturmak için 'place_order' aracını çağır. Bu araç sana ödeme gerektiğini belirten 'requiresPayment' bayrağı dönecektir. Bu durumda kullanıcıya ödeme yapması gerektiğini söyle ve kartla ödeme yapabilmesi için yönlendir.
4. Müşteriye karşı kibar, çözüm odaklı ve net ol. Fiyatları her zaman TRY (₺) cinsinden söyle.
5. OptiSMM tüm hizmetlerin doğrudan sağlayıcısıdır. "Tedarikçi", "aracı" gibi ifadeler KULLANMA.
6. OptiSMM müşterilerine tam API ve programatik entegrasyon desteği sağlar. Üyeler kendi API anahtarlarını (API key) Giriş yaptıktan sonra "Hesap Ayarları" (/dashboard/settings) sayfasından görüntüleyebilir veya yeniden üretebilirler. Eğer kullanıcı giriş yapmışsa ve kendi API Key'ini isterse, Müşteri Tanıma Kartı'nda yer alan API Key değerini doğrudan ona söyleyebilirsin.
7. API entegrasyon dökümantasyonu "/api-docs" (veya https://optismm.com/api-docs) adresindedir. API entegrasyonu, kod örneği veya entegrasyon adımları soran üyeleri buraya yönlendir.
8. Müşterilere, daha uygun/indirimli fiyatlarla hizmet alabilmeleri için "Bayi Başvurusu" yapabileceklerini hatırlat. Bayi başvurusu yapmak isteyenleri Giriş yaptıktan sonra sol menüdeki "Bayilik Başvurusu" sayfasına (/dashboard/reseller/apply) yönlendir.
9. Eğer bir konu veya sitenin kuralları/hizmetleri hakkında emin olmadığın bir soru gelirse, sitedeki ilgili sayfayı taramak ve güncel bilgiyi edinmek için 'browse_page_content' aracını kullan. Bilmiyorum demek yerine bu araçla sayfaları inceleyip güncel ve doğru bilgiyle yanıt ver.
10. MİKTAR FİYATI HESAPLAMA KURALI: Sitedeki tüm servis fiyatları 1000 adet (binlik) fiyatıdır. Müşteri 10, 50, 100, 200, 500 veya herhangi bir miktar için fiyat sorduğunda, binlik fiyatı doğrudan müşteriye söyleme! Fiyatı müşterinin istediği miktara göre bölüp çarparak hesapla. Matematiksel formül: İstenen_Miktar_Fiyatı = (Binlik_Fiyat / 1000) * İstenen_Miktar. Fiyatı kuruşu kuruşuna tam hesapla ve müşteriye şöyle yanıt ver: "Z adet fiyatı X ₺ (1000 adeti Y ₺)".
11. DİL UYUMLULUĞU: Kullanıcının arayüz dili '${locale}' olarak seçilmiştir. Müşteri hangi dilde yazıyorsa veya hangi dili tercih ediyorsa o dilde (İngilizce, Almanca, Arapça, Rusça vb.) yanıt ver. Sunduğun servis isimlerini ve açıklamalarını da bu dile uygun şekilde sun.`;

  // Sistemin ilk başındaki system prompt'u ekle
  const messagesToSend: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...currentMessages,
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "search_packages",
        description: "Aktif sosyal medya paketlerini platform, kategori veya anahtar kelimeye göre arar.",
        parameters: {
          type: "object",
          properties: {
            platform: { type: "string", description: "Örn: instagram, tiktok, youtube, twitter" },
            category: { type: "string", description: "Örn: takipçi, beğeni, izlenme, yorum" },
            keyword: { type: "string", description: "Kalite veya tip anahtar kelimeleri (Türkçe, gerçek, bot, ucuz)" },
          },
          required: ["platform"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_balance",
        description: "Giriş yapmış olan üyenin güncel bakiye bilgisini döner.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "place_order",
        description: "Seçilen servis için siparişi başlatır. Bakiye yetersizse veya kullanıcı misafir ise ödeme adımına yönlendirir.",
        parameters: {
          type: "object",
          properties: {
            serviceId: { type: "string", description: "Seçilen servisin ID'si" },
            link: { type: "string", description: "Sipariş verilecek sosyal medya profil veya paylaşım linki" },
            quantity: { type: "number", description: "Sipariş verilecek miktar" },
          },
          required: ["serviceId", "link", "quantity"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "browse_page_content",
        description: "Sitedeki genel sayfaları veya entegrasyon dökümantasyonunu inceleyip bilgi toplamak için o sayfayı tarar/okur.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Taranacak sayfanın url yolu. Örn: /api-docs, /bayilik, /contact" },
          },
          required: ["path"],
        },
      },
    },
  ];

  let action: "PAYMENT_REQUIRED" | "ORDER_COMPLETED" | undefined;
  let actionMetadata: any = null;
  let suggestedPackages: any[] = [];
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;

    try {
      const gwRes = await callAiGateway({
        messages: messagesToSend,
        tools,
        temperature: 0.3,
        triesPerModel: 2,
        maxNetworkCalls: 10,
      });

      if (!gwRes.ok) {
        return {
          reply: `Yapay zeka sağlayıcılarına şu anda ulaşılamıyor (${gwRes.error || "bilinmeyen hata"}). Lütfen birazdan tekrar deneyin.`,
          history: currentMessages,
        };
      }

      const assistantMessage = gwRes.message;

      if (!assistantMessage) {
        return { reply: "Üzgünüm, şu anda yanıt üretemiyorum.", history: currentMessages };
      }

      // DeepSeek asistan mesajını listeye ekle
      messagesToSend.push(assistantMessage);
      currentMessages.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
      });

      // Eğer tool_calls yoksa döngü biter (final yanıtı aldık)
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        break;
      }

      // Tool Call'ları sırayla çalıştır
      for (const call of assistantMessage.tool_calls) {
        const functionName = call.function.name;
        const args = JSON.parse(call.function.arguments || "{}");
        let result: any = null;

        console.log(`[Chat Agent] Executing tool: ${functionName} with args:`, args);

        if (functionName === "search_packages") {
          result = await searchPackagesTool(args.platform, args.category, args.keyword, locale);
          if (Array.isArray(result)) {
            suggestedPackages = result;
          }
        } else if (functionName === "check_balance") {
          result = user ? { balance: user.balance } : { balance: 0, error: "Giriş yapılmamış." };
        } else if (functionName === "place_order") {
          const orderRes = await placeOrderTool(user, args.serviceId, args.link, args.quantity);
          result = orderRes;
          if (orderRes.requiresPayment) {
            action = "PAYMENT_REQUIRED";
            actionMetadata = {
              serviceId: args.serviceId,
              link: args.link,
              quantity: args.quantity,
              amount: orderRes.remainingAmount,
              serviceName: orderRes.serviceName,
            };
          } else if (orderRes.ok) {
            action = "ORDER_COMPLETED";
            actionMetadata = {
              orderId: orderRes.orderId,
              serviceName: orderRes.serviceName,
              charge: orderRes.charge,
              quantity: args.quantity,
            };
          }
        } else if (functionName === "browse_page_content") {
          result = await browsePageContent(args.path);
        }

        // Sonucu mesaj geçmişine ekle
        messagesToSend.push({
          role: "tool",
          tool_call_id: call.id,
          name: functionName,
          content: JSON.stringify(result),
        });

        currentMessages.push({
          role: "tool",
          tool_call_id: call.id,
          name: functionName,
          content: JSON.stringify(result),
        });
      }
    } catch (err) {
      console.error("[Chat Agent Loop Error]:", err);
      return {
        reply: "Sipariş işleme döngüsünde teknik bir sorun oluştu.",
        history: currentMessages,
      };
    }
  }

  // Son asistan yanıtını döndür
  const lastReply = currentMessages[currentMessages.length - 1].content || "";

  return {
    reply: lastReply,
    action,
    metadata: actionMetadata,
    suggestedPackages,
    history: currentMessages.filter((m) => m.role !== "system"), // System prompt'u geçmişten gizle
  };
}

/**
 * Paket Arama Aracı
 */
async function searchPackagesTool(platform: string, category?: string, keyword?: string, locale: string = "tr") {
  try {
    const andConditions: any[] = [{ status: true }];

    // Platform araması (Instagram, Tiktok vb.)
    if (platform) {
      andConditions.push({
        OR: [
          { name: { contains: platform, mode: "insensitive" } },
          { category: { name: { contains: platform, mode: "insensitive" } } },
        ],
      });
    }

    // Kategori araması (takipçi, beğeni, izlenme vb.)
    if (category) {
      andConditions.push({
        OR: [
          { name: { contains: category, mode: "insensitive" } },
          { category: { name: { contains: category, mode: "insensitive" } } },
        ],
      });
    }

    // Anahtar kelime araması (türk, bot, gerçek vb.)
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
      where: {
        AND: andConditions,
      },
      select: {
        id: true,
        name: true,
        min: true,
        max: true,
        price: true,
        retailPrice: true,
        avgCompletionMinutes: true,
        translations: true,
        provider: {
          select: {
            balance: true,
          },
        },
      },
      take: 30,
    });

    // Fiyatlarına göre sırala (en ucuz olanlar en üstte)
    // Ama bakiyesi 0 veya sıfıra çok yakın olan sağlayıcıların servislerini sona atalım
    const sortedServices = [...services].sort((a, b) => {
      const aBal = a.provider?.balance ?? 0;
      const bBal = b.provider?.balance ?? 0;
      
      const aHasBalance = aBal > 0.05;
      const bHasBalance = bBal > 0.05;

      if (aHasBalance !== bHasBalance) {
        return aHasBalance ? -1 : 1; // Bakiyesi olan sağlayıcılar her zaman öncelikli
      }

      const aPrice = a.retailPrice ?? a.price;
      const bPrice = b.retailPrice ?? b.price;
      
      return aPrice - bPrice; // En ucuz olan öncelikli
    });

    return sortedServices.slice(0, 8).map((s) => ({
      serviceId: s.id,
      name: getTranslatedName(s.name, s.translations as any, locale),
      min: s.min,
      max: s.max,
      pricePerThousand: s.retailPrice ?? s.price,
      avgCompletionMinutes: s.avgCompletionMinutes,
    }));
  } catch (err) {
    return { error: "Arama başarısız." };
  }
}

/**
 * Sipariş Verme Aracı
 */
async function placeOrderTool(user: any, serviceId: string, link: string, quantity: number) {
  try {
    const service = await db.service.findUnique({
      where: { id: serviceId, status: true },
      include: { provider: true },
    });

    if (!service) {
      return { error: "Seçilen servis bulunamadı veya pasif durumda." };
    }

    if (quantity < service.min || quantity > service.max) {
      return { error: `Geçersiz miktar. Miktar en az ${service.min}, en fazla ${service.max} olmalıdır.` };
    }

    const price = service.retailPrice ?? service.price;
    const charge = Number(((price * quantity) / 1000).toFixed(4));

    // Üye değilse veya bakiyesi yetersizse ödeme yapılması gerekir
    // (bekleyen ödemeler için ayrılan rezerv düşülerek hesaplanır)
    const chatAvailable = user ? await getEffectiveAvailableBalance(db, user.id, user.balance) : 0;
    if (!user || chatAvailable < charge) {
      const remainingAmount = user ? charge - user.balance : charge;
      return {
        requiresPayment: true,
        remainingAmount: Number(remainingAmount.toFixed(2)),
        charge: Number(charge.toFixed(2)),
        serviceName: service.name,
      };
    }

    // Üyenin yeterli bakiyesi var, otonom satın alımı gerçekleştir
    const shouldForward = Boolean(
      service.provider?.status && service.externalId && service.provider.apiUrl && service.provider.apiKey
      );

      const order = await db.$transaction(async (tx) => {
        // Çift bakiye kontrolü
        const freshUserResult = await tx.$queryRaw<{balance: number}[]>`SELECT balance FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        const freshUser = freshUserResult[0];
        if (!freshUser || (await getEffectiveAvailableBalance(tx, user.id, freshUser.balance)) < charge) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

      const created = await tx.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link,
          quantity,
          charge,
          status: "PENDING",
          apiOrderId: null,
          remains: quantity,
          placedByAgent: true,
          providerStatus: null,
          providerRawStatus: null,
          providerSentAt: null,
          providerSyncError: null,
        },
      });

      await applyUserMoneyDelta(tx, user.id, {
        balance: -charge,
        spent: charge,
      });

        return created;
      });

      const sendResult = shouldForward ? await sendOrderToProvider(order.id) : null;

      return {
        ok: true,
        orderId: order.id,
        serviceName: service.name,
        charge,
        providerStatus: sendResult?.status ?? (sendResult?.sent ? "PROCESSING" : "PENDING"),
        refunded: sendResult?.resolved === true && sendResult.status === "CANCELED",
      };
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_BALANCE") {
      return { error: "Yetersiz bakiye." };
    }
    return { error: "Sipariş veritabanı kaydı oluşturulamadı." };
  }
}

/**
 * Sayfa Tarama / Bilgi Edinme Aracı
 * (Destek ajanı da site araştırması için bu aracı kullanır.)
 */
export async function browsePageContent(path: string): Promise<any> {
  try {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    let targetPath = cleanPath;
    if (!targetPath.startsWith("/tr/") && !targetPath.startsWith("/en/") && targetPath !== "/tr" && targetPath !== "/en") {
      targetPath = `/tr${targetPath}`;
    }

    // SSRF koruması: yol yalnızca harf/rakam/tire içerebilir; host beyaz listesi dışına çıkılamaz.
    const pathSegments = targetPath.split("/").filter((s) => s.length > 0);
    const segmentsSafe = pathSegments.length <= 6 && pathSegments.every((s) => /^[a-zA-Z0-9-]{1,80}$/.test(s));
    const targetUrl = new URL(`http://localhost:3030${segmentsSafe ? targetPath : "/"}`);
    const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
    if (!segmentsSafe || !allowedHosts.has(targetUrl.hostname)) {
      return { error: "Geçersiz sayfa yolu. Yalnızca bu sitedeki normal sayfalar taranabilir." };
    }

    const url = targetUrl.toString();
    console.log(`[Chat Agent Browser Tool] Fetching page: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "tr,tr-TR;q=0.9",
        "User-Agent": "OptiSMM-AI-Agent-Browser/1.0",
      }
    });
    
    if (!response.ok) {
      return { error: `${targetPath} sayfası yüklenemedi. Durum kodu: ${response.status}` };
    }
    
    const html = await response.text();
    
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    let rawText = mainMatch ? mainMatch[1] : html;
    
    rawText = rawText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    rawText = rawText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    rawText = rawText.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");
    rawText = rawText.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
    rawText = rawText.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
    
    rawText = rawText.replace(/<[^>]+>/g, " ");
    rawText = rawText.replace(/\s+/g, " ").trim();
    
    return {
      path: targetPath,
      content: rawText.slice(0, 3000),
    };
  } catch (error) {
    return { error: `Sayfa taranırken hata oluştu: ${error instanceof Error ? error.message : String(error)}` };
  }
}
