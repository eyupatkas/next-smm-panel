"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  Globe,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Wrench,
  X,
  Zap,
  ArrowRight,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/routing";
import { logout } from "@/lib/actions/auth-actions";
import { useSession } from "next-auth/react";
import { BrandMark } from "@/components/shared/BrandMark";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useFavorites } from "@/context/FavoritesContext";
import { CURRENCY_COOKIE, CURRENCY_MANUAL_COOKIE, defaultCurrencyCodeForLocale } from "@/lib/currency";

type NavbarUser = {
  name?: string | null;
  role?: string;
  image?: string | null;
} | null;

// ── Platform mega menü verisi ─────────────────────────────────────────────────
const PLATFORMS = [
  {
    slug: "instagram",
    name: "Instagram",
    color: "from-pink-500 via-purple-500 to-indigo-500",
    bg: "bg-gradient-to-br from-pink-500/15 to-purple-600/10",
    border: "border-pink-500/20",
    textColor: "text-pink-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    services: ["Takipçi Satın Al", "Beğeni Satın Al", "İzlenme Satın Al", "Yorum Satın Al"],
    featured: true,
  },
  {
    slug: "tiktok",
    name: "TikTok",
    color: "from-slate-900 to-rose-500",
    bg: "bg-gradient-to-br from-rose-500/10 to-slate-800/20",
    border: "border-rose-500/20",
    textColor: "text-rose-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.2 8.2 0 004.79 1.52V6.83a4.85 4.85 0 01-1.02-.14z"/>
      </svg>
    ),
    services: ["Takipçi Satın Al", "Beğeni Satın Al", "İzlenme Satın Al"],
    featured: true,
  },
  {
    slug: "youtube",
    name: "YouTube",
    color: "from-red-600 to-red-700",
    bg: "bg-gradient-to-br from-red-500/15 to-red-700/5",
    border: "border-red-500/20",
    textColor: "text-red-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    services: ["Abone Satın Al", "İzlenme Satın Al", "Beğeni Satın Al"],
    featured: true,
  },
  {
    slug: "twitter",
    name: "Twitter / X",
    color: "from-sky-400 to-blue-600",
    bg: "bg-gradient-to-br from-sky-500/10 to-blue-600/5",
    border: "border-sky-500/20",
    textColor: "text-sky-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    services: ["Takipçi Satın Al", "Beğeni Satın Al"],
    featured: false,
  },
  {
    slug: "facebook",
    name: "Facebook",
    color: "from-blue-600 to-blue-800",
    bg: "bg-gradient-to-br from-blue-600/15 to-blue-800/5",
    border: "border-blue-600/20",
    textColor: "text-blue-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    services: ["Takipçi Satın Al", "Beğeni Satın Al"],
    featured: false,
  },
  {
    slug: "telegram",
    name: "Telegram",
    color: "from-cyan-400 to-blue-500",
    bg: "bg-gradient-to-br from-cyan-500/10 to-blue-500/5",
    border: "border-cyan-500/20",
    textColor: "text-cyan-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    services: ["Üye Satın Al", "Görüntülenme"],
    featured: false,
  },
  {
    slug: "spotify",
    name: "Spotify",
    color: "from-green-500 to-emerald-600",
    bg: "bg-gradient-to-br from-green-500/15 to-emerald-600/5",
    border: "border-green-500/20",
    textColor: "text-green-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
    services: ["Takipçi Satın Al", "Dinleyici"],
    featured: false,
  },
  {
    slug: "twitch",
    name: "Twitch",
    color: "from-purple-500 to-violet-700",
    bg: "bg-gradient-to-br from-purple-500/15 to-violet-700/5",
    border: "border-purple-500/20",
    textColor: "text-purple-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
    services: ["İzleyici Satın Al", "Takipçi"],
    featured: false,
  },
  {
    slug: "discord",
    name: "Discord",
    color: "from-indigo-500 to-indigo-700",
    bg: "bg-gradient-to-br from-indigo-500/15 to-indigo-700/5",
    border: "border-indigo-500/20",
    textColor: "text-indigo-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.081.111 18.1.12 18.12c2.053 1.5 4.042 2.412 5.993 3.01a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028c1.962-.608 3.95-1.52 6.002-3.01a.077.077 0 0 0 .032-.027c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    services: ["Üye Satın Al", "Online Üye"],
    featured: false,
  },
  {
    slug: "linkedin",
    name: "LinkedIn",
    color: "from-blue-600 to-blue-800",
    bg: "bg-gradient-to-br from-blue-600/15 to-blue-800/5",
    border: "border-blue-700/20",
    textColor: "text-blue-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    services: ["Bağlantı Satın Al", "Beğeni"],
    featured: false,
  },
  {
    slug: "snapchat",
    name: "Snapchat",
    color: "from-yellow-400 to-yellow-500",
    bg: "bg-gradient-to-br from-yellow-400/15 to-yellow-500/5",
    border: "border-yellow-400/20",
    textColor: "text-yellow-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M5.332 14.713c-.378-.08-.782-.34-.69-.835.092-.494.512-.607.879-.55.367.057.717.151.867.189.01.002.02.004.031.004.09 0 .153-.08.14-.17-.015-.099-.064-.37-.104-.619-.01-.061-.008-.122.006-.18-.154.02-.305.03-.45.03-.367 0-.73-.055-1.07-.17C3.576 12.024 2.4 10.664 2.4 8.7c0-2.397 1.882-4.146 4.492-4.146.614 0 1.24.15 1.78.43.056.029.112.043.166.043.054 0 .107-.013.157-.04.595-.32 1.224-.484 1.872-.484h.271c.648 0 1.278.163 1.874.484.05.027.103.04.157.04.054 0 .11-.014.166-.043.54-.28 1.165-.43 1.779-.43 2.61 0 4.492 1.75 4.492 4.146 0 1.964-1.176 3.324-2.542 3.712-.34.115-.702.17-1.069.17-.145 0-.296-.01-.45-.03.014.058.016.119.006.18-.04.25-.09.52-.104.62-.013.09.05.169.141.169.01 0 .02-.002.031-.004.15-.038.5-.132.867-.189.367-.057.787.056.879.55.092.495-.312.755-.69.835-.378.08-.777.084-1.23.326-.404.218-.75.76-1.012 1.085-.263.326-.61.627-.953.85-.344.223-.805.375-1.262.375-.457 0-.918-.152-1.262-.374-.343-.223-.69-.525-.953-.85-.262-.325-.608-.867-1.012-1.086-.453-.242-.853-.246-1.23-.326z"/>
      </svg>
    ),
    services: ["Takipçi Satın Al"],
    featured: false,
  },
  {
    slug: "web-traffic",
    name: "Web Trafiği",
    color: "from-teal-500 to-cyan-600",
    bg: "bg-gradient-to-br from-teal-500/15 to-cyan-600/5",
    border: "border-teal-500/20",
    textColor: "text-teal-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    ),
    services: ["Ziyaretçi Gönder", "Organik Trafik"],
    featured: false,
  },
];

