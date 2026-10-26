import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "OptiSMM — Sosyal Medya Büyütme ve Bayi Paneli";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand palette
const BG_FROM = "#0b1220";
const BG_TO = "#1e3a8a";
const ACCENT = "#3b82f6";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";

// "Yükseliş O" markası (OptiSMM logosu) — satori'de data-URI img olarak gömülür
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="-3 -3 206 206" fill="none">
  <defs><linearGradient id="g" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
    <stop stop-color="#2563EB"/><stop offset="1" stop-color="#06B6D4"/>
  </linearGradient></defs>
  <path d="M151.2 86.1 A58 58 0 1 0 129.3 151.5" stroke="url(%23g)" stroke-width="18" stroke-linecap="round"/>
  <path d="M151.2 86.1 L191.2 46.1" stroke="url(%23g)" stroke-width="18" stroke-linecap="round"/>
  <path d="M164.2 49.1 L191.2 46.1 L188.2 73.1" stroke="url(%23g)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const MARK_SRC = `data:image/svg+xml,${MARK_SVG.replace(/"/g, "'").replace(/#/g, "%23").replace(/\n\s*/g, "")}`;

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: `linear-gradient(135deg, ${BG_FROM} 0%, ${BG_TO} 100%)`,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: TEXT,
          position: "relative",
        }}
      >
        {/* Decorative blob */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${ACCENT}55 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `radial-gradient(circle, #06b6d455 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Header / logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_SRC} width={72} height={72} alt="" />
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -0.5 }}>
            OptiSMM
          </div>
        </div>

        {/* Main title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            <span>Sosyal Medya Büyütme &</span>
            <span style={{ color: ACCENT }}>Profesyonel SMM Panel</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: MUTED,
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            Instagram, TikTok, YouTube • Hızlı teslimat, güvenli ödeme, 7/24 destek
          </div>
        </div>

        {/* Footer pills */}
        <div style={{ display: "flex", gap: 14 }}>
          {[
            "Anlık Teslimat",
            "Refill Garantili",
            "Bayi Altyapısı",
            "Kripto ile Güvenli Ödeme",
          ].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 22,
                fontWeight: 600,
                color: TEXT,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
