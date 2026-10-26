import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const { profileUrl } = body;

    if (!profileUrl || typeof profileUrl !== "string") {
      return NextResponse.json({ error: "Lütfen geçerli bir profil linki girin." }, { status: 400 });
    }

    // Rate limit kontrolü
    if (rateLimit(`profile-audit:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Saatlik ücretsiz analiz limitine ulaştınız. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    }

    // Platform ve kullanıcı adını ayrıştırma
    let platform = "instagram";
    let username = "kullanici";

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(profileUrl.startsWith("http") ? profileUrl : `https://${profileUrl}`);
    } catch {
      return NextResponse.json({ error: "Geçerli bir profil bağlantısı girin." }, { status: 400 });
    }
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    const allowedHosts = ["instagram.com", "tiktok.com", "youtube.com", "youtu.be"];
    if (!allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
      return NextResponse.json({ error: "Yalnızca desteklenen sosyal medya bağlantıları kullanılabilir." }, { status: 400 });
    }

    const urlLower = parsedUrl.href.toLowerCase();
    if (urlLower.includes("tiktok.com")) {
      platform = "tiktok";
      const parts = profileUrl.split("tiktok.com/@");
      username = parts[1] ? parts[1].split(/[?#/]/)[0] : "user";
    } else if (urlLower.includes("youtube.com")) {
      platform = "youtube";
      const parts = profileUrl.split("youtube.com/");
      username = parts[1] ? parts[1].split(/[?#/]/)[0] : "channel";
    } else {
      // Varsayılan instagram
      const parts = profileUrl.split("instagram.com/");
      username = parts[1] ? parts[1].split(/[?#/]/)[0] : "user";
    }
    username = username.replace(/[^\p{L}\p{N}._@-]/gu, "").slice(0, 64) || "user";

    // Gemini API bilgilerini çekme
    const settings = await getSettings(["blog_ai_api_key", "blog_ai_model"]);
    const apiKey = settings.blog_ai_api_key || process.env.GEMINI_API_KEY;
    const modelName = settings.blog_ai_model || "gemini-3.8-flash";

    if (!apiKey) {
      return NextResponse.json({ error: "Yapay zeka modülü şu an aktif değil." }, { status: 503 });
    }

    // Gemini API çağrısı
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Sen profesyonel bir sosyal medya büyüme uzmanı ve analistisin.
Aşağıdaki sosyal medya profilini analiz et:
Platform: ${platform}
Kullanıcı Adı: ${username}

Lütfen aşağıdaki kurallara göre detaylı, gerçekçi ve yapıcı bir analiz raporu sun:
1. 100 üzerinden bir "Profil Gücü Skoru" belirle (Profil adı, bio vb. kriterlere göre tahmini bir skor).
2. "bioEvaluation" alanında: Bio (özgeçmiş) metninin etkililiğini analiz et ve daha iyi bir bio için 2 alternatif öneri sun.
3. "contentStrategy" alanında: Ne tür reels/post/video paylaşması gerektiğine dair 3 adet spesifik içerik fikri ver.
4. "engagementAnalysis" alanında: Profilin tahmini etkileşim durumunu (beğeni/takipçi dengesi) yorumla.

Yanıtını SADECE Türkçe olarak ve SADECE şu JSON formatında ver, başka hiçbir şey ekleme:
{
  "score": 75,
  "bioEvaluation": "Mevcut bio net ancak harekete geçirici mesaj (CTA) eksik. Şık bir link veya ücretsiz teklif eklenebilir.",
  "bioSuggestions": [
    "✨ Sosyal Medya Büyüme Uzmanı | İşletmenizi ölçeklendirin\\n👇 Ücretsiz rehberi indirin:",
    "🚀 Dijital Stratejist & Mentor\\n📈 Markanızı uçuşa geçirin\\n✉️ İş birlikleri için DM:"
  ],
  "contentStrategy": [
    "Haftada en az 3 reels videosu paylaşın. İlk 3 saniyede kanca (hook) kullanın.",
    "Kullanıcıların en çok sorduğu soruları yanıtlayan SSS formatında postlar hazırlayın.",
    "Sektörünüzle ilgili kamera arkası veya süreç videoları paylaşarak samimiyet kurun."
  ],
  "engagementAnalysis": "Takipçi sayınıza oranla beğeni sayınız biraz düşük kalıyor. Hikaye anketleri ve soru-cevap çıkartmaları ile etkileşimi tetikleyin."
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI yanıtından JSON çıkarılamadı.");
    }

    const aiReport = JSON.parse(jsonMatch[0]);

    // Platforma göre veritabanından en popüler ve aktif 3 adet servisi çekme
    const recommendedServices = await db.service.findMany({
      where: {
        status: true,
        OR: [
          { name: { contains: platform, mode: "insensitive" } },
          { category: { name: { contains: platform, mode: "insensitive" } } }
        ]
      },
      select: {
        id: true,
        name: true,
        retailPrice: true,
        min: true,
        max: true,
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        completedOrderCount: "desc"
      },
      take: 3
    });

    return NextResponse.json({
      success: true,
      platform,
      username,
      report: aiReport,
      recommendedServices
    });

  } catch (error) {
    console.error("[profile-audit-api] Error:", error);
    return NextResponse.json({
      error: "Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin."
    }, { status: 500 });
  }
}
