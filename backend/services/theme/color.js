// GENERATED from frontend/src/design/theme/color.js by backend/scripts/sync-theme-engine.js.
// Do not edit. Edit the frontend file, then run: node scripts/sync-theme-engine.js
// Colour maths for the theme engine (no DOM). Hex/triplet parsing, sRGB <-> OKLCH,
// gamut mapping and WCAG contrast. OKLab maths is Bjorn Ottosson's public-domain recipe.

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

const GAMUT_EPS = 1e-4;

function hexToRgb(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbToTriplet([r, g, b]) {
  return `${r} ${g} ${b}`;
}

function tripletToRgb(str) {
  if (typeof str !== 'string') return null;
  const parts = str.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const out = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const enc = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

function rgbToOklch([R, G, B]) {
  const r = lin(R / 255), g = lin(G / 255), b = lin(B / 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  return { L, C: Math.hypot(a, bb), h: Math.atan2(bb, a) };
}

function toLinear(L, C, h) {
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS);

function oklchToRgb({ L, C, h }) {
  L = Math.min(1, Math.max(0, L));
  if (L >= 1) return [...WHITE];
  if (L <= 0) return [...BLACK];
  let lrgb = toLinear(L, C, h);
  if (!inGamut(lrgb)) {
    // Too colourful for a screen: keep lightness and hue, shrink the chroma until it fits.
    let lo = 0, hi = C;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(toLinear(L, mid, h))) lo = mid; else hi = mid;
    }
    lrgb = toLinear(L, lo, h);
  }
  return lrgb.map((v) => Math.round(enc(Math.min(1, Math.max(0, v))) * 255));
}

function relativeLuminance([R, G, B]) {
  return 0.2126 * lin(R / 255) + 0.7152 * lin(G / 255) + 0.0722 * lin(B / 255);
}

function contrastRatio(a, b) {
  const ya = relativeLuminance(a), yb = relativeLuminance(b);
  return (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);
}

// Distance between two colours in OKLab (0 = identical; about 0.02 is just noticeable).
function deltaE(a, b) {
  const x = rgbToOklch(a), y = rgbToOklch(b);
  return Math.hypot(
    x.L - y.L,
    x.C * Math.cos(x.h) - y.C * Math.cos(y.h),
    x.C * Math.sin(x.h) - y.C * Math.sin(y.h),
  );
}

module.exports = { WHITE, BLACK, hexToRgb, rgbToHex, rgbToTriplet, tripletToRgb, rgbToOklch, oklchToRgb, relativeLuminance, contrastRatio, deltaE };
