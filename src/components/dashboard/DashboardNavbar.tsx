"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/routing";
import { CURRENCY_COOKIE, CURRENCY_MANUAL_COOKIE, defaultCurrencyCodeForLocale, getCurrencyForLocale } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Bell,
  ChevronDown,
  CheckCircle2,
  CreditCard,
  Globe,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  X,
  Check,
} from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notification-actions";
import { logout } from "@/lib/actions/auth-actions";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export type NavNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

type DashboardNavbarProps = {
  menuButton?: React.ReactNode;
  user: {
    name: string | null;
    role: string;
    image: string | null;
    balance: number;
  };
  balanceFormatted: string;
  notifications: NavNotification[];
};

function persistLocaleSelection(locale: Locale) {
  const currency = defaultCurrencyCodeForLocale(locale);
  document.cookie = "NEXT_LOCALE_MANUAL=1; path=/; max-age=31536000; samesite=lax";
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${CURRENCY_MANUAL_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${CURRENCY_COOKIE}=${currency}; path=/; max-age=31536000; samesite=lax`;
}

export function DashboardNavbar({ menuButton, user, balanceFormatted, notifications: initialNotifications }: DashboardNavbarProps) {
  const t = useTranslations("sidebar");
  const tServices = useTranslations("servicesPage");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [now] = useState(() => Date.now());

  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications.filter((n) => notifFilter === "all" || !n.read);

  const formatRelativeTime = (iso: string) => {
    const diffMs = now - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Şimdi";
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} sa önce`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} gün önce`;
  };

  const notificationTypeMeta = (type: string) => {
    if (type === "BALANCE") return { icon: <CreditCard size={13} />, label: "Bakiye", className: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
    if (type === "PAYMENT") return { icon: <CheckCircle2 size={13} />, label: "Ödeme", className: "text-sky-400 border-sky-500/30 bg-sky-500/10" };
    if (type === "ORDER_UPDATE") return { icon: <ShoppingCart size={13} />, label: "Sipariş", className: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
    return { icon: <AlertCircle size={13} />, label: "Bildirim", className: "text-muted-foreground border-white/10 bg-white/5" };
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    persistLocaleSelection(newLocale);
    
    // Dil değiştiğinde para birimini de o dilin varsayılan para birimi yap (kullanıcı manuel kilitlememişse)
    const isManualCurrency = typeof document !== "undefined" && document.cookie.includes("NEXT_CURRENCY_MANUAL");
    if (!isManualCurrency && typeof document !== "undefined") {
      const defaultCurrencyMap: Record<string, string> = {
        tr: "TRY", en: "USD", de: "EUR", ar: "SAR", zh: "CNY",
        fr: "EUR", es: "EUR", ru: "RUB", pt: "BRL", ja: "JPY",
        ko: "KRW", it: "EUR"
      };
      const defaultCurr = defaultCurrencyMap[newLocale] || "TRY";
      // eslint-disable-next-line react-hooks/immutability -- Cookie persistence is an intentional event-handler side effect.
      document.cookie = `NEXT_CURRENCY=${defaultCurr}; path=/; max-age=31536000; SameSite=Lax`;
    }
    
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
    setLangOpen(false);
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
  };

  const currency = getCurrencyForLocale(locale);
  const isReseller = user.role === "RESELLER";
  const isAdmin = user.role === "ADMIN";

  const initials = (user.name || "K")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  return (
    <header className="relative flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        {menuButton}

        {/* Search */}
        <div className="hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            placeholder={isReseller ? tServices("searchResellerPlaceholder") : tServices("headerSearchPlaceholder")}
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-white/5 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Mobile search toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(!searchOpen)}>
          <Search size={20} />
        </Button>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Balance */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <CreditCard size={13} className="text-primary sm:size-[15px]" />
          <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground">{balanceFormatted}</span>
        </div>

        <ThemeToggle compact className="hidden sm:inline-flex" />

        {/* Language & Currency Selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 text-sm px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Globe size={15} />
            <span className="hidden sm:inline">{localeFlags[locale]}</span>
            <span className="hidden lg:inline text-xs text-muted-foreground">{currency.code}</span>
            <ChevronDown size={13} className={cn("transition-transform", langOpen && "rotate-180")} />
          </button>
          {langOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/10 bg-card shadow-2xl py-2 z-50 max-h-80 overflow-y-auto">
              <p className="px-3 py-1.5 text-xs text-muted-foreground uppercase tracking-wider">Dil & Para Birimi</p>
              {locales.map((loc) => {
                const cur = getCurrencyForLocale(loc);
                return (
                  <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-primary/10 transition-colors",
                      loc === locale && "text-primary bg-primary/5"
                    )}
                  >
                    <span>{localeFlags[loc]}</span>
                    <span className="flex-1 text-left">{localeNames[loc]}</span>
                    <span className="text-xs text-muted-foreground">{cur.symbol} {cur.code}</span>
                    {loc === locale && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <Button variant="ghost" size="icon" className="relative" onClick={() => setNotifOpen(!notifOpen)}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {notifOpen && (
            <div className="absolute top-full right-0 mt-2 w-[min(24rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/10 bg-card shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <p className="text-sm font-semibold">Bildirimler</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNotifFilter("all")}
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px]",
                      notifFilter === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setNotifFilter("unread")}
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px]",
                      notifFilter === "unread" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    Okunmamış ({unreadCount})
                  </button>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                      Tümünü oku
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto bg-gradient-to-b from-transparent to-background/40">
                {visibleNotifications.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Bildirim yok</p>
                ) : (
                  visibleNotifications.slice(0, 20).map((n) => {
                    const meta = notificationTypeMeta(n.type);

                    return (
                    <div
                      key={n.id}
                      className={cn(
                        "px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer",
                        !n.read && "bg-primary/5"
                      )}
                      onClick={() => {
                        handleMarkRead(n.id);
                        if (n.link) router.push(n.link as Parameters<typeof router.push>[0]);
                        setNotifOpen(false);
                      }}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", meta.className)}>
                          {meta.icon} {meta.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {!n.read ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {new Date(n.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10 transition-colors"
          >
            <Avatar className="h-7 w-7 border border-primary/20">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden lg:inline max-w-24 truncate">{user.name || "Kullanıcı"}</span>
            <ChevronDown size={14} className={cn("transition-transform", userOpen && "rotate-180")} />
          </button>
          {userOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/10 bg-card shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-white/5 mb-1">
                <p className="text-sm font-semibold truncate">{user.name || "Kullanıcı"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
                <p className="text-xs text-primary font-bold mt-1">{balanceFormatted}</p>
              </div>

              {/* Admin switch to dashboard */}
              {isAdmin && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <Users size={16} /> Müşteri Paneli
                </Link>
              )}

              {/* Reseller/User switch to admin if admin */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <ShieldCheck size={16} /> Admin Paneli
                </Link>
              )}

              {!isAdmin && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <LayoutDashboard size={16} /> {t("dashboard")}
                </Link>
              )}

              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors"
                onClick={() => setUserOpen(false)}
              >
                <Settings size={16} /> Hesap Ayarları
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
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="absolute top-16 left-0 right-0 p-3 bg-card border-b border-border md:hidden z-40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              placeholder="Ara..."
              className="w-full h-9 pl-10 pr-10 rounded-lg border border-white/5 bg-background text-sm"
              autoFocus
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchOpen(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
