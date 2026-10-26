import { fetchProviderServices as fetchProviderServicePayloads } from "../../src/lib/services/provider-service-payload";

export type ServiceType =
  | "followers"
  | "likes"
  | "views"
  | "comments"
  | "shares"
  | "subscribers"
  | "members"
  | "retweets"
  | "reactions"
  | "other";

const SERVICE_TYPE_TRANSLATIONS: Record<ServiceType, Record<string, string>> = {
  followers: { tr: "Takipçi", en: "Followers", de: "Follower", ar: "متابعين", zh: "粉丝", fr: "Abonnés", es: "Seguidores", ru: "Подписчики", pt: "Seguidores", ja: "フォロワー", ko: "팔로워", it: "Follower" },
  likes: { tr: "Beğeni", en: "Likes", de: "Likes", ar: "إعجابات", zh: "点赞", fr: "Likes", es: "Me Gusta", ru: "Лайки", pt: "Curtidas", ja: "いいね", ko: "좋아요", it: "Mi Piace" },
  views: { tr: "İzlenme", en: "Views", de: "Aufrufe", ar: "مشاهدات", zh: "观看", fr: "Vues", es: "Vistas", ru: "Просмотры", pt: "Visualizações", ja: "再生回数", ko: "조회수", it: "Visualizzazioni" },
  comments: { tr: "Yorum", en: "Comments", de: "Kommentare", ar: "تعليقات", zh: "评论", fr: "Commentaires", es: "Comentarios", ru: "Комментарии", pt: "Comentários", ja: "コメント", ko: "댓글", it: "Commenti" },
  shares: { tr: "Paylaşım", en: "Shares", de: "Shares", ar: "مشاركات", zh: "分享", fr: "Partages", es: "Compartidos", ru: "Репосты", pt: "Compartilhamentos", ja: "シェア", ko: "공유", it: "Condivisioni" },
  subscribers: { tr: "Abone", en: "Subscribers", de: "Abonnenten", ar: "مشتركين", zh: "订阅", fr: "Abonnés", es: "Suscriptores", ru: "Подписчики", pt: "Inscritos", ja: "登録者", ko: "구독자", it: "Iscritti" },
  members: { tr: "Üye", en: "Members", de: "Mitglieder", ar: "أعضاء", zh: "成员", fr: "Membres", es: "Miembros", ru: "Участники", pt: "Membros", ja: "メンバー", ko: "멤버", it: "Membri" },
  retweets: { tr: "Retweet", en: "Retweets", de: "Retweets", ar: "إعادة تغريد", zh: "转推", fr: "Retweets", es: "Retweets", ru: "Ретвиты", pt: "Retweets", ja: "リツイート", ko: "리트윗", it: "Retweet" },
  reactions: { tr: "Tepki", en: "Reactions", de: "Reaktionen", ar: "تفاعلات", zh: "反应", fr: "Réactions", es: "Reacciones", ru: "Реакции", pt: "Reações", ja: "リアクション", ko: "반응", it: "Reazioni" },
  other: { tr: "Hizmet", en: "Service", de: "Dienst", ar: "خدمة", zh: "服务", fr: "Service", es: "Servicio", ru: "Услуга", pt: "Serviço", ja: "サービス", ko: "서비스", it: "Servizio" },
};

