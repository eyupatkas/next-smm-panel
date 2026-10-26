import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL tanimli degil.");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const DEFAULT_PACKAGE_QUANTITIES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
const VIEW_PACKAGE_QUANTITIES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const COMMENT_PACKAGE_QUANTITIES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const SUBSCRIBER_PACKAGE_QUANTITIES = [100, 250, 500, 1000, 2500, 5000, 10000];
const MAX_SERVICE_PRICE_PER_1000 = 1500;

const HOMEPAGE_TARGETS = new Set([
  "instagram-followers-2",
  "instagram-likes-2",
  "tiktok-followers-2",
  "tiktok-likes-2",
  "youtube-subscribers-2",
  "youtube-likes-2",
  "twitter-followers-2",
  "telegram-general",
]);

const MIN_SELLABLE_QUANTITY: Record<string, number> = {
  followers: 100, likes: 100, shares: 100, comments: 10,
  subscribers: 100, members: 1000, views: 100,
};

/* --- Akilli Fiyatlandirma --- */

function getSmartMarkup(baseCost: number): { retail: number; reseller: number } {
  if (baseCost <= 2)   return { retail: 500, reseller: 250 };
  if (baseCost <= 5)   return { retail: 450, reseller: 225 };
  if (baseCost <= 10)  return { retail: 400, reseller: 200 };
  if (baseCost <= 25)  return { retail: 350, reseller: 175 };
  if (baseCost <= 50)  return { retail: 300, reseller: 150 };
  if (baseCost <= 100) return { retail: 250, reseller: 125 };
  if (baseCost <= 200) return { retail: 200, reseller: 100 };
  if (baseCost <= 500) return { retail: 150, reseller: 75 };
  return { retail: 100, reseller: 50 };
}

function roundUpTo90(value: number) {
  if (value <= 0) return 0.9;
  const integerPart = Math.floor(value);
  const decimalPart = Number((value - integerPart).toFixed(2));
  if (decimalPart === 0.9) return Number(value.toFixed(2));
  if (decimalPart < 0.9) return Number((integerPart + 0.9).toFixed(2));
  return Number((integerPart + 1 + 0.9).toFixed(2));
}

const MIN_RETAIL_PRICE = 4.9;
const MIN_RESELLER_PRICE = 2.9;
const PROGRESSIVE_STEP = 1.0; // TL per quantity doubling — ensures distinct prices per tier

function computeRetailPrice(baseCost: number, quantity?: number, baseQuantity?: number) {
  const { retail } = getSmartMarkup(baseCost);
  const raw = roundUpTo90(baseCost * (1 + retail / 100));
  if (quantity && baseQuantity && quantity > baseQuantity) {
    const progressiveMin = roundUpTo90(MIN_RETAIL_PRICE + Math.log2(quantity / baseQuantity) * PROGRESSIVE_STEP);
    return Math.max(raw, progressiveMin);
  }
  return Math.max(raw, MIN_RETAIL_PRICE);
}

function computeResellerPrice(baseCost: number, quantity?: number, baseQuantity?: number) {
  const { reseller } = getSmartMarkup(baseCost);
  const raw = roundUpTo90(baseCost * (1 + reseller / 100));
  if (quantity && baseQuantity && quantity > baseQuantity) {
    const progressiveMin = roundUpTo90(MIN_RESELLER_PRICE + Math.log2(quantity / baseQuantity) * PROGRESSIVE_STEP);
    return Math.max(raw, progressiveMin);
  }
  return Math.max(raw, MIN_RESELLER_PRICE);
}

/* --- Helpers --- */

type CategoryRow = {
  id: string; slug: string | null; name: string;
  parent: { id: string; slug: string | null; name: string } | null;
};

function formatQuantity(quantity: number) {
  return quantity.toLocaleString("tr-TR");
}

