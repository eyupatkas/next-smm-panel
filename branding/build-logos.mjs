// OptiSMM logo üretici: monoline vektör wordmark + 3 mark konsepti
// Kullanım: node branding/build-logos.mjs  → branding/ altına SVG + PNG yazar
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const OUT = new URL(".", import.meta.url).pathname;
const BLUE = "#2563EB";
const CYAN = "#06B6D4";
const SW = 12;      // monoline stroke kalınlığı
const SCALE = 1.34; // cap 80 → ~107
const GAP = 10;     // harfler arası varsayılan boşluk (stroke dahil optik)

// ── Monoline wordmark: "OptiSMM" (cap y=20, baseline y=100, descender ~124)
const letters = {
  O: { w: 58, el: `<ellipse cx="29" cy="60" rx="25.5" ry="39.5"/>` },
  p: { w: 52, el: `<path d="M7 56 V124"/><circle cx="29.5" cy="79" r="20"/>` },
  t: { w: 34, el: `<path d="M5 48 H29"/><path d="M17 26 V86 Q17 100 27 100 H32"/>` },
  i: { w: 24, el: `<path d="M12 58 V100"/><circle cx="12" cy="34.5" r="6.5" class="dot"/>` },
  S: { w: 54, el: `<path d="M43 34 C40 25 32.5 20 23 20 C11.5 20 4 27.5 4 37.5 C4 48 12 52.5 26 56.5 C40 60.5 48 66 48 77 C48 89.5 38 97 24 97 C10.5 97 3 90 1.5 79.5"/>` },
  M: { w: 62, el: `<path d="M5 100 V22 L31 63 L57 22 V100"/>` },
};
const text = "OptiSMM";
const KERN = { Op: -2, pt: 0, ti: 0, iS: 4, SM: 0, MM: 3 };

// Harf konumlarını hesapla (unscaled local birim)
const positions = (() => {
  let x = 0; const pos = [];
  for (let idx = 0; idx < text.length; idx++) {
    pos.push({ ch: text[idx], idx, x });
    x += letters[text[idx]].w + GAP + (KERN[`${text[idx]}${text[idx + 1]}`] ?? 0);
  }
  return { pos, total: x - GAP };
})();

function letterGroup(L, stroke, extra = "") {
  const shape = L.el.replace('class="dot"', `fill="${stroke}" stroke="none"`);
  return `<g fill="none" stroke="${stroke}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"${extra}>${shape}</g>`;
}

