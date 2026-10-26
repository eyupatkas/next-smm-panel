// Shopier geliştirici portalı için ikon (512×512) + tanıtım görseli (1280×800)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = new URL(".", import.meta.url).pathname + "shopier/";
const BLUE = "#2563EB";
const CYAN = "#06B6D4";

// Konsept B markı (mevcut site ikonuyla aynı dil) — 200 viewBox, tam kare rozet
const badge = `
  <rect width="200" height="200" rx="40" fill="url(#gm)"/>
  <rect x="45" y="98" width="26" height="56" rx="13" fill="#fff" opacity="0.5"/>
  <rect x="87" y="76" width="26" height="78" rx="13" fill="#fff" opacity="0.75"/>
  <rect x="129" y="46" width="26" height="108" rx="13" fill="#fff"/>
  <path d="M50 108 L100 70 L150 32" fill="none" stroke="#fff" stroke-width="9" opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/>`;

const defs = `<linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${CYAN}"/></linearGradient>`;

await mkdir(OUT, { recursive: true });

// 1) Uygulama ikonu 512×512 (tam kare, köşe yuvarlaması platform tarafında uygulanabilir diye düşük tutuldu)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200"><defs>${defs}</defs>${badge}</svg>`;
await sharp(Buffer.from(iconSvg), { density: 300 }).resize(512, 512).png().toFile(`${OUT}app-icon-512.png`);

// 2) Tanıtım görseli 1280×800
const promoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <defs>${defs}
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B1220"/><stop offset="1" stop-color="#101A30"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bg)"/>
  <circle cx="1150" cy="90" r="220" fill="${BLUE}" opacity="0.12"/>
  <circle cx="120" cy="740" r="180" fill="${CYAN}" opacity="0.10"/>
  <g transform="translate(84 96) scale(1.1)">${badge}</g>
  <text x="84" y="410" font-family="DejaVu Sans" font-weight="bold" font-size="88" fill="#FFFFFF">OptiSMM</text>
  <text x="84" y="470" font-family="DejaVu Sans" font-size="34" fill="${CYAN}">Sosyal Medya Büyütme ve Sipariş Paneli</text>
  <text x="84" y="560" font-family="DejaVu Sans" font-size="26" fill="#B7C3D6">Instagram, TikTok ve YouTube hizmetlerini</text>
  <text x="84" y="598" font-family="DejaVu Sans" font-size="26" fill="#B7C3D6">otomatik teslimatla satın alın; siparişleriniz</text>
  <text x="84" y="636" font-family="DejaVu Sans" font-size="26" fill="#B7C3D6">Shopier mağazanızla anlık olarak eşleşir.</text>
</svg>`;
await sharp(Buffer.from(promoSvg), { density: 144 }).png().toFile(`${OUT}tanitim-1.png`);
console.log("yazıldı: app-icon-512.png, tanitim-1.png");
