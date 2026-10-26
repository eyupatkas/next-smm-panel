"use client";

import { useEffect } from "react";
import { RefreshCw, Wrench } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ margin: 0, background: "#09090b", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", textAlign: "center", padding: "0 24px", maxWidth: "420px", width: "100%" }}>
          {/* Icon */}
          <div style={{ width: 80, height: 80, borderRadius: 20, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>

          {/* Badge */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)", padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#fbbf24" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "#fbbf24", animation: "pulse 2s infinite" }} />
            Bakım Çalışması
          </span>

          {/* Heading */}
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: 26, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em" }}>
              Kısa Süreliğine Bakımdayız
            </h1>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#a1a1aa" }}>
              Sizi daha iyi hizmet etmek için çalışmalar yürütüyoruz. En kısa sürede geri döneceğiz.
            </p>
          </div>

          {/* Info card */}
          <div style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "#71717a" }}>Durum</span>
              <span style={{ color: "#fbbf24", fontWeight: 500 }}>⚡ Bakım Modu</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "#71717a" }}>Tahmini Süre</span>
              <span style={{ color: "#fafafa", fontWeight: 500 }}>Çok kısa süre</span>
            </div>
          </div>

          {/* Retry */}
          <button
            onClick={reset}
            style={{ width: "100%", height: 44, borderRadius: 12, background: "rgba(139,92,246,1)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            ↺ Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