// ── Mark konseptleri (200×200 viewBox)
function markA() {
  // "Yükseliş O": halka + NE'ye kırılan ok
  const cx = 96, cy = 104, r = 58;
  const a1 = -18 * Math.PI / 180, a2 = 55 * Math.PI / 180;
  const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  const p2 = [cx + r * Math.cos(a2), cy + r * Math.sin(a2)];
  const tip = [p1[0] + 40, p1[1] - 40];
  const h1 = [tip[0] - 27, tip[1] + 3];
  const h2 = [tip[0] - 3, tip[1] + 27];
  return `
  <path d="M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A ${r} ${r} 0 1 0 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}"
    fill="none" stroke="url(#gm)" stroke-width="18" stroke-linecap="round"/>
  <path d="M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${tip[0]} ${tip[1]}" fill="none" stroke="url(#gm)" stroke-width="18" stroke-linecap="round"/>
  <path d="M ${h1[0]} ${h1[1]} L ${tip[0]} ${tip[1]} L ${h2[0]} ${h2[1]}"
    fill="none" stroke="url(#gm)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function markB() {
  // "Büyüme rozeti": gradyan rozet + beyaz çubuklar + trend oku
  return `
  <rect width="200" height="200" rx="46" fill="url(#gm)"/>
  <rect x="45" y="98" width="26" height="56" rx="13" fill="#fff" opacity="0.5"/>
  <rect x="87" y="76" width="26" height="78" rx="13" fill="#fff" opacity="0.75"/>
  <rect x="129" y="46" width="26" height="108" rx="13" fill="#fff"/>
  <path d="M50 108 L100 70 L150 32" fill="none" stroke="#fff" stroke-width="9" opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function markC(bg) {
  // "Sosyal yörünge": story halkası + yörünge noktası + iç trend oku
  const sep = bg
    ? `<circle cx="151" cy="49" r="19" fill="${bg}"/>` : "";
  return `
  <circle cx="100" cy="100" r="64" fill="none" stroke="url(#gm)" stroke-width="15"/>
  ${sep}
  <circle cx="151" cy="49" r="14" fill="url(#gm)"/>
  <path d="M70 106 L94 130 L136 72" fill="none" stroke="url(#gm)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M114 72 H136 V94" fill="none" stroke="url(#gm)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function lockupSVG({ mark, bg, fg, pad = 44 }) {
  const markSize = 200;
  const gap = 46;
  const wmWidth = positions.total * SCALE;
  const w = Math.round(pad * 2 + markSize + gap + wmWidth);
  const h = Math.round(pad * 2 + markSize);
  const markX = pad, markY = pad;
  const wmX = markX + markSize + gap;
  const wmTop = markY + markSize / 2 - 60 * SCALE;

  // "Opti" → düz renk; "SMM" → tek parça sürekli gradyan (userSpaceOnUse, local birimde)
  const smmStart = positions.pos.find(p => p.idx === 4).x;
  const opti = positions.pos.filter(p => p.idx < 4).map(p =>
    `<g transform="translate(${(wmX + p.x * SCALE).toFixed(1)} ${wmTop.toFixed(1)}) scale(${SCALE})">${letterGroup(letters[p.ch], fg)}</g>`
  );
  const smm = positions.pos.filter(p => p.idx >= 4).map(p =>
    `<g transform="translate(${(p.x - smmStart).toFixed(1)} 0)">${letterGroup(letters[p.ch], "url(#gm2)")}</g>`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="gm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${CYAN}"/>
    </linearGradient>
    <linearGradient id="gm2" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${(positions.total - smmStart).toFixed(1)}" y2="0">
      <stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${CYAN}"/>
    </linearGradient>
  </defs>
  ${bg ? `<rect width="${w}" height="${h}" rx="34" fill="${bg}"/>` : ""}
  <g transform="translate(${markX} ${markY})">${mark}</g>
  ${opti.join("\n")}
  <g transform="translate(${(wmX + smmStart * SCALE).toFixed(1)} ${wmTop.toFixed(1)}) scale(${SCALE})">${smm.join("\n")}</g>
</svg>`;
}

const concepts = [
  { id: "konsept-a", name: "konsept-a", mark: markA() },
  { id: "konsept-b", name: "konsept-b", mark: markB() },
  { id: "konsept-c", name: "konsept-c", mark: markC("#0B1220") },
];

await mkdir(OUT, { recursive: true });
for (const c of concepts) {
  const dark = lockupSVG({ mark: c.mark, bg: "#0B1220", fg: "#FFFFFF" });
  const light = lockupSVG({ mark: c.mark, bg: "#FFFFFF", fg: "#0F172A" });
  const markOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${CYAN}"/></linearGradient></defs>${c.mark}</svg>`;
  await writeFile(`${OUT}${c.id}.svg`, dark);
  await writeFile(`${OUT}${c.id}-acik.svg`, light);
  await writeFile(`${OUT}${c.id}-mark.svg`, markOnly);
  await sharp(Buffer.from(dark), { density: 144 }).resize({ width: 1400 }).png().toFile(`${OUT}${c.id}.png`);
  await sharp(Buffer.from(light), { density: 144 }).resize({ width: 1400 }).png().toFile(`${OUT}${c.id}-acik.png`);
  await sharp(Buffer.from(markOnly), { density: 144 }).resize({ width: 96 }).png().toFile(`${OUT}${c.id}-mark-96.png`);
  console.log("yazıldı:", c.id);
}

// ── Karşılaştırma sayfası: 3 konsept (koyu + açık) + 96px mark testleri
{
  const W = 1500, PAD = 50, ROW = 300, GAPY = 36;
  const rows = concepts.length * 2;
  const H = PAD * 2 + rows * ROW + (rows - 1) * GAPY + GAPY + 96;
  const comps = [];
  let y = PAD;
  for (const c of concepts) {
    for (const suffix of ["", "-acik"]) {
      const buf = await sharp(`${OUT}${c.id}${suffix}.png`).resize({ height: ROW }).png().toBuffer();
      const meta = await sharp(buf).metadata();
      comps.push({ input: buf, left: Math.round((W - meta.width) / 2), top: y });
      y += ROW + GAPY;
    }
  }
  y += GAPY;
  let x = PAD;
  for (const c of concepts) {
    const buf = await sharp(`${OUT}${c.id}-mark-96.png`).png().toBuffer();
    comps.push({ input: buf, left: x, top: y });
    x += 160;
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 11, g: 18, b: 32, alpha: 1 } } })
    .composite(comps)
    .png()
    .toFile(`${OUT}onizleme.png`);
  console.log("yazıldı: onizleme.png");
}
console.log("tamam");
