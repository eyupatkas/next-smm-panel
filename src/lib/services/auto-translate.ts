import { db } from "@/lib/db";

async function getDeepSeekConfig() {
  const provider = await db.aiProvider.findUnique({
    where: { slug: "deepseek" }
  });
  let apiKey = "";
  if (provider && Array.isArray(provider.apiKeys) && provider.apiKeys.length > 0) {
    apiKey = provider.apiKeys[0] as string;
  } else {
    apiKey = process.env.DEEPSEEK_API_KEY || "";
  }
  return {
    apiKey,
    model: provider?.model || "deepseek-flash"
  };
}

async function callDeepSeek(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} - ${text}`);
  }
  
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function autoTranslateMissingDatabaseContents() {
  try {
    const config = await getDeepSeekConfig();
    if (!config.apiKey) {
      console.warn("[auto-translate] DeepSeek API Key bulunamadı, çeviri pas geçildi.");
      return;
    }

    // 1. Kategoriler
    const allCategories = await db.category.findMany({ where: { status: true } });
    const missingCategories = allCategories.filter(c => {
      if (!c.translations) return true;
      try {
        return Object.keys(c.translations as any).length === 0;
      } catch {
        return true;
      }
    });

    if (missingCategories.length > 0) {
      console.log(`[auto-translate] ${missingCategories.length} adet kategori çevriliyor...`);
      const payload = missingCategories.slice(0, 15).map(c => ({ id: c.id, name: c.name }));
      
      const systemPrompt = "Sen profesyonel bir çeviri botusun. Görevin, verilen Türkçe kategori isimlerini en (İngilizce), de (Almanca), ar (Arapça), ru (Rusça), es (İspanyolca), fr (Fransızca), it (İtalyanca), ja (Japonca), ko (Korece), pt (Portekizce) ve zh (Çince) dillerine çevirip geçerli bir JSON objesi döndürmektir.";
      const userPrompt = `Aşağıdaki kategori isimlerini en, de, ar, ru, es, fr, it, ja, ko, pt, zh dillerine çevir ve şu formatta JSON döndür:
{
  "results": [
    {
      "id": "kategori_id",
      "en": { "name": "English Category Name" },
      "de": { "name": "German Category Name" },
      "ar": { "name": "Arabic Category Name" },
      "ru": { "name": "Russian Category Name" },
      "es": { "name": "Spanish Category Name" },
      "fr": { "name": "French Category Name" },
      "it": { "name": "Italian Category Name" },
      "ja": { "name": "Japanese Category Name" },
      "ko": { "name": "Korean Category Name" },
      "pt": { "name": "Portuguese Category Name" },
      "zh": { "name": "Chinese Category Name" }
    }
  ]
}

Çevrilecekler:
${JSON.stringify(payload, null, 2)}`;

      const reply = await callDeepSeek(config.apiKey, config.model, systemPrompt, userPrompt);
      const data = JSON.parse(reply);
      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          await db.category.update({
            where: { id: item.id },
            data: {
              translations: {
                en: item.en,
                de: item.de,
                ar: item.ar,
                ru: item.ru,
                es: item.es,
                fr: item.fr,
                it: item.it,
                ja: item.ja,
                ko: item.ko,
                pt: item.pt,
                zh: item.zh,
              } as any
            }
          });
        }
      }
    }

    // 2. Paketler
    const allPackages = await db.package.findMany({ where: { status: true } });
    const missingPackages = allPackages.filter(p => {
      if (!p.translations) return true;
      try {
        return Object.keys(p.translations as any).length === 0;
      } catch {
        return true;
      }
    });

    if (missingPackages.length > 0) {
      console.log(`[auto-translate] ${missingPackages.length} adet paket çevriliyor...`);
      const payload = missingPackages.slice(0, 15).map(p => ({ id: p.id, name: p.name, description: p.description }));
      
      const systemPrompt = "Sen profesyonel bir çeviri botusun. Görevin, verilen Türkçe paket isimlerini ve açıklamalarını en (İngilizce), de (Almanca), ar (Arapça), ru (Rusça), es (İspanyolca), fr (Fransızca), it (İtalyanca), ja (Japonca), ko (Korece), pt (Portekizce) ve zh (Çince) dillerine çevirip geçerli bir JSON döndürmektir.";
      const userPrompt = `Aşağıdaki paketleri en, de, ar, ru, es, fr, it, ja, ko, pt, zh dillerine çevir ve şu formatta JSON döndür:
{
  "results": [
    {
      "id": "paket_id",
      "en": { "name": "English Name", "description": "English Desc" },
      "de": { "name": "German Name", "description": "German Desc" },
      "ar": { "name": "Arabic Name", "description": "Arabic Desc" },
      "ru": { "name": "Russian Name", "description": "Russian Desc" },
      "es": { "name": "Spanish Name", "description": "Spanish Desc" },
      "fr": { "name": "French Name", "description": "French Desc" },
      "it": { "name": "Italian Name", "description": "Italian Desc" },
      "ja": { "name": "Japanese Name", "description": "Japanese Desc" },
      "ko": { "name": "Korean Name", "description": "Korean Desc" },
      "pt": { "name": "Portuguese Name", "description": "Portuguese Desc" },
      "zh": { "name": "Chinese Name", "description": "Chinese Desc" }
    }
  ]
}

