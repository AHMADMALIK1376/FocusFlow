// The colours of a reminder email, taken from the student's saved theme.
// Same maths as the app (services/theme/ is a generated copy of the app's theme engine), then
// a readability pass for email, where text sits on colours the app never puts it on.
// The default palette is exactly the colours emails have always had (it is exempt from the
// readability pass so default emails never change; every other theme passes it).
// Pure and synchronous except loadUserTheme, which can never throw.
const { deriveTokens } = require('./theme/deriveTokens');
const { sanitizeTheme, isDefaultPalette } = require('./theme/theme');
const {
  hexToRgb, rgbToHex, tripletToRgb, rgbToOklch, oklchToRgb, contrastRatio, WHITE, BLACK,
} = require('./theme/color');
const { MAX_BYTES, themeOk } = require('../utils/preferences');

// palette:start
const DEFAULT_PALETTE = Object.freeze({
  canvas: '#F5EFE6', surface: '#FFFDF9', well: '#FAF4EB', edge: '#EFE4D4', track: '#F1E7D9',
  ink: '#342E3E', muted: '#80746C',
  coral: '#EC706D', coralTop: '#F58C89', coralText: '#EC706D', onCoral: '#FFFFFF',
  sun: '#FFD700', sunTop: '#FFE250', onSun: '#28344E', sunChip: '#FFF4BF', sunChipInk: '#6B5200',
  sage: '#B8DCC4', sageTop: '#CEEAD6', sageWash: '#E2F2E7', onSage: '#284634', sageChipInk: '#2F6B47', sageDeep: '#6CB288',
  blush: '#FFE2DE', blushTop: '#FFECE9', coralChipInk: '#B8403D',
  success: '#3EA06C', danger: '#E85460',
  shadowColor: '#BEA07A', shadowTint: '#E8D6BE', highlight: '#FFFFFF', shade: '#D6C0A2',
  brandHighlight: '#FFFFFF', brandTint: '#FFBEB9',
  dark: false,
  icons: Object.freeze({ white: '#FFFFFF', coral: '#EC706D', sage: '#284634', sun: '#28344E', blush: '#B8403D' }),
});
// palette:end

// Text colour (fg) against the colours it sits on. The first backdrop is the main one and
// never moves; only fg is nudged until every pair passes.
const EMAIL_PAIRS = [
  { fg: 'ink', against: [['surface', 4.5], ['well', 4.5], ['canvas', 4.5]] },
  { fg: 'muted', against: [['surface', 4.5], ['well', 4.5], ['canvas', 4.5]] },
  { fg: 'coralText', against: [['surface', 3], ['well', 3], ['canvas', 3]] }, // links, times, wordmark, code digits, coral icons
  { fg: 'onCoral', against: [['coral', 4.5], ['coralTop', 2.3]] },
  { fg: 'onSage', against: [['sage', 4.5], ['sageTop', 4.5], ['sageWash', 4.5]] },
  { fg: 'sageChipInk', against: [['sageWash', 4.5]] },
  { fg: 'coralChipInk', against: [['blush', 4.5], ['blushTop', 4.5]] },
  { fg: 'success', against: [['surface', 3]] },
  { fg: 'danger', against: [['surface', 3]] },
];

const toRgb = (hex) => hexToRgb(hex);
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// The palette table: every field from the derived tokens, no readability fix yet.
function _derivePalette(theme) {
  const r = deriveTokens(theme);
  const tok = (name) => tripletToRgb(r.tokens[name]);
  const ext = (name) => tripletToRgb(r.extras[name]);
  const hex = rgbToHex;
  const surface = tok('--surface');
  const well = tok('--surface-2');
  const brand = hex(tok('--brand'));
  return {
    canvas: hex(tok('--canvas')),
    surface: hex(surface),
    well: hex(well),
    edge: hex(mix(surface, tok('--border'), 1 / 3)),
    track: hex(mix(well, tok('--shade'), 0.25)),
    ink: hex(tok('--ink')),
    muted: hex(tok('--muted')),
    coral: brand,
    coralTop: hex(ext('heroStart')),
    coralText: brand,
    onCoral: hex(tok('--on-brand')),
    sun: DEFAULT_PALETTE.sun,
    sunTop: DEFAULT_PALETTE.sunTop,
    onSun: DEFAULT_PALETTE.onSun,
    sunChip: DEFAULT_PALETTE.sunChip,
    sunChipInk: DEFAULT_PALETTE.sunChipInk,
    sage: hex(tok('--sage')),
    sageTop: hex(ext('sageLight')),
    sageWash: hex(ext('sageCardA')),
    onSage: hex(tok('--on-sage')),
    sageChipInk: hex(tok('--on-sage')),
    sageDeep: hex(tok('--sage-deep')),
    blush: hex(tok('--blush')),
    blushTop: hex(ext('blushLight')),
    coralChipInk: brand,
    success: hex(tok('--success')),
    danger: hex(tok('--focus')),
    shadowColor: hex(tok('--shadow-color')),
    shadowTint: hex(ext('shadowTint')),
    highlight: hex(tok('--highlight')),
    shade: hex(tok('--shade')),
    brandHighlight: hex(ext('brandHighlight')),
    brandTint: hex(ext('brandTint')),
    dark: r.scheme === 'dark',
  };
}

