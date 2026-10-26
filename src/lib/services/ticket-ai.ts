import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { runToolLoop } from "@/lib/agents/agent-loop";
import { SUPPORT_TOOLS, createSupportToolExecutor } from "@/lib/agents/support-tools";
import { buildTicketContext, buildCatalogSnapshot, formatTicketContextAsText } from "./support-context";

/**
 * Yeni açılan destek talebine otonom ilk yanıt.
 * Dayanıklı AI Gateway (retry + model/sağlayıcı fallback) üzerinden çalışır;
 * müşterinin tüm bilgilerini ve site kataloğunu bağlam olarak kullanır,
 * gerekirse site sayfalarını tarayarak araştırma yapar.
 */
export async function generateAiTicketResponse(ticketId: string): Promise<void> {
  try {
    const ctx = await buildTicketContext(ticketId);
    if (!ctx || ctx.ticket.messages.length === 0) return;

    // Eski kurulumlardan kalan blog AI anahtarını yedek anahtar olarak devral
    const settings = await getSettings(["blog_ai_api_key"]);
    const extraKeysBySlug = settings.blog_ai_api_key ? { gemini: [settings.blog_ai_api_key] } : undefined;

    const catalogSnapshot = await buildCatalogSnapshot();
    const contextText = formatTicketContextAsText(ctx, catalogSnapshot);
    const customerName = ctx.ticket.user.name || ctx.ticket.user.username || "Değerli Müşterimiz";

    const systemPrompt = `Sen OptiSMM destek ekibinin kıdemli uzmanı olarak müşteri taleplerini yanıtlıyorsun. Müşterinin tüm hesap bilgilerine, siparişlerine, ödemelerine ve sitenin tüm vaatlerine/kataloğuna hakimsin; gerekirse verilen araçlarla site sayfalarını tarayıp araştırma yapabilirsin.

YANIT KURALLARI:
1. Türkçe yaz; sıcak, nazik, çözüm odaklı ve profesyonel ol. Yapay kalıplar ("Sayın Müşterimiz", "Merhaba ${customerName}" gibi) kullanma; doğal bir giriş yap.
2. Müşterinin gerçek verilerini (sipariş durumu, bakiye, ödeme geçmişi) kullanarak somut ve kişisel yanıt ver. Genel geçer şablon cümleler kurma.
3. Sipariş "Beklemede/İşleniyor" ise: yoğunluğa göre başlangıcın 0-24 saat sürebileceğini, ortalama teslim süresine nazikçe değinerek açıkla.
4. Ödeme konularında: ödemelerin otomatik yansıdığını, nadiren 5-10 dakika gecikebildiğini belirt; ödeme geçmişinde işlem görünmüyorsa dekont/Referans no isteyip ekibi bilgilendirdiğini söyle.
5. İptal isteklerinde: yalnızca başlamamış ve iptal edilebilir servislerin iptal edilebildiğini açıkla; tamamlandıysa geri alınamayacağını kibarca anlat.
6. Emin olmadığın bir bilgi varsa (kampanya, politika, fiyat) uydurma; browse_page_content aracıyla ilgili sayfayı oku veya konuyu ekibin inceleyeceğini belirt.
7. OptiSMM tüm hizmetlerin tek ve doğrudan sağlayıcısıdır; "aracı/tedarikçi/alt sağlayıcı" gibi ifadeler ASLA kullanma. İç sistem detaylarından (iç işlem durum kodları, API hataları) müşteriye bahsetme.
8. Yanıt 2-4 paragrafı geçmesin. Yanıtı doğrudan yaz; markdown kod bloğu, başlık veya imza ekleme.
9. Yanıtın sonuna şu notu ekle: "Not: Bu yanıt sorununuzu çözmediyse lütfen mesaj yazmaya devam edin; müşteri temsilcilerimiz talebinizi en kısa sürede inceleyecektir."`;

    const userPrompt = `Aşağıdaki destek talebini incele ve müşteriye ("${customerName}") yanıt yaz. Araçları gerektiğinde kullanarak araştırma yap.

${contextText}`;

    const result = await runToolLoop({
      systemPrompt,
      userPrompt,
      tools: SUPPORT_TOOLS,
      executeTool: createSupportToolExecutor(ctx.ticket.userId),
      maxIterations: 3,
      temperature: 0.5,
      maxTokens: 1200,
      maxNetworkCalls: 8,
      extraKeysBySlug,
    });

    if (!result.ok || !result.reply) {
      console.error(
        `[ticket-ai-response] AI yanıtı üretilemedi (${result.provider || "?"}/${result.model || "?"}): ${result.error}\n` +
          `Denemeler:\n${result.toolTrace.map((t) => `  ${t}`).join("\n") || "  (araç izi yok)"}`
      );
      return; // Talep OPEN kalır; otonom destek ajanı ve ekip daha sonra devralır
    }

    await db.$transaction([
      db.message.create({
        data: {
          ticketId,
          message: result.reply,
          isAdmin: true,
          isAi: true,
        },
      }),
      db.ticket.update({
        where: { id: ticketId },
        data: { status: "ANSWERED" },
      }),
    ]);

    console.log(`[ticket-ai-response] Yanıt gönderildi (${result.provider}/${result.model}).`);
  } catch (error) {
    console.error("[ticket-ai-response] Error generating reply:", error);
  }
}
