// Recolours the sign-in illustrations (Lottie JSON) to the student's brand colour. Only the decoration
// (blue, purple and cyan fills and strokes) turns by the same hue shift as the brand moved from the normal
// coral; skin, hair, white, greys and yellow keep their colours. The art itself is never replaced.
import { hexToRgb, rgbToOklch, oklchToRgb } from './color';
import { DEFAULT_THEME } from './theme';

export const DECOR_MIN_C = 0.08;      // OKLCH chroma; below this a colour is a grey/skin/neutral and stays
export const DECOR_HUES = [180, 300]; // degrees: the art's blue, purple and cyan decoration
const GREY_BRAND_C = 0.03;            // a brand this dull has no hue to turn to: decoration is desaturated instead
const GREY_DECOR_C = 0.02;

const DEFAULT_HUE = rgbToOklch(hexToRgb(DEFAULT_THEME.brand)).h;
const degrees = (rad) => (((rad * 180) / Math.PI) % 360 + 360) % 360;
const memo = new WeakMap(); // data -> Map(brandHex -> recoloured copy)

// Changes one [r, g, b(, a)] colour (0..1) in place when it is decoration. Alpha is untouched.
function shift(rgba, dh, grey) {
  if (!Array.isArray(rgba) || rgba.length < 3 || !rgba.slice(0, 3).every((v) => typeof v === 'number')) return;
  const { L, C, h } = rgbToOklch(rgba.slice(0, 3).map((v) => v * 255));
  const deg = degrees(h);
  if (C < DECOR_MIN_C || deg < DECOR_HUES[0] || deg > DECOR_HUES[1]) return;
  const out = oklchToRgb({ L, C: grey ? GREY_DECOR_C : C, h: h + dh });
  for (let i = 0; i < 3; i++) rgba[i] = out[i] / 255;
}

function recolour(node, dh, grey) {
  if (Array.isArray(node)) {
    node.forEach((child) => recolour(child, dh, grey));
    return;
  }
  if (!node || typeof node !== 'object') return;
  if ((node.ty === 'fl' || node.ty === 'st') && node.c && typeof node.c === 'object') {
    if (node.c.a === 1 && Array.isArray(node.c.k)) {
      node.c.k.forEach((frame) => {
        if (frame && typeof frame === 'object') {
          shift(frame.s, dh, grey);
          shift(frame.e, dh, grey);
        }
      });
    } else {
      shift(node.c.k, dh, grey);
    }
  }
  Object.keys(node).forEach((key) => recolour(node[key], dh, grey));
}

// The same object for no or the normal brand; otherwise a recoloured deep copy (remembered per brand).
export function tintLottie(data, brandHex) {
  const brand = typeof brandHex === 'string' ? hexToRgb(brandHex) : null;
  if (!data || typeof data !== 'object' || !brand || brandHex.toUpperCase() === DEFAULT_THEME.brand) return data;
  const key = brandHex.toUpperCase();
  if (!memo.has(data)) memo.set(data, new Map());
  const byBrand = memo.get(data);
  if (!byBrand.has(key)) {
    const b = rgbToOklch(brand);
    const copy = JSON.parse(JSON.stringify(data));
    recolour(copy, b.h - DEFAULT_HUE, b.C < GREY_BRAND_C);
    byBrand.set(key, copy);
  }
  return byBrand.get(key);
}