const ratio = (P, a, b) => contrastRatio(toRgb(P[a]), toRgb(P[b]));

// Walks a colour's lightness (keeping its chroma and hue, like the app's guard) until ok(hex) holds.
function walk(hex, dir, ok) {
  const { L, C, h } = rgbToOklch(toRgb(hex));
  let cur = hex;
  let l = L;
  for (let i = 0; i < 101 && !ok(cur); i++) {
    l = Math.min(1, Math.max(0, l + dir * 0.01));
    cur = rgbToHex(oklchToRgb({ L: l, C, h }));
  }
  return cur;
}

// Moves the text colour until every pair passes. If the text is at white/black and a
// secondary backdrop still fails (e.g. dark text cannot sit on both a light and a dark
// sage), that backdrop moves away from the text instead; the first backdrop never moves.
function fixText(P, { fg, against }) {
  const passes = (hex, bg, min) => contrastRatio(toRgb(hex), toRgb(P[bg])) >= min;
  const primary = toRgb(P[against[0][0]]);
  const dir = contrastRatio(WHITE, primary) > contrastRatio(BLACK, primary) ? 1 : -1;
  P[fg] = walk(P[fg], dir, (hex) => against.every(([bg, min]) => passes(hex, bg, min)));
  against.slice(1).forEach(([bg, min]) => {
    if (!passes(P[fg], bg, min)) P[bg] = walk(P[bg], -dir, (hex) => contrastRatio(toRgb(P[fg]), toRgb(hex)) >= min);
  });
}

const paletteCache = new Map();
const PALETTE_CACHE_MAX = 64;

function emailPalette(theme) {
  const t = sanitizeTheme(theme);
  if (!t || isDefaultPalette(t)) return DEFAULT_PALETTE;
  const key = JSON.stringify(t);
  if (paletteCache.has(key)) return paletteCache.get(key);
  const P = _derivePalette(t);
  EMAIL_PAIRS.forEach((pair) => fixText(P, pair));
  P.icons = Object.freeze({ white: P.onCoral, coral: P.coralText, sage: P.onSage, sun: P.onSun, blush: P.coralChipInk });
  Object.freeze(P);
  paletteCache.set(key, P);
  if (paletteCache.size > PALETTE_CACHE_MAX) paletteCache.delete(paletteCache.keys().next().value);
  return P;
}

const rgba = (hex, a) => `rgba(${toRgb(hex).join(',')},${a})`;

// Same shadows as the app's --shadow-* tokens, in the format email clients accept.
function shadowsFor(P) {
  return {
    card: `0 16px 30px -14px ${rgba(P.shadowColor, '0.42')},0 6px 12px -8px ${rgba(P.shadowColor, '0.24')},inset 0 -6px 12px ${rgba(P.shadowTint, '0.30')},inset 0 6px 10px ${rgba(P.highlight, '0.95')}`,
    small: `0 8px 16px -8px ${rgba(P.shadowColor, '0.40')},inset 0 -3px 6px ${rgba(P.shadowTint, '0.30')},inset 0 3px 5px ${rgba(P.highlight, '0.9')}`,
    well: `inset 0 4px 8px ${rgba(P.shade, '0.35')},inset 0 -2px 4px ${rgba(P.highlight, '0.9')}`,
    coral: `0 14px 26px -12px ${rgba(P.coral, '0.50')},inset 0 6px 10px ${rgba(P.brandHighlight, '0.38')},inset 0 -6px 12px ${rgba(P.brandTint, '0.35')}`,
  };
}

// One line per text/backdrop pair that is too faint ("ink on surface: 4.21 < 4.5").
function contrastFailures(P) {
  const out = [];
  EMAIL_PAIRS.forEach(({ fg, against }) => against.forEach(([bg, min]) => {
    const r = ratio(P, fg, bg);
    if (r < min) out.push(`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
  }));
  return out;
}

// The student's saved colour theme, or null for any reason at all (no row, no table yet,
// bad JSON, huge data, invalid theme, database error). Never throws: theming must not stop an email.
async function loadUserTheme(connection, userId) {
  try {
    const result = await connection.execute(
      'SELECT data FROM USER_PREFERENCES WHERE user_id = :userId',
      { userId }
    );
    const raw = result.rows && result.rows[0] && result.rows[0].DATA;
    if (raw == null) return null;
    let data = raw;
    if (typeof raw === 'string') {
      if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return null;
      try { data = JSON.parse(raw); } catch { return null; } // the parse message quotes the data: not logged
    }
    return data && themeOk(data.theme) ? data.theme : null;
  } catch (err) {
    console.warn('Email theme: default look used (' + (err && err.message) + ')');
    return null;
  }
}

module.exports = { DEFAULT_PALETTE, emailPalette, shadowsFor, contrastFailures, loadUserTheme, EMAIL_PAIRS, _derivePalette };