function detectServiceKind(categorySlug: string | null, categoryName: string, serviceName: string) {
  if (categorySlug?.includes("-comments")) return "comments";
  if (categorySlug?.includes("-likes") || categorySlug?.includes("-reactions")) return "likes";
  if (categorySlug?.includes("-followers")) return "followers";
  if (categorySlug?.includes("-subscribers")) return "subscribers";
  if (categorySlug?.includes("-members")) return "members";
  if (categorySlug?.includes("-shares") || categorySlug?.includes("-retweets")) return "shares";
  if (categorySlug?.includes("-views") || categorySlug?.includes("-watchtime") ||
      categorySlug?.includes("-story") || categorySlug?.includes("-reels") ||
      categorySlug?.includes("-live") || categorySlug?.includes("-reel")) return "views";
  if (categorySlug?.includes("-auto")) return "auto";
  if (categorySlug?.includes("-impressions")) return "impressions";
  if (categorySlug?.includes("-mentions")) return "mentions";
  if (categorySlug?.includes("-votes")) return "votes";
  if (categorySlug?.includes("-traffic")) return "traffic";

  const combined = `${categorySlug ?? ""} ${categoryName} ${serviceName}`.toLocaleLowerCase("tr");
  if (combined.includes("story") || combined.includes("hikaye") || combined.includes("reel") || combined.includes("live")) return "views";
  if (combined.includes("view") || combined.includes("izlenme") || combined.includes("watch")) return "views";
  if (combined.includes("share") || combined.includes("retweet") || combined.includes("repost")) return "shares";
  if (combined.includes("like") || combined.includes("begeni")) return "likes";
  if (combined.includes("subscriber") || combined.includes("abone")) return "subscribers";
  if (combined.includes("member") || combined.includes("uye")) return "members";
  if (combined.includes("comment") || combined.includes("yorum")) return "comments";
  if (combined.includes("traffic") || combined.includes("trafik")) return "traffic";
  return "followers";
}

function getPreferredQuantities(serviceKind: string) {
  if (serviceKind === "comments") return COMMENT_PACKAGE_QUANTITIES;
  if (serviceKind === "subscribers") return SUBSCRIBER_PACKAGE_QUANTITIES;
  if (serviceKind === "views" || serviceKind === "impressions" || serviceKind === "traffic") return VIEW_PACKAGE_QUANTITIES;
  return DEFAULT_PACKAGE_QUANTITIES;
}

function clampQuantities(min: number, max: number, preferredQuantities: number[]) {
  const filtered = preferredQuantities.filter((q) => q >= min && q <= max);
  if (filtered.length > 0) return filtered;
  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
    return [min, Math.min(Math.max(Math.round((min + max) / 2), min), max), max]
      .filter((q, i, arr) => q > 0 && arr.indexOf(q) === i)
      .sort((a, b) => a - b);
  }
  return [] as number[];
}

function filterSellableQuantities(quantities: number[], serviceKind: string) {
  const minSellable = MIN_SELLABLE_QUANTITY[serviceKind] ?? 100;
  return quantities.filter((q) => q >= minSellable);
}

function buildPackageName(platformName: string, categoryName: string, quantity: number, serviceKind: string) {
  const normP = platformName.trim();
  const normC = categoryName.trim();
  let label = normC.toLocaleLowerCase("tr").includes(normP.toLocaleLowerCase("tr"))
    ? normC : `${normP} ${normC}`;
  if (serviceKind === "views" || serviceKind === "impressions" || serviceKind === "traffic") {
    label = `${label} Paketi`;
  }
  return `${formatQuantity(quantity)} ${label}`;
}

/* --- Platform + Kategori Bazli Ozel Aciklamalar --- */

