import { db } from "@/lib/db";
import { callDeepSeekAgent } from "./deepseek";
import { syncOrderWithProvider } from "@/lib/services/provider-order-sync";
import { calculateSafeServiceCharge, calculateProviderCost } from "@/lib/pricing";
import { getUsdToTryRate, getInrToTryRate } from "@/lib/settings";

export type ServiceAgentResult = {
  success: boolean;
  message: string;
  switchedPackages: string[];
  logs: string[];
};

/**
 * Otonom Tedarikçi/Hizmet Ajanı.
 * Bozuk veya pahalı sağlayıcı hizmetlerini tespit edip otomatik olarak eşdeğer ucuz sağlayıcıya yönlendirir.
 */

// ==========================================
// TOOL (ARAC) IMPLEMENTASYONLARI
// ==========================================

async function executeOptimizeServices(): Promise<string> {
  const logs: string[] = [];
  let switchedCount = 0;
  
  const packages = await db.package.findMany({
    where: { status: true },
    include: { category: true, service: { include: { provider: true } } },
  });

  for (const pkg of packages) {
    const currentService = pkg.service;
    if (!currentService) continue;

    const isServiceDeactivated = !currentService.status;
    const candidates = await db.service.findMany({
      where: { categoryId: pkg.categoryId, status: true, id: { not: currentService.id } },
      include: { provider: true },
    });

    const cheaperCandidates = candidates.filter(c => c.price < currentService.price);
    const shouldOptimize = isServiceDeactivated || cheaperCandidates.length > 0;

    if (shouldOptimize) {
      const validCandidates = isServiceDeactivated ? candidates : cheaperCandidates;
      if (validCandidates.length === 0) continue;

      const matchedService = validCandidates.sort((a, b) => a.price - b.price)[0];
      if (!matchedService) continue;

      try {
        await db.package.update({
          where: { id: pkg.id },
          data: { serviceId: matchedService.id },
        });

        await db.serviceUpdate.create({
          data: {
            serviceId: matchedService.id,
            serviceName: pkg.name,
            category: pkg.category.name,
            changeType: "PROVIDER_SWITCH",
            description: `Otonom Sağlayıcı Geçişi: ${currentService.provider?.name || "Eski"} -> ${matchedService.provider?.name || "Yeni"}. Gerekçe: Otomatik optimizasyon.`,
          },
        });
        switchedCount++;
        logs.push(`Optimize edilen: ${pkg.name} -> ${matchedService.name}`);
      } catch (err) {}
    }
  }
  return `Optimizasyon aracı başarıyla çalıştı. ${switchedCount} adet paket daha ucuz/aktif bir servise bağlandı.\nDetaylar:\n${logs.join("\n")}`;
}

async function executeUpdatePackagePrices(): Promise<string> {
  let updatedPriceCount = 0;
  
  const packages = await db.package.findMany({ include: { service: true } });
  for (const pkg of packages) {
    if (!pkg.service) continue;
    const packageCost = calculateProviderCost(pkg.service, pkg.quantity);
    const targetMinPrice = Number((packageCost * 2.0).toFixed(2));
    const targetMinRetailPrice = Number((packageCost * 3.0).toFixed(2));

    const updateData: any = {};
    if (pkg.price < targetMinPrice) updateData.price = targetMinPrice;
    if (!pkg.retailPrice || pkg.retailPrice < targetMinRetailPrice) updateData.retailPrice = targetMinRetailPrice;

    if (Object.keys(updateData).length > 0) {
      await db.package.update({ where: { id: pkg.id }, data: updateData });
      updatedPriceCount++;
    }
  }

  const activeServices = await db.service.findMany({ where: { status: true } });
  for (const s of activeServices) {
    const targetResellerPrice = Number((s.price * 2.25).toFixed(4));
    const targetRetailPrice = Number((s.price * 3.5).toFixed(4));
    const updateData: any = {};
    if (!s.resellerPrice || s.resellerPrice < targetResellerPrice) updateData.resellerPrice = targetResellerPrice;
    if (!s.retailPrice || s.retailPrice < targetRetailPrice) updateData.retailPrice = targetRetailPrice;

    if (Object.keys(updateData).length > 0) {
      await db.service.update({ where: { id: s.id }, data: updateData });
      updatedPriceCount++;
    }
  }
  return `Fiyatlandırma aracı tamamlandı. Toplam ${updatedPriceCount} fiyat/kârlılık alanı güncellendi.`;
}

