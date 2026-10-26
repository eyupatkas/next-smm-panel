// Platform renk ve gradient bilgileri - hem server hem client'ta kullanılabilir
export const platformStyles: Record<string, { gradient: string; color: string; bg: string }> = {
  instagram: { gradient: "from-pink-500/20 via-purple-500/20 to-orange-500/20", color: "text-pink-400", bg: "bg-pink-500/10" },
  tiktok: { gradient: "from-cyan-400/20 via-pink-500/20 to-cyan-400/20", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  youtube: { gradient: "from-red-500/20 to-red-600/20", color: "text-red-400", bg: "bg-red-500/10" },
  twitter: { gradient: "from-sky-400/20 to-blue-500/20", color: "text-sky-400", bg: "bg-sky-500/10" },
  facebook: { gradient: "from-blue-600/20 to-blue-400/20", color: "text-blue-400", bg: "bg-blue-500/10" },
  telegram: { gradient: "from-sky-400/20 to-cyan-400/20", color: "text-sky-300", bg: "bg-sky-500/10" },
  spotify: { gradient: "from-green-500/20 to-green-400/20", color: "text-green-400", bg: "bg-green-500/10" },
  twitch: { gradient: "from-purple-500/20 to-violet-500/20", color: "text-purple-400", bg: "bg-purple-500/10" },
  discord: { gradient: "from-indigo-500/20 to-violet-500/20", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  linkedin: { gradient: "from-blue-700/20 to-blue-500/20", color: "text-blue-400", bg: "bg-blue-700/10" },
  pinterest: { gradient: "from-red-600/20 to-red-400/20", color: "text-red-400", bg: "bg-red-500/10" },
  soundcloud: { gradient: "from-orange-500/20 to-orange-400/20", color: "text-orange-400", bg: "bg-orange-500/10" },
  reddit: { gradient: "from-orange-600/20 to-orange-400/20", color: "text-orange-400", bg: "bg-orange-500/10" },
  vkontakte: { gradient: "from-blue-500/20 to-blue-400/20", color: "text-blue-400", bg: "bg-blue-500/10" },
  tumblr: { gradient: "from-indigo-600/20 to-blue-500/20", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  vimeo: { gradient: "from-cyan-500/20 to-blue-400/20", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  likee: { gradient: "from-pink-500/20 to-red-400/20", color: "text-pink-400", bg: "bg-pink-500/10" },
  kwai: { gradient: "from-orange-400/20 to-yellow-400/20", color: "text-orange-400", bg: "bg-orange-400/10" },
  audiomack: { gradient: "from-orange-500/20 to-yellow-500/20", color: "text-orange-400", bg: "bg-orange-500/10" },
  coub: { gradient: "from-blue-400/20 to-teal-400/20", color: "text-teal-400", bg: "bg-teal-500/10" },
  binance: { gradient: "from-yellow-500/20 to-yellow-400/20", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  snapchat: { gradient: "from-yellow-400/20 to-yellow-300/20", color: "text-yellow-400", bg: "bg-yellow-400/10" },
};

const defaultStyle = { gradient: "from-primary/20 to-primary/10", color: "text-primary", bg: "bg-primary/10" };

export function getPlatformStyle(slug: string | null) {
  if (!slug) return defaultStyle;
  return platformStyles[slug] ?? defaultStyle;
}
