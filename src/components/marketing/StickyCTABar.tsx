"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, X, Zap } from "lucide-react";

const STORAGE_KEY = "optismm_sticky_cta_dismissed";

export function StickyCTABar() {
  const t = useTranslations("home");
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        return true;
      }
    } catch {
      // ignore read errors
    }

    return window.location.pathname.startsWith("/dashboard");
  });

  useEffect(() => {
    if (dismissed) return undefined;

    // 8 saniye sonra göster — kullanıcı sayfayı az okuduysa spam yapma
    const t = setTimeout(() => {
      setVisible(true);
    }, 8000);

    return () => clearTimeout(t);
  }, [dismissed]);

  function dismiss() {
    setDismissed(true);
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  }

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[8000] animate-in slide-in-from-bottom-4 duration-500">
      <div className="border-t border-primary/20 bg-gradient-to-r from-[#0a1628]/95 via-[#0d1f3c]/97 to-[#0a1628]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)] sm:[padding-bottom:0.75rem]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Zap size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {t("stickyBarTitle")}{" "}
                <span className="text-primary">{t("stickyBarTitleHighlight")}</span>
              </p>
              <p className="hidden sm:block text-xs text-muted-foreground">
                {t("stickyBarDesc")}
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <Link
              href="/signup"
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary to-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-primary/50 sm:flex-none"
            >
              {t("stickyBarCTA")} <ArrowRight size={14} />
            </Link>
            <button
              onClick={dismiss}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
              aria-label={t("stickyBarClose")}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
