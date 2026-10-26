/**
 * Referrer URL veya kaynak kodundan temiz, okunabilir marka/kaynak adı üretir.
 */
export function parseSource(referrer: string | null | undefined): string {
  if (!referrer || referrer === "null" || referrer === "undefined") {
    return "Direkt / Bilinmiyor";
  }

  const raw = referrer.trim();
  if (!raw) return "Direkt / Bilinmiyor";

  // Google OAuth girişi
  if (raw === "google_oauth") {
    return "Google OAuth";
  }

  // UTM veya özel etiketler
  if (raw.startsWith("utm:") || raw.startsWith("source:")) {
    return raw.replace(/^(utm:|source:)/, "");
  }

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      
      // İç bağlantılar (kendi sitemiz) direkt/bilinmiyor sayılır
      if (
        host.includes("optismm.com") ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0"
      ) {
        return "Direkt / Bilinmiyor";
      }

      // Arama Motorları & Reklam Platformları
      if (host.includes("google")) return "Google";
      if (host.includes("bing")) return "Bing";
      if (host.includes("yandex")) return "Yandex";
      if (host.includes("yahoo")) return "Yahoo";
      if (host.includes("duckduckgo")) return "DuckDuckGo";
      if (host.includes("baidu")) return "Baidu";

      // Sosyal Medya
      if (host.includes("facebook") || host.includes("fb.com") || host.includes("m.facebook.com")) return "Facebook";
      if (host.includes("instagram") || host.includes("l.instagram.com")) return "Instagram";
      if (host.includes("tiktok")) return "TikTok";
      if (host.includes("twitter") || host.includes("t.co") || host.includes("x.com")) return "Twitter / X";
      if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
      if (host.includes("reddit")) return "Reddit";
      if (host.includes("pinterest")) return "Pinterest";
      if (host.includes("linkedin")) return "LinkedIn";
      if (host.includes("snapchat")) return "Snapchat";

      // Mesajlaşma / İletişim
      if (host.includes("telegram") || host.includes("t.me")) return "Telegram";
      if (host.includes("whatsapp") || host.includes("wa.me") || host.includes("api.whatsapp.com")) return "WhatsApp";

      // Popüler Türkiye Forumları & Haber / Teknoloji Siteleri
      if (host.includes("donanimhaber")) return "DonanımHaber";
      if (host.includes("technopat")) return "Technopat";
      if (host.includes("r10")) return "R10.net";
      if (host.includes("turkmmo")) return "TurkMMO";
      if (host.includes("eksisozluk") || host.includes("eksi.is")) return "Ekşi Sözlük";
      if (host.includes("kizlarsoruyor")) return "KızlarSoruyor";
      if (host.includes("sikayetvar")) return "Şikayetvar";
      if (host.includes("webtekno")) return "Webtekno";
      if (host.includes("shiftdelete")) return "ShiftDelete";
      if (host.includes("wbmysql") || host.includes("wmgraph") || host.includes("wmaraci")) return "WM Aracı";
      if (host.includes("paytr")) return "PayTR";

      // Diğer tüm harici alan adlarını sade göster
      return host;
    }
    return raw;
  } catch {
    return "Direkt / Bilinmiyor";
  }
}
