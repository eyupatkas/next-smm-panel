/**
 * Platform brand icons — uses react-icons for real brand SVGs.
 * Falls back to a lightning bolt icon for unknown platforms.
 */
import type { JSX } from "react";
import {
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaTwitter,
  FaSpotify,
  FaLinkedin,
  FaGoogle,
  FaTelegram,
  FaDiscord,
  FaSnapchatGhost,
  FaTwitch,
  FaPinterest,
  FaReddit,
  FaSoundcloud,
  FaWhatsapp,
  FaVk,
} from "react-icons/fa";
import { FaTiktok, FaXTwitter, FaThreads } from "react-icons/fa6";
import { Zap, Globe, Star, Hash, Monitor } from "lucide-react";

type SizeVariant = "sm" | "md" | "lg";

const sizeMap: Record<SizeVariant, number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

type IconEntry = {
  icon: (size: number) => JSX.Element;
  color: string;
};

const platformIconRegistry: Record<string, IconEntry> = {
  instagram: {
    icon: (s) => <FaInstagram size={s} />,
    color: "from-pink-500/20 to-purple-500/20 border-pink-500/40 text-pink-400",
  },
  facebook: {
    icon: (s) => <FaFacebook size={s} />,
    color: "from-blue-600/20 to-indigo-500/20 border-blue-500/40 text-blue-400",
  },
  youtube: {
    icon: (s) => <FaYoutube size={s} />,
    color: "from-red-500/20 to-red-700/20 border-red-500/40 text-red-400",
  },
  twitter: {
    icon: (s) => <FaXTwitter size={s} />,
    color: "from-sky-500/20 to-blue-500/20 border-sky-500/40 text-sky-400",
  },
  "x.com": {
    icon: (s) => <FaXTwitter size={s} />,
    color: "from-gray-500/20 to-gray-700/20 border-gray-400/40 text-gray-300",
  },
  tiktok: {
    icon: (s) => <FaTiktok size={s} />,
    color: "from-cyan-400/20 to-gray-500/20 border-cyan-400/40 text-cyan-400",
  },
  spotify: {
    icon: (s) => <FaSpotify size={s} />,
    color: "from-green-500/20 to-green-700/20 border-green-500/40 text-green-400",
  },
  linkedin: {
    icon: (s) => <FaLinkedin size={s} />,
    color: "from-blue-700/20 to-blue-500/20 border-blue-600/40 text-blue-400",
  },
  google: {
    icon: (s) => <FaGoogle size={s} />,
    color: "from-yellow-400/20 to-red-400/20 border-yellow-500/40 text-yellow-400",
  },
  telegram: {
    icon: (s) => <FaTelegram size={s} />,
    color: "from-blue-400/20 to-cyan-400/20 border-blue-400/40 text-blue-400",
  },
  discord: {
    icon: (s) => <FaDiscord size={s} />,
    color: "from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-400",
  },
  snapchat: {
    icon: (s) => <FaSnapchatGhost size={s} />,
    color: "from-yellow-400/20 to-yellow-600/20 border-yellow-500/40 text-yellow-400",
  },
  twitch: {
    icon: (s) => <FaTwitch size={s} />,
    color: "from-purple-500/20 to-violet-500/20 border-purple-500/40 text-purple-400",
  },
  pinterest: {
    icon: (s) => <FaPinterest size={s} />,
    color: "from-red-600/20 to-red-800/20 border-red-600/40 text-red-400",
  },
  reddit: {
    icon: (s) => <FaReddit size={s} />,
    color: "from-orange-500/20 to-red-500/20 border-orange-500/40 text-orange-400",
  },
  soundcloud: {
    icon: (s) => <FaSoundcloud size={s} />,
    color: "from-orange-400/20 to-orange-600/20 border-orange-500/40 text-orange-400",
  },
  whatsapp: {
    icon: (s) => <FaWhatsapp size={s} />,
    color: "from-green-400/20 to-green-600/20 border-green-500/40 text-green-400",
  },
  vk: {
    icon: (s) => <FaVk size={s} />,
    color: "from-blue-600/20 to-cyan-500/20 border-blue-600/40 text-blue-400",
  },
  threads: {
    icon: (s) => <FaThreads size={s} />,
    color: "from-gray-500/20 to-gray-700/20 border-gray-500/40 text-gray-300",
  },
  "website traffic": {
    icon: (s) => <Globe size={s} />,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400",
  },
  reviews: {
    icon: (s) => <Star size={s} />,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400",
  },
  others: {
    icon: (s) => <Hash size={s} />,
    color: "from-gray-500/20 to-gray-700/20 border-gray-500/40 text-gray-400",
  },
};

const FALLBACK_COLOR = "from-primary/20 to-primary/10 border-primary/40 text-primary";

function findEntry(name: string): IconEntry | null {
  const key = name.toLowerCase();
  for (const [k, entry] of Object.entries(platformIconRegistry)) {
    if (key.includes(k)) return entry;
  }
  return null;
}

export function getPlatformIcon(name: string, size: SizeVariant = "md"): JSX.Element {
  const px = sizeMap[size];
  const entry = findEntry(name);
  return entry ? entry.icon(px) : <Zap size={px} />;
}

export function getPlatformColor(name: string): string {
  const entry = findEntry(name);
  return entry ? entry.color : FALLBACK_COLOR;
}