export async function executeRescueOrders(): Promise<string> {
  let rescuedOrderCount = 0;
  
  // Döviz kurlarını settings'den alıyoruz
  const usdToTryRate = await getUsdToTryRate();
  const inrToTryRate = await getInrToTryRate();

  const failedOrders = await db.order.findMany({
    where: {
      OR: [
        { status: "CANCELED" },
        { status: "PENDING", providerSyncError: { not: null } },
        { status: "PENDING", error: { not: null } }
      ],
      AND: [
        {
          OR: [
            { providerSyncError: { contains: "balance", mode: "insensitive" } },
            { providerSyncError: { contains: "bakiye", mode: "insensitive" } },
            { providerSyncError: { contains: "funds", mode: "insensitive" } },
            { error: { contains: "balance", mode: "insensitive" } },
            { error: { contains: "bakiye", mode: "insensitive" } },
            { error: { contains: "funds", mode: "insensitive" } },
          ]
        }
      ]
    },
    include: { service: true, user: true }
  });

  for (const order of failedOrders) {
    if (!order.service || !order.user) continue;
    
    const fallbackCandidates = await db.service.findMany({
      where: {
        categoryId: order.service.categoryId,
        status: true,
        providerId: { not: order.service.providerId }
      },
      orderBy: { price: 'asc' },
      include: { provider: true }
    });

    // Esnek zarar toleransı: %30 zarar veya maksimum 15 TL zarar limitine kadar izin ver
    const maxAllowedLoss = Math.min(order.charge * 0.30, 15);
    const maxCostLimit = order.charge + maxAllowedLoss;

    // Sadece maliyeti tolere edilebilir sınırlar içinde kalan ve sağlayıcı bakiyesi yeterli olan alternatifleri seç
    const profitableCandidates = fallbackCandidates.filter(alt => {
      const safeResult = calculateSafeServiceCharge(order.user.role, alt, order.quantity);
      
      // Sağlayıcı bakiye kontrolü (para birimi dönüştürmeli)
      const balance = alt.provider?.balance ?? 0;
      const baseCurrency = alt.provider?.baseCurrency || "USD";
      const balanceInTry = baseCurrency === "USD" 
        ? balance * usdToTryRate 
        : baseCurrency === "INR" 
          ? balance * inrToTryRate 
          : balance;

      const isCostOk = safeResult.providerCost <= maxCostLimit + 0.0001;
      const isBalanceOk = balanceInTry >= safeResult.providerCost;

      return isCostOk && isBalanceOk;
    });

    if (profitableCandidates.length > 0) {
      await db.order.update({
        where: { id: order.id },
        data: {
          serviceId: profitableCandidates[0].id,
          status: "PENDING",
          providerSyncError: null,
          error: null,
          apiOrderId: null,
          providerStatus: null,
          providerSentAt: null,
          providerLastCheckedAt: null,
          cancelledAt: null
        }
      });
      try {
        await syncOrderWithProvider(order.id);
      } catch (e) {
        // Logla ama süreci durdurma
      }
      rescuedOrderCount++;
    }
  }
  return `Sipariş kurtarma aracı tamamlandı. Bakiye sorunu yaşayan ${rescuedOrderCount} adet sipariş kurtarılarak farklı sağlayıcılara yönlendirildi.`;
}

// ==========================================
// ANA AJAN (ORCHESTRATOR)
// ==========================================

