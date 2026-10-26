"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { X, Zap, Gift, ArrowRight, Shield } from "lucide-react";

const STORAGE_KEY = "optismm_exit_popup_seen";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 gün

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const maybeShow = useCallback(() => {
    if (dismissed) return;
    try {
      const ts = localStorage.getItem(STORAGE_KEY);
      if (ts && Date.now() - Number(ts) < COOLDOWN_MS) return;
    } catch { /* storage unavailable */ }
    setVisible(true);
  }, [dismissed]);

  useEffect(() => {
    // Mouse çıkış tespiti (masaüstü)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) maybeShow();
    };
    // Scroll tespiti — %70+ sayfayı gördükten sonra
    let scrollTriggered = false;
    const handleScroll = () => {
      if (scrollTriggered) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > 0 && scrolled / total >= 0.7) {
        scrollTriggered = true;
        setTimeout(maybeShow, 3000);
      }
    };
    // Geri tuşu / popstate (telefon)
    const handlePopstate = () => maybeShow();

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("popstate", handlePopstate);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("popstate", handlePopstate);
    };
  }, [maybeShow]);

  function close() {
    setDismissed(true);
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] p-8 shadow-2xl shadow-primary/20 animate-in fade-in zoom-in-95 duration-300">
        {/* Kapat */}
        <button
          onClick={close}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* İkon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky-400 shadow-lg shadow-primary/40">
            <Gift size={32} className="text-white" />
          </div>
        </div>

        {/* Başlık */}
        <div className="mb-3 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
            <Zap size={12} /> ÖZEL TEKLİF
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Bekle! Sana Özel Teklif</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            İlk siparişini bugün ver, anında başlasın. Hesap şifresi istemiyoruz — yalnızca kullanıcı adın yeterli.
          </p>
        </div>

        {/* Özellikler */}
        <ul className="mb-6 space-y-2">
          {[
            "⚡️ Sipariş onayından sonra saniyeler içinde başlar",
            "🔒 Hesap güvenliğin %100 korunur",
            "💳 Kredi kartı veya kapıda ödeme",
            "🔄 30 gün düşme garantisi",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href="/signup"
          onClick={close}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-sky-500 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:-translate-y-0.5"
        >
          Hemen Ücretsiz Başla <ArrowRight size={18} />
        </Link>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Shield size={11} /> Üyelik ücretsiz — kredi kartı gerekmez
        </div>

        <button onClick={close} className="mt-3 w-full text-center text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          Hayır, teşekkürler
        </button>
      </div>
    </div>
  );
}