type DescFn = (qty: number) => string;
const D: Record<string, DescFn> = {
  "instagram-followers": (q) => [
    `${formatQuantity(q)} gercek gorunumlu Instagram takipcisi`,
    "Organik profil gorunumu ile hesap guvenligi korunur",
    "Kademeli teslimat ile dogal buyume saglanir",
    "Dusus durumunda 30 gun telafi garantisi",
    "Siparis sonrasi 0-2 saat icinde teslimat baslar",
    "7/24 canli destek ile guvenli alisveris",
  ].join("\n"),
  "instagram-likes": (q) => [
    `${formatQuantity(q)} Instagram begeni`,
    "Gonderilerinizin kesfet sayfasina cikma sansini artirir",
    "Hizli teslimat ile etkilesim oraninizi yukseltir",
    "Tum gonderi turleri icin uygundur (fotograf, video, carousel)",
    "Bot hesap kullanilmaz, kaliteli etkilesim",
    "Dakikalar icinde baslar",
  ].join("\n"),
  "instagram-views": (q) => [
    `${formatQuantity(q)} Instagram izlenme`,
    "Reels, hikaye ve video gonderileriniz icin gecerlidir",
    "Icerik gorunurlugunu artirarak daha genis kitleye ulastirir",
    "Kesfet algoritmasinda one cikmanizi destekler",
    "Aninda teslimat baslar",
    "Tum hesap turleri icin uygundur",
  ].join("\n"),
  "instagram-comments": (q) => [
    `${formatQuantity(q)} Instagram yorum`,
    "Gercek gorunumlu, anlamli yorumlar ile etkilesim guclenir",
    "Gonderi guvenilirligini ve sosyal kaniti artirir",
    "Ozel yorum secenekleri mevcut (rastgele veya ozel)",
    "1-12 saat icinde teslimat tamamlanir",
    "Profesyonel hesaplar icin ideal",
  ].join("\n"),
  "instagram-shares": (q) => [
    `${formatQuantity(q)} Instagram paylasim/kaydetme`,
    "Gonderilerinizin daha fazla kisiye ulasmasini saglar",
    "Kaydetme orani kesfet algoritmasini olumlu etkiler",
    "Organik gorunumlu paylasim artisi",
    "Hizli ve guvenli teslimat",
    "Tum icerik turleri icin uygun",
  ].join("\n"),
  "instagram-auto": (q) => [
    `${formatQuantity(q)} otomatik Instagram etkilesim`,
    "Yeni gonderilerinize otomatik begeni/izlenme gelir",
    "Hesabinizi surekli aktif ve guncel tutar",
    "Ayarlanabilir hiz ve miktar secenekleri",
    "Abonelik suresi boyunca kesintisiz calisir",
    "Icerik ureticileri icin idealdir",
  ].join("\n"),
  "instagram-impressions": (q) => [
    `${formatQuantity(q)} Instagram gosterim/erisim`,
    "Profilinizin ve gonderilerinizin erisim istatistiklerini yukseltir",
    "Kesfet ve onerilen icerikler bolumunde gorunme sansinizi artirir",
    "Marka bilinirligini olusturmak icin etkili",
    "Aninda teslimat baslar",
    "Isletme ve icerik uretici hesaplari icin uygun",
  ].join("\n"),
  "instagram-mentions": (q) => [
    `${formatQuantity(q)} Instagram mention/etiketleme`,
    "Hedef kitlenize dogrudan ulasim saglar",
    "Profilinize yonlendirme trafigi olusturur",
    "Organik takipci kazanimini destekler",
    "Hizli teslimat garantisi",
    "Influencer ve marka hesaplari icin idealdir",
  ].join("\n"),

  "tiktok-followers": (q) => [
    `${formatQuantity(q)} TikTok takipci`,
    "Hesap guvenilirligini artirarak viral olma sansinizi yukseltir",
    "Kademeli teslimat ile profil guvenligi korunur",
    "Dusus durumunda 30 gun telafi garantisi",
    "Siparis sonrasi 0-1 saat icinde baslar",
    "TikTok algoritmasi dostu teslimat",
  ].join("\n"),
  "tiktok-likes": (q) => [
    `${formatQuantity(q)} TikTok begeni`,
    "FYP (For You Page) algoritmasinda one cikmanizi saglar",
    "Viral potansiyelinizi artirir",
    "Hizli ve guvenli begeni teslimati",
    "Tum video icerikleri icin gecerlidir",
    "Dakikalar icinde teslimat baslar",
  ].join("\n"),
  "tiktok-views": (q) => [
    `${formatQuantity(q)} TikTok izlenme`,
    "TikTok algoritmasinda video siralamanizi yukseltir",
    "FYP'de daha fazla gosterilme sansi saglar",
    "Tum video formatlari icin gecerlidir",
    "Ultra hizli teslimat",
    "Icerik ureticileri ve markalar icin idealdir",
  ].join("\n"),
  "tiktok-comments": (q) => [
    `${formatQuantity(q)} TikTok yorum`,
    "Video etkilesim oraninizi ciddi sekilde artirir",
    "TikTok algoritmasinin dikkatini ceker",
    "Gercek gorunumlu, anlamli yorumlar",
    "1-6 saat icinde tamamlanir",
    "Viral video stratejinizi destekler",
  ].join("\n"),
  "tiktok-shares": (q) => [
    `${formatQuantity(q)} TikTok paylasim`,
    "Videonuzun daha genis kitleye ulasmasini saglar",
    "Viral algoritma icin guclu sinyal olusturur",
    "Organik buyumeyi destekler",
    "Hizli teslimat garantisi",
    "Tum video icerikleri icin uygun",
  ].join("\n"),

  "youtube-subscribers": (q) => [
    `${formatQuantity(q)} YouTube abone`,
    "Kanal guvenilirligi ve otorite olusturur",
    "YouTube Partner Programi hedeflerinize yaklastirir",
    "Kademeli teslimat ile kanal guvenligi korunur",
    "Dusus durumunda 30 gun telafi garantisi",
    "Siparis sonrasi 0-6 saat icinde baslar",
  ].join("\n"),
  "youtube-likes": (q) => [
    `${formatQuantity(q)} YouTube begeni`,
    "Video siralamasini ve arama sonuclarini olumlu etkiler",
    "Izleyici guvenini artirir",
    "YouTube algoritmasinda one cikmanizi saglar",
    "Hizli ve organik gorunumlu teslimat",
    "Tum video turleri icin uygundur",
  ].join("\n"),
  "youtube-views": (q) => [
    `${formatQuantity(q)} YouTube izlenme`,
    "Video gucunu artirarak arama sonuclarinda ust siralara tasir",
    "Monetizasyon esigine ulasmanizi hizlandirir",
    "Organik izlenme kaliplarina uygun teslimat",
    "Gercek izlenme suresi ile tamamlanir",
    "Tum video kategorileri icin gecerlidir",
  ].join("\n"),
  "youtube-comments": (q) => [
    `${formatQuantity(q)} YouTube yorum`,
    "Video etkilesim oranini yukseltir",
    "Izleyici toplulugu olusturmaniza yardimci olur",
    "Gercek gorunumlu, anlamli yorumlar",
    "Arama ve oneriler algoritmasini destekler",
    "1-12 saat icinde teslimat",
  ].join("\n"),
  "youtube-shares": (q) => [
    `${formatQuantity(q)} YouTube paylasim`,
    "Videonuzun sosyal medyada yayilmasini saglar",
    "YouTube algoritmasinda guclu sinyal olusturur",
    "Organik kesfedilebilirligi artirir",
    "Hizli teslimat",
    "Tum video icerikleri icin uygun",
  ].join("\n"),

  "twitter-followers": (q) => [
    `${formatQuantity(q)} Twitter/X takipci`,
    "Hesap otoritesini ve guvenilirligini artirir",
    "Organik profil gorunumu ile guvenli buyume",
    "Kademeli teslimat ile hesap guvenligi korunur",
    "Dusus durumunda telafi garantisi",
    "0-2 saat icinde teslimat baslar",
  ].join("\n"),
  "twitter-likes": (q) => [
    `${formatQuantity(q)} Twitter/X begeni`,
    "Tweet etkilesim oranini artirir",
    "Trend ve kesfet bolumlerinde gorunurluk saglar",
    "Hizli ve guvenli teslimat",
    "Tum tweet turleri icin gecerlidir",
    "Dakikalar icinde baslar",
  ].join("\n"),
  "twitter-shares": (q) => [
    `${formatQuantity(q)} Twitter/X retweet/paylasim`,
    "Tweet erisiminizi katlar ve viral yayilim saglar",
    "Hashtag trendlerinde one cikmaniza yardim eder",
    "Organik gorunumlu retweet teslimati",
    "Hizli ve guvenli islem",
    "Marka ve influencer hesaplari icin idealdir",
  ].join("\n"),
  "twitter-comments": (q) => [
    `${formatQuantity(q)} Twitter/X yorum/yanit`,
    "Tweet etkilesimini guclendirir",
    "Sosyal kanit olusturarak guvenilirlik saglar",
    "Gercek profil gorunumlu hesaplardan gelir",
    "1-6 saat icinde tamamlanir",
    "Tum tweet turleri icin uygun",
  ].join("\n"),
  "twitter-impressions": (q) => [
    `${formatQuantity(q)} Twitter/X gosterim`,
    "Tweet erisim ve impressions metriklerini yukseltir",
    "Hesap analitiginizi guclendirir",
    "Reklam veren markalar icin guvenilir gorunum saglar",
    "Hizli teslimat",
    "Is ve influencer hesaplari icin idealdir",
  ].join("\n"),

  "facebook-followers": (q) => [
    `${formatQuantity(q)} Facebook takipci`,
    "Sayfa guvenilirligini ve sosyal kaniti artirir",
    "Organik gorunumlu profiller ile kademeli teslimat",
    "Reklam performansinizi olumlu etkiler",
    "Dusus durumunda telafi garantisi",
    "0-4 saat icinde teslimat baslar",
  ].join("\n"),
  "facebook-likes": (q) => [
    `${formatQuantity(q)} Facebook begeni`,
    "Sayfa ve gonderi etkilesimini artirir",
    "Facebook algoritmasinda one cikmanizi saglar",
    "Reklam ve organik erisiminizi guclendirir",
    "Hizli ve guvenli teslimat",
    "Tum icerik turleri icin uygun",
  ].join("\n"),
  "facebook-members": (q) => [
    `${formatQuantity(q)} Facebook grup uyesi`,
    "Grup otoritesini ve guvenilirligini artirir",
    "Aktif gorunumlu profiller ile doldurulur",
    "Topluluk olusturma stratejinizi destekler",
    "Kademeli teslimat",
    "Acik ve kapali gruplar icin uygun",
  ].join("\n"),
  "facebook-shares": (q) => [
    `${formatQuantity(q)} Facebook paylasim`,
    "Iceriginizin viral yayilimini saglar",
    "Organik erisim oraninizi katlar",
    "Facebook algoritmasinda guclu etkilesim sinyali",
    "Hizli teslimat",
    "Sayfa ve profil gonderileri icin uygun",
  ].join("\n"),
  "facebook-comments": (q) => [
    `${formatQuantity(q)} Facebook yorum`,
    "Gonderi etkilesim oranini ciddi sekilde artirir",
    "Sosyal kanit olusturarak guvenilirlik saglar",
    "Gercek gorunumlu profiller ile yorum yapilir",
    "1-12 saat icinde tamamlanir",
    "Tum gonderi turleri icin uygun",
  ].join("\n"),
  "facebook-views": (q) => [
    `${formatQuantity(q)} Facebook video izlenme`,
    "Video erisiminizi ve gorunurluguzunu artirir",
    "Facebook Watch algoritmasinda one cikmanizi saglar",
    "Reel, canli yayin ve video gonderileri icin gecerli",
    "Hizli teslimat",
    "Icerik ureticileri icin idealdir",
  ].join("\n"),

  "telegram-members": (q) => [
    `${formatQuantity(q)} Telegram grup/kanal uyesi`,
    "Kanal veya grup guvenilirligini artirir",
    "Gercek gorunumlu hesaplar ile doldurulur",
    "Kademeli teslimat ile dogal buyume saglanir",
    "0-4 saat icinde teslimat baslar",
    "Turk ve global uye secenekleri mevcuttur",
  ].join("\n"),
  "telegram-views": (q) => [
    `${formatQuantity(q)} Telegram gonderi goruntuleme`,
    "Kanal gonderilerinizin daha aktif gorunmesini saglar",
    "Reklam veren markalar icin guvenilir metrik",
    "Aninda teslimat baslar",
    "Son gonderi veya tum gonderiler icin uygulanabilir",
    "Otomatik goruntuleme secenegi de mevcuttur",
  ].join("\n"),
  "telegram-comments": (q) => [
    `${formatQuantity(q)} Telegram yorum`,
    "Kanal etkilesim oranini artirir",
    "Gercek gorunumlu, anlamli yorumlar",
    "Topluluk algisini guclendirir",
    "1-6 saat icinde tamamlanir",
    "Kanallar ve gruplar icin uygun",
  ].join("\n"),
  "telegram-shares": (q) => [
    `${formatQuantity(q)} Telegram paylasim/forward`,
    "Mesajlarinizin daha genis kitleye ulasmasini saglar",
    "Kanal tanitimi icin etkili yontem",
    "Organik buyumeyi destekler",
    "Hizli teslimat",
    "Tum gonderi turleri icin uygun",
  ].join("\n"),
  "telegram-votes": (q) => [
    `${formatQuantity(q)} Telegram oy/anket yaniti`,
    "Anket sonuclarinizi yonlendirmenize yardimci olur",
    "Kanal etkilesimini artirir",
    "Hizli ve guvenli teslimat",
    "Tum anket turleri icin uygun",
    "Topluluk katilimini guclendirir",
  ].join("\n"),
  "telegram-auto": (q) => [
    `${formatQuantity(q)} otomatik Telegram etkilesim`,
    "Yeni gonderilerinize otomatik goruntuleme/tepki gelir",
    "Kanalinizi surekli aktif gosterir",
    "Ayarlanabilir hiz ve miktar secenekleri",
    "Abonelik suresi boyunca kesintisiz calisir",
    "Kanal sahipleri icin idealdir",
  ].join("\n"),

  "spotify-followers": (q) => [
    `${formatQuantity(q)} Spotify takipci`,
    "Sanatci profilinizin guvenilirligini artirir",
    "Algoritmik oynatma listelerine girme sansinizi yukseltir",
    "Kademeli ve organik gorunumlu teslimat",
    "Dusus durumunda telafi garantisi",
    "Muzisyenler ve podcast yayincilari icin idealdir",
  ].join("\n"),
  "spotify-views": (q) => [
    `${formatQuantity(q)} Spotify dinlenme/stream`,
    "Sarkilarinizin populerlik siralamasini yukseltir",
    "Spotify Discover Weekly ve Release Radar'da one cikarir",
    "Gercek streamer davranislarina uygun teslimat",
    "Telif gelirlerinizi artirma potansiyeli",
    "Tum sarki ve albumler icin gecerlidir",
  ].join("\n"),

  "twitch-followers": (q) => [
    `${formatQuantity(q)} Twitch takipci`,
    "Kanal guvenilirligini ve ilk izlenim kalitesini artirir",
    "Affiliate/Partner programi hedeflerinize yaklastirir",
    "Kademeli teslimat ile hesap guvenligi korunur",
    "0-4 saat icinde teslimat baslar",
    "Yayincilar icin idealdir",
  ].join("\n"),
  "twitch-views": (q) => [
    `${formatQuantity(q)} Twitch izleyici/izlenme`,
    "Canli yayin kategorisinde ust siralara cikmanizi saglar",
    "Izleyici sayisi ile daha fazla organik izleyici cekersiniz",
    "Es zamanli viewer destegi mevcuttur",
    "Yayin kalitesine gore ozellestirilebilir",
    "Tum yayin kategorileri icin gecerlidir",
  ].join("\n"),

  "linkedin-followers": (q) => [
    `${formatQuantity(q)} LinkedIn takipci`,
    "Profesyonel profil ve sirket sayfasi guvenilirligini artirir",
    "Is firsatlari ve ag genisletme potansiyeli",
    "Kademeli teslimat ile hesap guvenligi korunur",
    "B2B pazarlama stratejinizi destekler",
    "Is dunyasi profesyonelleri icin idealdir",
  ].join("\n"),
  "linkedin-likes": (q) => [
    `${formatQuantity(q)} LinkedIn begeni`,
    "Gonderi gorunurlugunu artirarak profesyonel aginizi genisletir",
    "LinkedIn algoritmasinda one cikmanizi saglar",
    "Hizli teslimat",
    "Tum gonderi turleri icin uygun",
    "Kurumsal hesaplar icin idealdir",
  ].join("\n"),
  "linkedin-comments": (q) => [
    `${formatQuantity(q)} LinkedIn yorum`,
    "Profesyonel etkilesim oraninizi artirir",
    "Is dunyasi gorunurluguzuzu guclendirir",
    "Anlamli, profesyonel yorumlar",
    "1-12 saat icinde tamamlanir",
    "Liderlik ve uzmanlik algisi olusturur",
  ].join("\n"),
  "linkedin-shares": (q) => [
    `${formatQuantity(q)} LinkedIn paylasim`,
    "Iceriginizin profesyonel aglarda yayilmasini saglar",
    "Organik erisim oraninizi katlar",
    "B2B pazarlama icin etkili",
    "Hizli teslimat",
    "Tum gonderi turleri icin uygun",
  ].join("\n"),

  "pinterest-followers": (q) => [
    `${formatQuantity(q)} Pinterest takipci`,
    "Pin ve board gorunurluguzuzu artirir",
    "E-ticaret trafigi icin guclu temel olusturur",
    "Kademeli teslimat ile hesap guvenligi korunur",
    "0-6 saat icinde teslimat baslar",
    "Online magazalar ve bloggerlar icin idealdir",
  ].join("\n"),
  "pinterest-likes": (q) => [
    `${formatQuantity(q)} Pinterest begeni/kaydetme`,
    "Pin populerligini artirarak daha fazla trafik ceker",
    "Pinterest arama sonuclarinda ust siralara tasir",
    "E-ticaret donusum oraninizi artirir",
    "Hizli teslimat",
    "Tum pin turleri icin uygun",
  ].join("\n"),

  "soundcloud-followers": (q) => [
    `${formatQuantity(q)} SoundCloud takipci`,
    "Sanatci profilinizin guvenilirligini artirir",
    "Daha fazla organik dinleyici cekmenizi saglar",
    "Kademeli teslimat",
    "Muzisyenler ve podcast yayincilari icin idealdir",
    "0-6 saat icinde teslimat baslar",
  ].join("\n"),
  "soundcloud-likes": (q) => [
    `${formatQuantity(q)} SoundCloud begeni`,
    "Parcalarinizin populerlik siralamasini yukseltir",
    "SoundCloud arama sonuclarinda one cikarir",
    "Hizli teslimat",
    "Tum parcalar icin gecerlidir",
    "Sanatcilar icin idealdir",
  ].join("\n"),
  "soundcloud-shares": (q) => [
    `${formatQuantity(q)} SoundCloud paylasim/repost`,
    "Muzginizin daha genis kitleye ulasmasini saglar",
    "Organik dinleyici buyumesini destekler",
    "Hizli teslimat",
    "Tum parcalar icin uygun",
    "Sanatci tanitimi icin etkili",
  ].join("\n"),
  "soundcloud-views": (q) => [
    `${formatQuantity(q)} SoundCloud dinlenme`,
    "Parcalarinizin populerlik metriklerini yukseltir",
    "SoundCloud algoritmik onerilerde cikma sansinizi artirir",
    "Gercek dinleyici davranislarina uygun teslimat",
    "Tum parcalar icin gecerlidir",
    "Muzik endustrisi profesyonelleri icin idealdir",
  ].join("\n"),
};

