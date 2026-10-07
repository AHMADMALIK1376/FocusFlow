// Email icons in any colour. The icon files in assets/icons are one flat colour with the soft
// edges stored in the alpha channel, so recolouring = keep the white file's alpha, set the RGB.
// pngjs is pure JavaScript (no native build), so it installs on Render's free plan.
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { hexToRgb, deltaE } = require('./theme/color');

const ICON_DIR = path.join(__dirname, '..', 'assets', 'icons');
const MANIFEST = require('../assets/icons/manifest.json');

const TINT_CACHE_MAX = 200;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const masks = new Map(); // name -> decoded white icon (at most one per icon name)
const cache = new Map(); // `${name}:${HEX}` -> PNG Buffer; oldest entry first

function mask(name) {
  if (!masks.has(name)) masks.set(name, PNG.sync.read(fs.readFileSync(path.join(ICON_DIR, `${name}-white.png`))));
  return masks.get(name);
}

// A PNG of icon `name` in colour `hex`. Throws on any problem (callers fall back).
function tintIcon(name, hex) {
  if (!MANIFEST.names.includes(name)) throw new Error(`Unknown icon ${name}`);
  if (typeof hex !== 'string' || !HEX_RE.test(hex)) throw new Error('Icon colour must be #RRGGBB');
  const key = `${name}:${hex.toUpperCase()}`;
  if (cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const src = mask(name);
  const [r, g, b] = hexToRgb(hex);
  const out = new PNG({ width: src.width, height: src.height });
  out.data = Buffer.from(src.data);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
  }
  const png = PNG.sync.write(out);
  cache.set(key, png);
  if (cache.size > TINT_CACHE_MAX) cache.delete(cache.keys().next().value);
  return png;
}

// The ready-made tone whose colour is closest to `hex`; null when hex is not #RRGGBB.
function nearestTone(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let best = null;
  let bestD = Infinity;
  for (const [tone, toneHex] of Object.entries(MANIFEST.tones)) {
    const d = deltaE(rgb, hexToRgb(toneHex));
    if (d < bestD) { best = tone; bestD = d; }
  }
  return best;
}

const fileOf = (name, tone) => ({ filename: `${name}-${tone}.png`, path: path.join(ICON_DIR, `${name}-${tone}.png`) });

// Nodemailer attachment (without cid) for icon `name` in colour `hex`; `tone` is the requested
// ready-made tone. A manifest colour uses the file as it is (so default emails are unchanged);
// any other colour is tinted; if tinting fails the nearest ready-made tone is used. Never throws.
function iconAttachment(name, tone, hex, tint = tintIcon) {
  const filename = `${name}-${tone}.png`;
  if (typeof hex === 'string' && hex.toUpperCase() === MANIFEST.tones[tone].toUpperCase()) return fileOf(name, tone);
  try {
    return { filename, content: tint(name, hex) };
  } catch (err) {
    return fileOf(name, nearestTone(hex) || tone);
  }
}

module.exports = { tintIcon, nearestTone, iconAttachment, TINT_CACHE_MAX, _tintCacheSize: () => cache.size };
