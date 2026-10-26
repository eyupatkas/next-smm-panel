import { getPlatformIcon } from "@/lib/platform-icons";

// Tailwind-friendly platform palette tuned for both light & dark themes.
type PlatformPalette = {
  // Card border tint
  border: string;
  // Background gradient applied to the visual tile
  tileGradient: string;
  // Icon color inside the tile
  tileIcon: string;
  // Text color used for accent labels (e.g. price)
  accentText: string;
  // CTA button gradient
  cta: string;
  // Soft section background gradient
  softBg: string;
};

const palettes: Record<string, PlatformPalette> = {
  instagram: {
    border: "border-pink-500/30",
    tileGradient: "from-pink-500 via-fuchsia-500 to-purple-600",
    tileIcon: "text-white",
    accentText: "text-pink-600 dark:text-pink-400",
    cta: "from-pink-500 to-purple-600",
    softBg: "from-pink-500/8 via-fuchsia-500/6 to-purple-600/8",
  },
  tiktok: {
    border: "border-rose-500/30",
    tileGradient: "from-slate-900 via-slate-800 to-rose-500",
    tileIcon: "text-white",
    accentText: "text-rose-600 dark:text-rose-400",
    cta: "from-slate-800 to-rose-500",
    softBg: "from-slate-700/6 via-rose-500/6 to-cyan-400/6",
  },
  youtube: {
    border: "border-red-500/30",
    tileGradient: "from-red-500 to-red-700",
    tileIcon: "text-white",
    accentText: "text-red-600 dark:text-red-400",
    cta: "from-red-500 to-red-700",
    softBg: "from-red-500/8 to-red-700/6",
  },
  twitter: {
    border: "border-sky-500/30",
    tileGradient: "from-sky-500 to-blue-600",
    tileIcon: "text-white",
    accentText: "text-sky-600 dark:text-sky-400",
    cta: "from-sky-500 to-blue-600",
    softBg: "from-sky-500/8 to-blue-600/6",
  },
  x: {
    border: "border-zinc-500/30",
    tileGradient: "from-zinc-800 to-black",
    tileIcon: "text-white",
    accentText: "text-zinc-700 dark:text-zinc-300",
    cta: "from-zinc-800 to-black",
    softBg: "from-zinc-500/8 to-zinc-800/6",
  },
  facebook: {
    border: "border-blue-500/30",
    tileGradient: "from-blue-500 to-blue-700",
    tileIcon: "text-white",
    accentText: "text-blue-600 dark:text-blue-400",
    cta: "from-blue-500 to-blue-700",
    softBg: "from-blue-500/8 to-blue-700/6",
  },
  telegram: {
    border: "border-cyan-500/30",
    tileGradient: "from-cyan-400 to-sky-600",
    tileIcon: "text-white",
    accentText: "text-cyan-600 dark:text-cyan-400",
    cta: "from-cyan-400 to-sky-600",
    softBg: "from-cyan-400/8 to-sky-600/6",
  },
  discord: {
    border: "border-indigo-500/30",
    tileGradient: "from-indigo-500 to-violet-600",
    tileIcon: "text-white",
    accentText: "text-indigo-600 dark:text-indigo-400",
    cta: "from-indigo-500 to-violet-600",
    softBg: "from-indigo-500/8 to-violet-600/6",
  },
  spotify: {
    border: "border-green-500/30",
    tileGradient: "from-green-500 to-emerald-600",
    tileIcon: "text-white",
    accentText: "text-green-600 dark:text-green-400",
    cta: "from-green-500 to-emerald-600",
    softBg: "from-green-500/8 to-emerald-600/6",
  },
  linkedin: {
    border: "border-blue-700/30",
    tileGradient: "from-blue-600 to-blue-800",
    tileIcon: "text-white",
    accentText: "text-blue-700 dark:text-blue-400",
    cta: "from-blue-600 to-blue-800",
    softBg: "from-blue-600/8 to-blue-800/6",
  },
  twitch: {
    border: "border-purple-500/30",
    tileGradient: "from-purple-500 to-violet-700",
    tileIcon: "text-white",
    accentText: "text-purple-600 dark:text-purple-400",
    cta: "from-purple-500 to-violet-700",
    softBg: "from-purple-500/8 to-violet-700/6",
  },
  snapchat: {
    border: "border-yellow-500/30",
    tileGradient: "from-yellow-400 to-amber-500",
    tileIcon: "text-slate-900",
    accentText: "text-yellow-600 dark:text-yellow-400",
    cta: "from-yellow-400 to-amber-500",
    softBg: "from-yellow-400/8 to-amber-500/6",
  },
  pinterest: {
    border: "border-red-500/30",
    tileGradient: "from-red-500 to-red-700",
    tileIcon: "text-white",
    accentText: "text-red-600 dark:text-red-400",
    cta: "from-red-500 to-red-700",
    softBg: "from-red-500/8 to-red-700/6",
  },
  threads: {
    border: "border-zinc-500/30",
    tileGradient: "from-zinc-700 to-zinc-900",
    tileIcon: "text-white",
    accentText: "text-zinc-700 dark:text-zinc-300",
    cta: "from-zinc-700 to-zinc-900",
    softBg: "from-zinc-500/8 to-zinc-900/6",
  },
  reddit: {
    border: "border-orange-500/30",
    tileGradient: "from-orange-500 to-red-500",
    tileIcon: "text-white",
    accentText: "text-orange-600 dark:text-orange-400",
    cta: "from-orange-500 to-red-500",
    softBg: "from-orange-500/8 to-red-500/6",
  },
  soundcloud: {
    border: "border-orange-500/30",
    tileGradient: "from-orange-400 to-orange-600",
    tileIcon: "text-white",
    accentText: "text-orange-600 dark:text-orange-400",
    cta: "from-orange-400 to-orange-600",
    softBg: "from-orange-400/8 to-orange-600/6",
  },
};

