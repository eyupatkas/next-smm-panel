"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { runToolLoop } from "@/lib/agents/agent-loop";
import { SUPPORT_TOOLS, createSupportToolExecutor } from "@/lib/agents/support-tools";
import { buildTicketContext, buildCatalogSnapshot, formatTicketContextAsText } from "@/lib/services/support-context";

export async function getAiProviders() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");
  return db.aiProvider.findMany({ orderBy: { name: "asc" } });
}

export async function saveAiProvider(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const id = String(formData.get("id") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "true";
  const isDefault = formData.get("isDefault") === "on" || formData.get("isDefault") === "true";

  // API keys: textarea, her satır bir key
  const rawKeys = String(formData.get("apiKeys") || "");
  const apiKeys = rawKeys.split("\n").map((k) => k.trim()).filter(Boolean);

  if (!id) throw new Error("Missing provider id");

  // Eğer bu provider default yapılıyorsa diğerlerini sıfırla
  if (isDefault) {
    await db.aiProvider.updateMany({ data: { isDefault: false } });
  }

  await db.aiProvider.update({
    where: { id },
    data: { model, enabled, isDefault, apiKeys },
  });

  revalidatePath("/admin/settings/ai");
}

// Admin ticket sayfasında "AI ile Yanıt Üret" butonu için
export async function generateAiTicketReply(ticketId: string): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { ok: false, error: "Unauthorized" };

  try {
    const ctx = await buildTicketContext(ticketId);
    if (!ctx) return { ok: false, error: "Talep bulunamadı." };

    const catalogSnapshot = await buildCatalogSnapshot();
    const contextText = formatTicketContextAsText(ctx, catalogSnapshot);
    const customerName = ctx.ticket.user.name || ctx.ticket.user.username || "Değerli Müşterimiz";

    const systemPrompt = `Sen OptiSMM'un müşteri hizmetleri uzmanı olarak destek taleplerini yanıtlıyorsun. Müşterinin tüm hesap bilgilerine, siparişlerine, ödemelerine ve sitenin tüm vaatlerine/kataloğuna hakimsin; gerekirse verilen araçlarla site sayfalarını tarayıp araştırma yapabilirsin.

Kurallar:
- Türkçe yaz, samimi ama profesyonel ol; yapay kalıp girişler ("Merhaba", "Sayın müşteri") yapma, doğrudan yaz
- Müşterinin gerçek verilerini (sipariş durumu, bakiye, ödeme geçmişi) kullanarak somut yanıt ver
- OptiSMM tüm hizmetlerin KESİNLİKLE doğrudan ve tek sağlayıcısıdır; "aracı", "bayi", "tedarikçi", "alt sağlayıcı" ifadelerini asla kullanma; iç işlem durum kodlarından bahsetme
- Sipariş devam ediyorsa sabırlı olmalarını iste; teknik sorun varsa özür dile ve çözüm öner
- Emin olmadığın bilgiyi uydurma; browse_page_content ile sayfa oku veya ekibin inceleyeceğini söyle
- Gereksiz uzatma, kısa ve net ol (2-4 paragraf); markdown kod bloğu kullanma`;

    const userPrompt = `Aşağıdaki destek talebini incele ve son müşteri mesajını yanıtla ("${customerName}" adlı müşteriye). Gerekirse araçlarla araştırma yap.

${contextText}

Yalnızca yanıt metnini yaz.`;

    const result = await runToolLoop({
      systemPrompt,
      userPrompt,
      tools: SUPPORT_TOOLS,
      executeTool: createSupportToolExecutor(ctx.ticket.userId),
      maxIterations: 3,
      temperature: 0.6,
      maxTokens: 1400,
    });

    if (!result.ok || !result.reply) {
      console.error(
        `[generateAiTicketReply] AI yanıtı üretilemedi: ${result.error}\nDenemeler: ${result.toolTrace.join(" | ")}`
      );
      return { ok: false, error: result.error || "AI yanıtı üretilemedi. Sağlayıcı geçici olarak yoğun olabilir, kısa süre sonra tekrar deneyin." };
    }

    return { ok: true, reply: result.reply };
  } catch (err) {
    console.error("[generateAiTicketReply] Hata:", err);
    return { ok: false, error: err instanceof Error ? err.message : "AI yanıt hatası" };
  }
}