const QUALITY_TRANSLATIONS: Record<string, Record<string, string>> = {
  real: { tr: "Gerçek", en: "Real", de: "Echt", ar: "حقيقي", zh: "真实", fr: "Réel", es: "Real", ru: "Реальные", pt: "Real", ja: "リアル", ko: "리얼", it: "Reale" },
  hq: { tr: "Yüksek Kalite", en: "High Quality", de: "Hohe Qualität", ar: "جودة عالية", zh: "高质量", fr: "Haute Qualité", es: "Alta Calidad", ru: "Высокого качества", pt: "Alta Qualidade", ja: "高品質", ko: "고품질", it: "Alta Qualità" },
  fast: { tr: "Hızlı", en: "Fast", de: "Schnell", ar: "سريع", zh: "快速", fr: "Rapide", es: "Rápido", ru: "Быстрый", pt: "Rápido", ja: "高速", ko: "빠른", it: "Veloce" },
  instant: { tr: "Anında", en: "Instant", de: "Sofort", ar: "فوري", zh: "即时", fr: "Instantané", es: "Instantáneo", ru: "Мгновенный", pt: "Instantâneo", ja: "即時", ko: "즉시", it: "Istantaneo" },
  refill: { tr: "Garantili", en: "Refill Guaranteed", de: "Nachfüllung", ar: "مع ضمان", zh: "保障", fr: "Recharge Garantie", es: "Con Garantía", ru: "С гарантией", pt: "Com Garantia", ja: "保証付き", ko: "보장", it: "Con Garanzia" },
  "no-refill": { tr: "Garantisiz", en: "No Refill", de: "Ohne Nachfüllung", ar: "بدون ضمان", zh: "无保障", fr: "Sans Recharge", es: "Sin Garantía", ru: "Без гарантии", pt: "Sem Garantia", ja: "保証なし", ko: "보장없음", it: "Senza Garanzia" },
  bot: { tr: "Bot", en: "Bot", de: "Bot", ar: "بوت", zh: "机器人", fr: "Bot", es: "Bot", ru: "Бот", pt: "Bot", ja: "ボット", ko: "봇", it: "Bot" },
  mix: { tr: "Karışık", en: "Mixed", de: "Gemischt", ar: "مختلط", zh: "混合", fr: "Mixte", es: "Mixto", ru: "Микс", pt: "Misto", ja: "ミックス", ko: "혼합", it: "Misto" },
};

export function detectServiceType(name: string, category: string): ServiceType {
  const combined = (name + " " + category).toLowerCase();
  if (/follower|takipçi|takip/.test(combined)) return "followers";
  if (/like|beğeni|begeni/.test(combined)) return "likes";
  if (/view|izlenme|görüntü|watch/.test(combined)) return "views";
  if (/comment|yorum/.test(combined)) return "comments";
  if (/share|paylaş|repost/.test(combined)) return "shares";
  if (/subscriber|abone/.test(combined)) return "subscribers";
  if (/member|üye/.test(combined)) return "members";
  if (/retweet/.test(combined)) return "retweets";
  if (/reaction|tepki/.test(combined)) return "reactions";
  return "other";
}

export function generateServiceTranslations(cleanName: string, serviceType: ServiceType): Record<string, { name: string }> {
  const translations: Record<string, { name: string }> = {};
  const locales = ["en", "de", "ar", "zh", "fr", "es", "ru", "pt", "ja", "ko", "it"];

  const nameLower = cleanName.toLowerCase();
  let quality = "";
  if (nameLower.includes("real") || nameLower.includes("gerçek")) quality = "real";
  else if (nameLower.includes("hq") || nameLower.includes("high quality") || nameLower.includes("yüksek")) quality = "hq";
  else if (nameLower.includes("bot")) quality = "bot";
  else if (nameLower.includes("mix") || nameLower.includes("karışık")) quality = "mix";

  const hasRefill = nameLower.includes("refill") && !nameLower.includes("no refill") && !nameLower.includes("no_refill");
  const noRefill = nameLower.includes("no refill") || nameLower.includes("garantisiz") || nameLower.includes("no_refill");

  for (const locale of locales) {
    const typeWord = SERVICE_TYPE_TRANSLATIONS[serviceType]?.[locale] || SERVICE_TYPE_TRANSLATIONS.other[locale];
    let translated = typeWord;

    if (quality && QUALITY_TRANSLATIONS[quality]?.[locale]) {
      translated = `${QUALITY_TRANSLATIONS[quality][locale]} ${translated}`;
    }

    if (hasRefill && QUALITY_TRANSLATIONS.refill?.[locale]) {
      translated += ` - ${QUALITY_TRANSLATIONS.refill[locale]}`;
    } else if (noRefill && QUALITY_TRANSLATIONS["no-refill"]?.[locale]) {
      translated += ` - ${QUALITY_TRANSLATIONS["no-refill"][locale]}`;
    }

    translations[locale] = { name: translated };
  }

  return translations;
}

export function calculatePrices(baseRate: number, currencyMultiplier: number, retailMarkupPercent: number, resellerMarkupPercent: number) {
  const tryRate = baseRate * currencyMultiplier;
  const retailPrice = Number((tryRate * (1 + retailMarkupPercent / 100)).toFixed(4));
  const resellerPrice = Number((tryRate * (1 + resellerMarkupPercent / 100)).toFixed(4));
  return { price: Number(tryRate.toFixed(4)), retailPrice, resellerPrice };
}

export async function fetchProviderServices(apiUrl: string, apiKey: string) {
  return fetchProviderServicePayloads(apiUrl, apiKey);
}