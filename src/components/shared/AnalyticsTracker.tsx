"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "_tid";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid)) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

/** Locale prefix dahil admin yolu mu kontrol eder: /admin, /tr/admin, /en/admin, ... */
function isAdminPath(p: string): boolean {
  return p === "/admin" || p.startsWith("/admin/") || /^\/[a-z]{2}(-[A-Z]{2})?\/admin(\/?$|\/)/i.test(p);
}

interface Props {
  /** Admin kullanıcıysa tracking yapılmaz */
  isAdmin?: boolean;
  /**
   * Sadece heartbeat gönderir, pageview kaydetmez.
   * Dashboard sayfaları için: online sayımı yapılsın ama trafik verisini kirletmesin.
   */
  heartbeatOnly?: boolean;
}

function captureFirstTouch() {
  if (typeof window === "undefined") return;
  try {
    const existing = localStorage.getItem("_initial_referrer");
    if (!existing) {
      const ref = document.referrer || "";
      const searchParams = new URLSearchParams(window.location.search);
      const utmSource = searchParams.get("utm_source");
      const gclid = searchParams.get("gclid");
      const fbclid = searchParams.get("fbclid");

      let initialSource = "";
      if (utmSource) {
        initialSource = `utm:${utmSource}`;
      } else if (gclid) {
        initialSource = "source:Google Ads";
      } else if (fbclid) {
        initialSource = "source:Facebook/Instagram Ads";
      } else if (ref && !ref.includes(window.location.hostname)) {
        initialSource = ref;
      }

      if (initialSource) {
        localStorage.setItem("_initial_referrer", initialSource);
        document.cookie = `_initial_referrer=${encodeURIComponent(initialSource)}; max-age=2592000; path=/; SameSite=Lax`;
      }
    }
  } catch {
    // ignore
  }
}

export function AnalyticsTracker({ isAdmin, heartbeatOnly }: Props) {
  const pathname = usePathname();
  const sidRef = useRef<string>("");

  // Oturum ID'sini ve ilk geliş kaynağını bir kez oluştur/yakala
  useEffect(() => {
    if (isAdmin) return;
    sidRef.current = getOrCreateSessionId();
    captureFirstTouch();
  }, [isAdmin]);

  // Rota değişince pageview kaydı (heartbeatOnly modunda atlanır)
  useEffect(() => {
    if (isAdmin || heartbeatOnly || !sidRef.current || !pathname) return;
    if (isAdminPath(pathname)) return;

    const sid = sidRef.current;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        sessionId: sid,
        path: pathname,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [pathname, isAdmin, heartbeatOnly]);

  // Her 15 saniyede bir heartbeat (online kullanıcı sayımı için) ve çıkış bildirimi
  useEffect(() => {
    if (isAdmin) return;

    const heartbeat = () => {
      if (!sidRef.current || !pathname) return;
      if (isAdminPath(pathname)) return;
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "heartbeat",
          sessionId: sidRef.current,
          path: pathname,
        }),
      }).catch(() => {});
    };

    heartbeat();
    const interval = setInterval(heartbeat, 15_000);

    const handleUnload = () => {
      if (!sidRef.current) return;
      const data = JSON.stringify({ sessionId: sidRef.current });
      navigator.sendBeacon("/api/analytics/exit", data);
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [pathname, isAdmin]);

  return null;
}