const fallback: PlatformPalette = {
  border: "border-primary/30",
  tileGradient: "from-primary to-blue-600",
  tileIcon: "text-white",
  accentText: "text-primary",
  cta: "from-primary to-blue-600",
  softBg: "from-primary/8 to-blue-600/6",
};

export function getPlatformPalette(name: string): PlatformPalette {
  const lower = name.toLowerCase();
  for (const [key, palette] of Object.entries(palettes)) {
    if (lower.includes(key)) return palette;
  }
  return fallback;
}

// ── Visual tile (used as "product image") ───────────────────────────────────

type VisualSize = "sm" | "md" | "lg" | "xl";

const visualSizeMap: Record<VisualSize, { box: string; iconScale: string }> = {
  sm: { box: "h-16 w-16 rounded-xl", iconScale: "scale-[1.4]" },
  md: { box: "h-28 w-full rounded-2xl", iconScale: "scale-[2.4]" },
  lg: { box: "h-44 w-full rounded-2xl", iconScale: "scale-[3.6]" },
  xl: { box: "aspect-square w-full rounded-3xl", iconScale: "scale-[5]" },
};

export function PlatformVisual({
  platformName,
  size = "lg",
  className = "",
}: {
  platformName: string;
  size?: VisualSize;
  className?: string;
}) {
  const palette = getPlatformPalette(platformName);
  const { box, iconScale } = visualSizeMap[size];

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${palette.tileGradient} ${box} ${className}`}
      aria-hidden="true"
    >
      {/* soft radial highlights */}
      <span className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-14 -right-14 h-44 w-44 rounded-full bg-black/15 blur-2xl" />
      <span
        className={`relative z-10 transform-gpu ${iconScale} ${palette.tileIcon} drop-shadow-md`}
      >
        {getPlatformIcon(platformName, "lg")}
      </span>
    </div>
  );
}
