import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Zap, TrendingUp, Shield } from "lucide-react";

type Platform = "instagram" | "tiktok" | "youtube" | "general";

type ToolCTAProps = {
  platform?: Platform;
};

const CONFIG: Record<Platform, { emoji: string; color: string; btn: string; glow: string; href: string }> = {
  instagram: {
    emoji: "📸",
    color: "from-pink-500/20 to-rose-500/10 border-pink-500/30",
    btn: "from-pink-500 to-rose-500",
    glow: "shadow-pink-500/20",
    href: "/instagram-takipci-satin-al",
  },
  tiktok: {
    emoji: "🎵",
    color: "from-teal-500/20 to-cyan-500/10 border-teal-500/30",
    btn: "from-teal-500 to-cyan-500",
    glow: "shadow-teal-500/20",
    href: "/tiktok-takipci-satin-al",
  },
  youtube: {
    emoji: "📺",
    color: "from-red-500/20 to-rose-600/10 border-red-500/30",
    btn: "from-red-500 to-rose-600",
    glow: "shadow-red-500/20",
    href: "/youtube-abone-satin-al",
  },
  general: {
    emoji: "🚀",
    color: "from-primary/20 to-sky-500/10 border-primary/30",
    btn: "from-primary to-sky-500",
    glow: "shadow-primary/20",
    href: "/services",
  },
};

export function ToolConversionCTA({ platform = "instagram" }: ToolCTAProps) {
  const t = useTranslations("toolCta");
  const cfg = CONFIG[platform];

  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-6 shadow-xl ${cfg.color} ${cfg.glow}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Sol: ikon + metin */}
        <div className="flex items-start gap-4 flex-1">
          <div className="text-3xl shrink-0 mt-0.5">{cfg.emoji}</div>
          <div>
            <h3 className="font-bold text-lg text-white leading-tight">{t(`${platform}.heading`)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(`${platform}.sub`)}</p>
            {/* Mini güvence rozetleri */}
            <div className="mt-3 flex flex-wrap gap-2">
              {([1, 2, 3] as const).map((n) => {
                const icons = { 1: Zap, 2: Shield, 3: TrendingUp };
                const Icon = icons[n];
                return (
                  <span key={n} className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-slate-300">
                    <Icon size={10} className="opacity-70" />
                    {t(`badge${n}`)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sağ: CTA */}
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href={cfg.href}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${cfg.btn}`}
          >
            {t(`${platform}.cta`)} <ArrowRight size={15} />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            {t("freeAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