export async function runAutonomousServiceAgent(): Promise<ServiceAgentResult> {
  const agentLogs: string[] = [];
  agentLogs.push("[DeepSeek Agent] Ajan uyandırıldı. Sistem analizi başlatılıyor...");

  const agentTools = [
    {
      type: "function",
      function: {
        name: "optimize_services",
        description: "Scans all active packages and automatically switches them to cheaper equivalent services in the same category to maximize profit. MUST BE CALLED if optimization is needed.",
        parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
        strict: true
      }
    },
    {
      type: "function",
      function: {
        name: "update_package_prices",
        description: "Checks all package and service prices against minimum profit margins and updates them if they are too low.",
        parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
        strict: true
      }
    },
    {
      type: "function",
      function: {
        name: "rescue_orders",
        description: "Scans for failed orders due to insufficient provider balance and re-routes them to alternative providers.",
        parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
        strict: true
      }
    }
  ];

  const systemPrompt = `Sen OptiSMM SMM Panelinin tam otonom Baş Yapay Zeka Yöneticisisin. 
Görevin sistemi sürekli olarak analiz edip, sunulan araçları (tools) kullanarak gerekli iyileştirmeleri, optimizasyonları ve sorun çözümlerini uygulamaktır.
Sana verilen araçlar şunlardır:
1. optimize_services: Daha ucuz tedarikçiler varsa paketleri oraya taşır.
2. update_package_prices: Zarar edilmesini engeller, fiyatları düzeltir.
3. rescue_orders: Sağlayıcıda bakiye kalmadığı için patlayan siparişleri başka sağlayıcıya yönlendirir.

Aşağıdaki iş akışını izle:
1. İhtiyacın olan ARAÇLARI ÇAĞIR (Tool Calls). 
2. Araçlardan gelen sonuçlara göre, sistemi genel olarak değerlendir.
3. Bana Türkçe olarak ajan sürecinin kısa ve etkileyici bir özetini sun.`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Lütfen tüm sistem optimizasyon araçlarını sırasıyla çalıştırarak sistemi denetle ve hataları düzelt." }
  ];

  try {
    agentLogs.push("  • DeepSeek API ile iletişim kuruluyor (Tool Calls bekleniyor)...");
    
    // 1. Aşamada DeepSeek araç çağrılarını isteyecek
    const firstRes = await callDeepSeekAgent({
      messages,
      tools: agentTools,
      temperature: 0.1,
    });

    if (!firstRes.ok || !firstRes.message) {
      agentLogs.push(`  • Hata: DeepSeek API yanıt vermedi. ${firstRes.error}`);
      return { success: false, message: firstRes.error || "API Error", switchedPackages: [], logs: agentLogs };
    }

    const responseMsg = firstRes.message;
    messages.push(responseMsg); // Asistanın yanıtını (ve tool_calls verisini) history'e ekle

    let toolExecutedCount = 0;

    if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
      for (const toolCall of responseMsg.tool_calls) {
        const funcName = toolCall.function.name;
        agentLogs.push(`  ✓ AI Kararı: [${funcName}] aracı (tool) çağrılıyor...`);
        
        let toolResultStr = "";
        try {
          if (funcName === "optimize_services") {
            toolResultStr = await executeOptimizeServices();
          } else if (funcName === "update_package_prices") {
            toolResultStr = await executeUpdatePackagePrices();
          } else if (funcName === "rescue_orders") {
            toolResultStr = await executeRescueOrders();
          } else {
            toolResultStr = `Bilinmeyen araç çağrısı: ${funcName}`;
          }
        } catch (e: any) {
          toolResultStr = `Araç çalışırken hata oluştu: ${e.message}`;
        }
        
        agentLogs.push(`    - Araç Yanıtı: ${toolResultStr.split("\\n")[0]}`);
        
        // Aracın sonucunu sisteme gönder
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResultStr
        });
        toolExecutedCount++;
      }
    } else {
      agentLogs.push("  • DeepSeek hiçbir araç kullanmamaya karar verdi.");
    }

    let finalSummary = responseMsg.content || "Sistem taraması tamamlandı.";

    // 2. Eğer araç çalıştırıldıysa, sonuçları DeepSeek'e geri gönderip nihai kararı alalım
    if (toolExecutedCount > 0) {
      agentLogs.push("  • Araç sonuçları DeepSeek'e değerlendirmesi için gönderiliyor...");
      const secondRes = await callDeepSeekAgent({
        messages,
        temperature: 0.5,
      });
      
      if (secondRes.ok && secondRes.content) {
        finalSummary = secondRes.content;
      }
    }

    agentLogs.push(`\n[Agent Final Raporu]\n${finalSummary}`);

    return {
      success: true,
      message: "Otonom Ajan araçlarla başarılı şekilde çalıştı.",
      switchedPackages: [],
      logs: agentLogs
    };

  } catch (error) {
    agentLogs.push(`  • Ajan döngüsü sırasında sistem hatası: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Ajan Hatası",
      switchedPackages: [],
      logs: agentLogs
    };
  }
}