const FEATURED_PLATFORMS = PLATFORMS.filter((p) => p.featured);
const OTHER_PLATFORMS = PLATFORMS.filter((p) => !p.featured);

function persistLocaleSelection(locale: Locale) {
  const currency = defaultCurrencyCodeForLocale(locale);
  document.cookie = "NEXT_LOCALE_MANUAL=1; path=/; max-age=31536000; samesite=lax";
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${CURRENCY_MANUAL_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${CURRENCY_COOKIE}=${currency}; path=/; max-age=31536000; samesite=lax`;
}

// ─────────────────────────────────────────────────────────────────────────────

export function Navbar({ user: initialUser }: { user?: NavbarUser }) {
  const t = useTranslations("nav");
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { favoriteCount } = useFavorites();

  const { data: session, status } = useSession();
  const user = status === "loading"
    ? initialUser
    : (session?.user 
        ? { name: session.user.name, role: session.user.role, image: session.user.image } 
        : null);


  const [atTop, setAtTop] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const servicesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const isAtTop = y < 8;
      const scrollingDown = y > lastScrollY.current;

      setAtTop(isAtTop);

      if (isAtTop) {
        setHidden(false);
      } else if (scrollingDown && y > 80) {
        setHidden(true);
        setToolsOpen(false);
        setServicesOpen(false);
        setLangOpen(false);
        setUserMenuOpen(false);
      } else if (!scrollingDown) {
        setHidden(false);
      }

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLocale = (locale: Locale) => {
    persistLocaleSelection(locale);
    
    // Dil değiştiğinde para birimini de o dilin varsayılan para birimi yap (kullanıcı manuel kilitlememişse)
    const isManualCurrency = typeof document !== "undefined" && document.cookie.includes("NEXT_CURRENCY_MANUAL");
    if (!isManualCurrency && typeof document !== "undefined") {
      const defaultCurrencyMap: Record<string, string> = {
        tr: "TRY", en: "USD", de: "EUR", ar: "SAR", zh: "CNY",
        fr: "EUR", es: "EUR", ru: "RUB", pt: "BRL", ja: "JPY",
        ko: "KRW", it: "EUR"
      };
      const defaultCurr = defaultCurrencyMap[locale] || "TRY";
      // eslint-disable-next-line react-hooks/immutability -- Cookie persistence is an intentional event-handler side effect.
      document.cookie = `NEXT_CURRENCY=${defaultCurr}; path=/; max-age=31536000; SameSite=Lax`;
    }
    
    router.replace(pathname, { locale });
    setLangOpen(false);
    setMobileOpen(false);
  };

  const handleServicesEnter = () => {
    if (servicesTimer.current) clearTimeout(servicesTimer.current);
    setServicesOpen(true);
  };
  const handleServicesLeave = () => {
    servicesTimer.current = setTimeout(() => setServicesOpen(false), 120);
  };

  const navLinks = [
    { href: "/ai-order" as const, label: t("aiOrder") },
    { href: "/servis-listesi" as const, label: t("servicesList") },
    { href: "/order-tracking" as const, label: t("orderTracking") },
    { href: "/blog" as const, label: t("blog") },
    { href: "/#nasil-calisir" as const, label: t("howItWorks") },
    { href: "/api-docs" as const, label: t("api") },
  ];

  const toolLinks = [
    { href: "/tools/instagram-hashtag-generator" as const, label: t("toolsHashtag") },
    { href: "/tools/social-media-post-planner" as const, label: t("toolsPlanner") },
    { href: "/tools/character-counter" as const, label: t("toolsCounter") },
    { href: "/tools/instagram-font-generator" as const, label: t("toolsFont") },
    { href: "/tools/engagement-rate-calculator" as const, label: t("toolsEngagement") },
  ];

  const isLoggedIn = !!user;
  const initials = (user?.name || "K")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b",
        "transition-[transform,background-color,border-color,box-shadow] duration-300 ease-in-out will-change-transform",
        hidden ? "-translate-y-full" : "translate-y-0",
        atTop
          ? "bg-transparent border-transparent"
          : "bg-background/85 backdrop-blur-xl border-border shadow-[0_1px_24px_rgba(0,0,0,0.18)]"
      )}
      aria-label="Ana navigasyon"
    >
      {/* ── TopBar ── */}
      <div className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
        atTop ? "max-h-9 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="bg-gradient-to-r from-primary/90 via-blue-600/85 to-violet-600/80 backdrop-blur-sm">
          <div className="container mx-auto max-w-[1536px] flex flex-col gap-1.5 px-4 py-1.5 text-[11px] font-medium text-white sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span className="hidden items-center gap-1.5 opacity-80 md:flex">
              <Zap size={11} />
              Anında Teslimat · Güvenli Ödeme · 7/24 Destek
            </span>
            <div className="-mx-3 flex items-center gap-1 overflow-x-auto px-3 sm:mx-0 sm:justify-end sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link href="/instagram-takipci-satin-al" className="flex shrink-0 items-center gap-1 rounded-full px-3 py-0.5 transition-colors hover:bg-white/20">
                📸 <span className="hidden xs:inline">Instagram Takipçi</span>
              </Link>
              <span className="opacity-30">·</span>
              <Link href="/smm-panel" className="flex shrink-0 items-center gap-1 rounded-full px-3 py-0.5 transition-colors hover:bg-white/20">
                ⚡ SMM Panel
              </Link>
              <span className="opacity-30">·</span>
              <Link href="/bayilik" className="flex shrink-0 items-center gap-1 rounded-full px-3 py-0.5 transition-colors hover:bg-white/20">
                🤝 Bayilik
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav row ── */}
      <div className={cn(
        "container mx-auto max-w-[1536px] flex items-center justify-between px-4 sm:px-6 lg:px-8",
        "transition-[padding] duration-300",
        atTop ? "py-4" : "py-2.5"
      )}>
        <Link href="/" className="inline-flex items-center" aria-label="OptiSMM Ana Sayfa">
          <BrandMark size="sm" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          {/* Hizmetler mega menü trigger */}
          <div
            className="relative"
            ref={servicesRef}
            onMouseEnter={handleServicesEnter}
            onMouseLeave={handleServicesLeave}
          >
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-primary hover:bg-white/5 transition-colors",
                servicesOpen && "text-primary bg-white/5"
              )}
            >
              {t("services")}
              <ChevronDown size={14} className={cn("transition-transform duration-200", servicesOpen && "rotate-180")} />
            </button>

            {/* MEGA MENU */}
            <div className={cn(
              "absolute top-full left-0 mt-2 z-50",
              "transition-all duration-200 origin-top-left",
              servicesOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
            )}>
              <div className="w-[960px] rounded-2xl border border-white/10 bg-background/96 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-r from-primary/8 to-violet-500/5">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">Tüm Platformlar</p>
                    <span className="text-[10px] font-medium text-muted-foreground/60 border border-white/10 rounded-full px-2 py-0.5">{PLATFORMS.length} platform</span>
                  </div>
                  <Link
                    href="/services"
                    onClick={() => setServicesOpen(false)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-primary/30 bg-primary/8 rounded-full px-3 py-1.5"
                  >
                    Tüm Hizmetler <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="p-5 grid grid-cols-[290px_1fr] gap-6">
                  {/* Sol: Öne çıkan platformlar + CTA */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-semibold px-1 mb-2 flex items-center gap-1.5">
                      <TrendingUp size={10} /> Öne Çıkan
                    </p>
                    {FEATURED_PLATFORMS.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/${p.slug}` as Parameters<typeof Link>[0]["href"]}
                        onClick={() => setServicesOpen(false)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all group hover:scale-[1.01]",
                          p.bg, p.border
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-md",
                          p.color
                        )}>
                          <span className="text-white [&>svg]:w-5 [&>svg]:h-5">{p.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-semibold", p.textColor)}>{p.name}</p>
                          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                            {p.services.slice(0, 2).join(" · ")}
                          </p>
                        </div>
                        <ArrowRight size={14} className="shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                    {/* CTA row */}
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <Link
                        href="/smm-panel"
                        onClick={() => setServicesOpen(false)}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-primary/25 bg-primary/8 hover:bg-primary/15 transition-all"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <Zap size={13} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-primary leading-none">SMM Panel</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Toplu sipariş</p>
                        </div>
                      </Link>
                      <Link
                        href="/bayilik"
                        onClick={() => setServicesOpen(false)}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 transition-all"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 text-sm leading-none">
                          🤝
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-emerald-400 leading-none">Bayilik</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Bayi paneli</p>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Sağ: Diğer platformlar — 3 kolon, tam isimli */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-semibold px-1 mb-3 flex items-center gap-1.5">
                      <Users size={10} /> Diğer Platformlar
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {OTHER_PLATFORMS.map((p) => (
                        <Link
                          key={p.slug}
                          href={`/${p.slug}` as Parameters<typeof Link>[0]["href"]}
                          onClick={() => setServicesOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all group",
                            "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.06] hover:border-white/20"
                          )}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm",
                            p.color
                          )}>
                            <span className="text-white [&>svg]:w-4 [&>svg]:h-4">{p.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors whitespace-nowrap">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{p.services[0]}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-lg hover:text-primary hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {/* Araçlar dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-primary hover:bg-white/5 transition-colors",
                toolsOpen && "text-primary bg-white/5"
              )}
            >
              <Wrench size={14} />
              {t("tools")}
              <ChevronDown size={14} className={cn("transition-transform", toolsOpen && "rotate-180")} />
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-3 w-64 rounded-xl border border-white/10 bg-background/95 backdrop-blur-lg shadow-2xl py-2 z-50">
                {toolLinks.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="block px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => setToolsOpen(false)}
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle compact className="hidden sm:inline-flex" />

          <Link
            href="/favorites"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10"
            aria-label="Favoriler"
          >
            <Heart size={16} />
            {favoriteCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {favoriteCount > 99 ? "99+" : favoriteCount}
              </span>
            ) : null}
          </Link>

          {/* Language switcher */}
          <div className="relative hidden md:block" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
              aria-label="Dil seç"
            >
              <Globe size={15} />
              <span>{localeFlags[currentLocale]}</span>
              <ChevronDown size={13} className={cn("transition-transform", langOpen && "rotate-180")} />
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-white/10 bg-background/95 backdrop-blur-lg shadow-2xl py-2 z-50 max-h-80 overflow-y-auto">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    onClick={() => switchLocale(locale)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors",
                      locale === currentLocale && "text-primary bg-primary/5"
                    )}
                  >
                    <span className="text-base">{localeFlags[locale]}</span>
                    <span>{localeNames[locale]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoggedIn ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {initials}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user?.name || "Kullanıcı"}</span>
                <ChevronDown size={14} className={cn("transition-transform", userMenuOpen && "rotate-180")} />
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 rounded-xl border border-white/10 bg-background/95 backdrop-blur-lg shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-white/5 mb-1">
                    <p className="text-sm font-semibold">{user?.name || "Kullanıcı"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase() || "kullanıcı"}</p>
                  </div>
                  <Link
                    href={user?.role === "ADMIN" ? "/admin" : "/dashboard"}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} /> {t("dashboard")}
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={16} /> {t("settings")}
                  </Link>
                  <div className="border-t border-white/5 mt-1 pt-1">
                    <form action={logout}>
                      <button
                        type="submit"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut size={16} /> {t("logout")}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: "default" }), "hidden rounded-full px-6 font-semibold shadow-lg shadow-primary/30 transition-all duration-300 glow-blue sm:inline-flex")}
              >
                {t("signup")}
              </Link>
            </>
          )}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-lg max-h-[85vh] overflow-y-auto">
          <div className="container mx-auto px-3 py-4 space-y-3 sm:px-4">
            {/* Hizmetler — platform grid */}
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60 font-semibold px-1 py-2 flex items-center gap-1.5">
                <TrendingUp size={10} /> {t("services")}
              </p>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {FEATURED_PLATFORMS.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/${p.slug}` as Parameters<typeof Link>[0]["href"]}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border",
                      p.bg, p.border
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", p.color)}>
                      <span className="text-white [&>svg]:w-4 [&>svg]:h-4">{p.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold", p.textColor)}>{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">Hizmetleri gör</p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {OTHER_PLATFORMS.slice(0, 9).map((p) => (
                  <Link
                    key={p.slug}
                    href={`/${p.slug}` as Parameters<typeof Link>[0]["href"]}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-1.5 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className={cn("w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0", p.color)}>
                      <span className="text-white [&>svg]:w-3 [&>svg]:h-3">{p.icon}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
              {/* SMM + Bayilik */}
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {[
                  { href: "/smm-panel", label: "SMM Panel", icon: "⚡", sub: "Toplu sipariş" },
                  { href: "/bayilik", label: "Bayilik", icon: "🤝", sub: "Bayi ol" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href as Parameters<typeof Link>[0]["href"]}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 hover:bg-primary/10 transition-colors"
                  >
                    <span className="text-base">{l.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-primary">{l.label}</p>
                      <p className="text-[10px] text-muted-foreground">{l.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5" />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/favorites"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <span className="flex items-center gap-2">
                <Heart size={16} /> Favoriler
              </span>
              {favoriteCount > 0 ? (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {favoriteCount > 99 ? "99+" : favoriteCount}
                </span>
              ) : null}
            </Link>
            <div className="border-t border-white/5 pt-2 mt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 py-1">
                {t("tools")}
              </p>
              {toolLinks.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="block py-2.5 pl-3 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {tool.label}
                </Link>
              ))}
            </div>
            {/* Mobile language selector */}
            <div className="border-t border-white/5 pt-2 mt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 py-1">
                <Globe size={12} className="inline mr-1" />
                Dil / Language
              </p>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    onClick={() => switchLocale(locale)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-colors",
                      locale === currentLocale && "text-primary bg-primary/10"
                    )}
                  >
                    <span>{localeFlags[locale]}</span>
                    <span className="truncate">{localeNames[locale]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-white/5 pt-3 mt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 py-1">
                Tema
              </p>
              <ThemeToggle className="w-full justify-center" />
            </div>
            {isLoggedIn && (
              <div className="border-t border-white/5 pt-3 mt-2 space-y-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-semibold truncate">{user?.name || "Kullanıcı"}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{user?.role?.toLowerCase() || "kullanıcı"}</p>
                </div>
                <Link
                  href={user?.role === "ADMIN" ? "/admin" : "/dashboard"}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("dashboard")}
                </Link>
                <Link
                  href="/dashboard/settings"
                  className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-center")}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("settings")}
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className={cn(buttonVariants({ variant: "destructive" }), "w-full justify-center")}
                  >
                    {t("logout")}
                  </button>
                </form>
              </div>
            )}
            {!isLoggedIn && (
              <div className="border-t border-white/5 pt-3 mt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("login")}
                </Link>
                <Link
                  href="/signup"
                  className={cn(buttonVariants({ variant: "default" }), "w-full justify-center rounded-full font-semibold")}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("signup")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