// Genel fallback aciklamalari
const genericD: Record<string, (q: number, p: string) => string> = {
  followers: (q, p) => [
    `${formatQuantity(q)} ${p} takipci`,
    "Hesap guvenilirligini ve sosyal kaniti artirir",
    "Kademeli teslimat ile guvenli buyume saglanir",
    "Dusus durumunda telafi garantisi",
    "Siparis sonrasi hizli teslimat baslar",
    "7/24 canli destek",
  ].join("\n"),
  likes: (q, p) => [
    `${formatQuantity(q)} ${p} begeni`,
    "Icerik etkilesim oraninizi artirir",
    "Algoritma siralamasinda one cikmanizi saglar",
    "Hizli ve guvenli teslimat",
    "Tum icerik turleri icin uygun",
    "7/24 canli destek",
  ].join("\n"),
  views: (q, p) => [
    `${formatQuantity(q)} ${p} izlenme`,
    "Icerik gorunurlugunu artirir",
    "Algoritma performansini guclendirir",
    "Hizli teslimat baslar",
    "Tum icerik turleri icin gecerli",
    "7/24 canli destek",
  ].join("\n"),
  comments: (q, p) => [
    `${formatQuantity(q)} ${p} yorum`,
    "Etkilesim oranini ciddi sekilde artirir",
    "Sosyal kanit olusturarak guvenilirlik saglar",
    "Gercek gorunumlu, anlamli yorumlar",
    "1-12 saat icinde tamamlanir",
    "7/24 canli destek",
  ].join("\n"),
  shares: (q, p) => [
    `${formatQuantity(q)} ${p} paylasim`,
    "Iceriginizin daha genis kitleye ulasmasini saglar",
    "Organik buyumeyi destekler",
    "Hizli teslimat garantisi",
    "Tum icerik turleri icin uygun",
    "7/24 canli destek",
  ].join("\n"),
  subscribers: (q, p) => [
    `${formatQuantity(q)} ${p} abone`,
    "Kanal guvenilirligini artirir",
    "Kademeli teslimat ile guvenli buyume",
    "Dusus durumunda telafi garantisi",
    "0-6 saat icinde teslimat baslar",
    "7/24 canli destek",
  ].join("\n"),
  members: (q, p) => [
    `${formatQuantity(q)} ${p} uye`,
    "Topluluk guvenilirligini artirir",
    "Gercek gorunumlu hesaplar ile doldurulur",
    "Kademeli teslimat",
    "0-4 saat icinde teslimat baslar",
    "7/24 canli destek",
  ].join("\n"),
  traffic: (q, p) => [
    `${formatQuantity(q)} ${p} ziyaretci/trafik`,
    "Web sitenizin ziyaretci trafigini artirir",
    "SEO ve analitik metriklerinizi guclendirir",
    "Hedefli trafik secenekleri mevcuttur",
    "Hizli teslimat baslar",
    "Tum web siteleri icin uygun",
  ].join("\n"),
  auto: (q, p) => [
    `${formatQuantity(q)} otomatik ${p} etkilesim`,
    "Yeni iceriklerinize otomatik etkilesim gelir",
    "Hesabinizi surekli aktif ve guncel tutar",
    "Ayarlanabilir hiz ve miktar secenekleri",
    "Abonelik suresi boyunca kesintisiz calisir",
    "Icerik ureticileri icin idealdir",
  ].join("\n"),
  impressions: (q, p) => [
    `${formatQuantity(q)} ${p} gosterim/erisim`,
    "Icerik erisim istatistiklerini yukseltir",
    "Algoritma performansini guclendirir",
    "Marka bilinirligini olusturmak icin etkili",
    "Aninda teslimat baslar",
    "Isletme hesaplari icin uygun",
  ].join("\n"),
  mentions: (q, p) => [
    `${formatQuantity(q)} ${p} etiketleme/mention`,
    "Hedef kitlenize dogrudan ulasim saglar",
    "Profilinize yonlendirme trafigi olusturur",
    "Organik takipci kazanimini destekler",
    "Hizli teslimat garantisi",
    "Marka hesaplari icin idealdir",
  ].join("\n"),
  votes: (q, p) => [
    `${formatQuantity(q)} ${p} oy/tepki`,
    "Anket ve etkilesim metriklerinizi artirir",
    "Topluluk katilimini guclendirir",
    "Hizli ve guvenli teslimat",
    "Tum icerik turleri icin uygun",
    "7/24 canli destek",
  ].join("\n"),
};

