import { db } from "@/lib/db";
import { callDeepSeekAgent } from "./deepseek";
import { BLOG_TRANSLATE_LANGS } from "@/lib/blog-constants";
import type { BlogLangStatus } from "@/lib/blog-posts";

export type SeoAgentResult = {
  success: boolean;
  message: string;
  createdPostId?: string;
  generatedTopics: string[];
  logs: string[];
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Otonom SEO ve Blog İçerik Ajanı.
 * Konu havuzunu denetler; boşalmışsa DeepSeek ile yeni SEO konuları üretir.
 * Sıradaki konuyu kullanarak makaleyi yazar ve diğer dillerde çevrilmesi için sıraya ekler.
 */
export async function runAutonomousSeoAgent(): Promise<SeoAgentResult> {
  const logs: string[] = [];
  const generatedTopics: string[] = [];
  let createdPostId: string | undefined;

  try {
    // 1. Kullanılmamış konuları kontrol et
    let topic = await db.blogTopic.findFirst({
      where: { used: false },
      orderBy: { createdAt: "asc" },
    });

    // 2. Havuz boşsa otonom olarak yeni konular üret
    if (!topic) {
      logs.push("[SEO Agent] Konu havuzu boş. DeepSeek ile yeni konu başlıkları üretiliyor...");

      const existingTopics = await db.blogTopic.findMany({ select: { title: true } });
      const existingTitles = existingTopics.map((t) => t.title).join(", ");

      const systemPrompt = `Sen bir sosyal medya pazarlaması (SMM) uzmanı ve SEO editörüsün. SMM paneli blogu için 5 adet özgün, ilgi çekici ve Google'da aranma hacmi yüksek Türkçe konu başlığı üretmelisin.
Konular Instagram, TikTok, YouTube, Twitter/X büyüme taktikleri, sosyal medya algoritmaları ve SMM paneli faydaları ile ilgili olmalıdır.
Yanıtını SADECE JSON formatında bir dizi olarak döndür (başka hiçbir şey ekleme):
["Konu 1", "Konu 2", "Konu 3", "Konu 4", "Konu 5"]`;

      const userPrompt = existingTitles
        ? `Bu konular sistemde zaten mevcut, bunlardan tamamen farklı ve özgün konular öner:\n${existingTitles.slice(0, 500)}`
        : "Lütfen en popüler sosyal medya büyüme trendlerine göre 5 adet konu başlığı öner.";

      const dsRes = await callDeepSeekAgent({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.7, // Konu üretimi için yaratıcılığı hafifçe artırıyoruz
      });

      if (dsRes.ok && dsRes.content) {
        try {
          const parsed = JSON.parse(dsRes.content) as string[];
          const validTopics = parsed.filter((t) => typeof t === "string" && t.trim());

          for (const tTitle of validTopics) {
            const created = await db.blogTopic.create({
              data: { title: tTitle.trim(), used: false },
            });
            generatedTopics.push(created.title);
          }

          logs.push(`  ✓ Havuza ${generatedTopics.length} yeni konu eklendi: ${generatedTopics.join(", ")}`);
          
          // Yeni eklenen konulardan ilkini seç
          topic = await db.blogTopic.findFirst({
            where: { used: false },
            orderBy: { createdAt: "asc" },
          });
        } catch (parseErr) {
          logs.push(`  • Konu listesi JSON ayrıştırılamadı: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
        }
      } else {
        logs.push(`  • Konu üretimi başarısız oldu: ${dsRes.error || "Boş yanıt"}`);
      }
    }

    if (!topic) {
      return {
        success: false,
        message: "Konu havuzu doldurulamadı. SEO Ajanı durduruldu.",
        generatedTopics,
        logs,
      };
    }

    // 3. Konu başlığına göre DeepSeek ile Türkçe makale yaz
    logs.push(`[SEO Agent] Seçilen konu başlığıyla makale yazılıyor: "${topic.title}"`);

    const systemPrompt = `Sen profesyonel bir Türkçe içerik yazarı ve SEO uzmanısın. Sosyal medya pazarlama (SMM) paneli hakkında bilgilendirici blog yazıları yazıyorsun.
Aşağıdaki konu hakkında kapsamlı ve akıcı bir blog yazısı yaz:
Konu: ${topic.title}

Kurallar:
- SEO uyumlu, alt başlıkları ## ile işaretlenmiş, en az 800 kelimelik bir makale olsun.
- "OptiSMM" marka adını makale içinde doğal bir şekilde geçir.
- HTML etiketleri kullanma, düz metin yaz.
- Yanıtını SADECE şu JSON formatında döndür (başka hiçbir metin veya markdown çitleri ekleme):
{"title": "SEO Uyumlu Başlık", "excerpt": "1-2 cümlelik kısa özet", "content": "Ana makale içeriği"}`;

    const userPrompt = `Lütfen "${topic.title}" konusu için makaleyi oluştur.`;

    const dsRes = await callDeepSeekAgent({
      systemPrompt,
      userPrompt,
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 3000,
    });

    if (dsRes.ok && dsRes.content) {
      try {
        const parsed = JSON.parse(dsRes.content) as {
          title: string;
          excerpt: string;
          content: string;
        };

        if (!parsed.title || !parsed.content) {
          throw new Error("DeepSeek yanıtında title veya content eksik.");
        }

        // Slug oluştur ve çakışmayı önle
        const baseSlug = slugify(parsed.title);
        const existing = await db.blogPost.count({ where: { slug: { startsWith: baseSlug } } });
        const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

        // Tüm hedef dilleri "pending" olarak işaretle (çeviri kuyruğu için)
        const initialLangStatus: BlogLangStatus = Object.fromEntries(
          BLOG_TRANSLATE_LANGS.map((l) => [l, "pending"])
        );

        // Blog postunu oluştur
        const post = await db.blogPost.create({
          data: {
            title: parsed.title,
            slug,
            excerpt: parsed.excerpt || "",
            content: parsed.content,
            published: true,
            featured: false,
            publishedAt: new Date(),
            langStatus: initialLangStatus as never,
            translations: {},
          },
        });

        createdPostId = post.id;

        // Konuyu kullanıldı olarak işaretle
        await db.blogTopic.update({
          where: { id: topic.id },
          data: { used: true, usedAt: new Date() },
        });

        logs.push(`  ✓ BAŞARILI: "${parsed.title}" başlığıyla yeni makale yayınlandı. ${BLOG_TRANSLATE_LANGS.length} dilde çeviri sıraya alındı.`);
      } catch (parseErr) {
        logs.push(`  • Makale içeriği JSON ayrıştırılamadı: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
      }
    } else {
      logs.push(`  • Makale üretimi başarısız oldu: ${dsRes.error || "Boş yanıt"}`);
    }

    return {
      success: createdPostId !== undefined,
      message: createdPostId ? `SEO Ajanı tamamlandı. Bilet ID: ${createdPostId}` : "SEO Ajanı makale üretemedi.",
      createdPostId,
      generatedTopics,
      logs,
    };
  } catch (error) {
    console.error("[SEO Agent Error]:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "SEO Ajanı hatası.",
      generatedTopics,
      logs: [...logs, `HATA: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