Çevrilecekler:
${JSON.stringify(payload, null, 2)}`;

      const reply = await callDeepSeek(config.apiKey, config.model, systemPrompt, userPrompt);
      const data = JSON.parse(reply);
      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          await db.package.update({
            where: { id: item.id },
            data: {
              translations: {
                en: item.en,
                de: item.de,
                ar: item.ar,
                ru: item.ru,
                es: item.es,
                fr: item.fr,
                it: item.it,
                ja: item.ja,
                ko: item.ko,
                pt: item.pt,
                zh: item.zh,
              } as any
            }
          });
        }
      }
    }

    // 3. Servisler
    const allServices = await db.service.findMany({ where: { status: true } });
    const missingServices = allServices.filter(s => {
      if (!s.translations) return true;
      try {
        return Object.keys(s.translations as any).length === 0;
      } catch {
        return true;
      }
    }).slice(0, 30);

    if (missingServices.length > 0) {
      console.log(`[auto-translate] ${missingServices.length} adet servis çevriliyor...`);
      const payload = missingServices.map(s => ({ id: s.id, name: s.name }));
      
      const systemPrompt = "Sen profesyonel bir SMM servis ismi çeviri botusun. Görevin, verilen Türkçe servis isimlerini en (İngilizce), de (Almanca), ar (Arapça), ru (Rusça), es (İspanyolca), fr (Fransızca), it (İtalyanca), ja (Japonca), ko (Korece), pt (Portekizce) ve zh (Çince) dillerine çevirip geçerli bir JSON döndürmektir.";
      const userPrompt = `Aşağıdaki servis isimlerini en, de, ar, ru, es, fr, it, ja, ko, pt, zh dillerine çevir ve şu formatta JSON döndür:
{
  "results": [
    {
      "id": "servis_id",
      "en": { "name": "English Service Name" },
      "de": { "name": "German Service Name" },
      "ar": { "name": "Arabic Service Name" },
      "ru": { "name": "Russian Service Name" },
      "es": { "name": "Spanish Service Name" },
      "fr": { "name": "French Service Name" },
      "it": { "name": "Italian Service Name" },
      "ja": { "name": "Japanese Service Name" },
      "ko": { "name": "Korean Service Name" },
      "pt": { "name": "Portuguese Service Name" },
      "zh": { "name": "Chinese Service Name" }
    }
  ]
}

Çevrilecekler:
${JSON.stringify(payload, null, 2)}`;

      const reply = await callDeepSeek(config.apiKey, config.model, systemPrompt, userPrompt);
      const data = JSON.parse(reply);
      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          await db.service.update({
            where: { id: item.id },
            data: {
              translations: {
                en: item.en,
                de: item.de,
                ar: item.ar,
                ru: item.ru,
                es: item.es,
                fr: item.fr,
                it: item.it,
                ja: item.ja,
                ko: item.ko,
                pt: item.pt,
                zh: item.zh,
              } as any
            }
          });
        }
      }
    }

  } catch (error) {
    console.error("[auto-translate] Otomatik çeviri hatası:", error);
  }
}