function buildDescription(platformSlug: string | null, serviceKind: string, quantity: number, platformName: string) {
  const key = `${platformSlug}-${serviceKind}`;
  if (D[key]) return D[key](quantity);
  const fn = genericD[serviceKind] ?? genericD.followers;
  return fn(quantity, platformName);
}

/* --- Ana --- */

async function main() {
  console.log("Perakende paket uretimi basliyor...\n");

  const categories = await db.category.findMany({
    where: {
      status: true,
      parentId: { not: null },
      slug: { not: null },
      NOT: { slug: { endsWith: "-combo" } },
      services: { some: { status: true } },
    },
    select: {
      id: true, slug: true, name: true,
      parent: { select: { id: true, slug: true, name: true } },
    },
    orderBy: [
      { parent: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  }) as CategoryRow[];

  if (categories.length === 0) { console.log("Aktif alt kategori bulunamadi."); return; }

  const comboCategories = await db.category.findMany({
    where: { slug: { endsWith: "-combo" }, status: true },
    select: { id: true },
  });
  const comboCatIds = comboCategories.map((c) => c.id);

  const deleteResult = await db.package.deleteMany({
    where: comboCatIds.length > 0 ? { categoryId: { notIn: comboCatIds } } : {},
  });
  console.log(`${deleteResult.count} eski retail paket silindi.\n`);

  let createdCount = 0;
  let packageSort = 0;

  for (const category of categories) {
    const service = await db.service.findFirst({
      where: { categoryId: category.id, status: true },
      orderBy: [{ completedOrderCount: "desc" }, { price: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, name: true, description: true, price: true,
        min: true, max: true, canRefill: true, canCancel: true, hasDripfeed: true,
      },
    });

    if (!service || service.price <= 0) {
      console.log(`Atlandi: ${category.parent?.name ?? "?"} > ${category.name}`); continue;
    }
    if (service.price > MAX_SERVICE_PRICE_PER_1000) {
      console.log(`Atlandi: ${category.parent?.name ?? "?"} > ${category.name} — cok pahali (${service.price.toFixed(2)}/1000)`); continue;
    }

    const serviceKind = detectServiceKind(category.slug, category.name, service.name);
    const quantities = filterSellableQuantities(
      clampQuantities(service.min, service.max, getPreferredQuantities(serviceKind)),
      serviceKind,
    );

    if (quantities.length === 0) {
      console.log(`Atlandi: ${category.parent?.name ?? "?"} > ${category.name} — miktar yok`); continue;
    }

    console.log(`${category.parent?.name ?? "?"} > ${category.name} (${serviceKind})`);

    const baseQuantity = quantities[0];

    for (const [index, quantity] of quantities.entries()) {
      const baseCost = Number(((service.price / 1000) * quantity).toFixed(2));
      const retailPrice = computeRetailPrice(baseCost, quantity, baseQuantity);
      const resellerPrice = computeResellerPrice(baseCost, quantity, baseQuantity);
      const { retail: markupPct } = getSmartMarkup(baseCost);

      const description = buildDescription(
        category.parent?.slug ?? null, serviceKind, quantity,
        category.parent?.name ?? category.name,
      );

      const packageName = buildPackageName(
        category.parent?.name ?? category.name, category.name, quantity, serviceKind,
      );

      const showOnHomepage = index === 0 && HOMEPAGE_TARGETS.has(category.slug ?? "");
      packageSort += 1;

      await db.package.create({
        data: {
          name: packageName, description, quantity,
          price: baseCost, retailPrice, resellerPrice,
          showOnHomepage, sortOrder: packageSort,
          status: true, categoryId: category.id, serviceId: service.id,
        },
      });
      createdCount += 1;
      console.log(`  ${packageName} | maliyet=${baseCost.toFixed(2)} | retail=${retailPrice.toFixed(2)} | %${markupPct}`);
    }
  }

  console.log(`\nTamamlandi. ${createdCount} retail paket olusturuldu.`);
}

main()
  .catch((error) => { console.error("Hata:", error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); await pool.end(); });
