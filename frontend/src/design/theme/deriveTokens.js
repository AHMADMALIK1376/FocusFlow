// Turns the student's three colours (+ optional text) into every colour token in tokens.css.
// Each token is a "recipe" measured once, at load, from today's default colours, so the
// default theme comes out exactly as shipped and other themes keep the same relationships
// (a card is a touch lighter than the page, a border a touch darker, and so on).
// Afterwards a guard nudges text colours until they are readable (WCAG AA).
import {
  hexToRgb, rgbToHex, rgbToTriplet, tripletToRgb, rgbToOklch, oklchToRgb,
  contrastRatio, relativeLuminance, WHITE, BLACK,
} from './color';
import { DEFAULT_THEME, sanitizeTheme, isDefaultPalette } from './theme';

// Not colours and not theme-dependent. Never set inline: that would defeat the
// prefers-reduced-motion override in tokens.css.
export const NON_THEME_VARS = [
  '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
  '--ease-spring', '--dur-fast', '--dur', '--dur-slow', '--glass-blur',
];

const STEP = 0.01;
const MAX_STEPS = 100;

// Today's colours: the reference every recipe is measured against.
const BG0 = hexToRgb(DEFAULT_THEME.background);
const BASE0 = {
  bg: BG0,
  brand: hexToRgb(DEFAULT_THEME.brand),
  accent: hexToRgb(DEFAULT_THEME.accent),
};
const INK0 = [52, 46, 62];

// rule: brand | accent | bg (lighter/darker than that colour), bgRaise (same, but lighter
// than the page on dark themes), mix (between text and page), text (the auto text colour).
// chroma: which colour the tint follows, or self (a fixed tint).
const RECIPES = {
  '--brand-deep': { ref: [241, 130, 127], rule: 'brand', chroma: 'brand' },
  '--on-brand': { ref: [255, 255, 255], rule: 'brand', chroma: 'brand' },
  '--on-sage': { ref: [40, 70, 52], rule: 'accent', chroma: 'accent' },
  '--sage-deep': { ref: [108, 178, 136], rule: 'accent', chroma: 'accent' },
  '--sage-mid': { ref: [143, 205, 166], rule: 'accent', chroma: 'accent' },
  '--icon': { ref: [108, 178, 136], rule: 'accent', chroma: 'accent' },
  '--logo': { ref: [255, 246, 232], rule: 'brand', chroma: 'bg' },
  '--blush': { ref: [255, 226, 222], rule: 'bgRaise', chroma: 'brand' },
  '--note-1': { ref: [255, 243, 196], rule: 'bgRaise', chroma: 'self' },
  '--note-2': { ref: [220, 238, 226], rule: 'bgRaise', chroma: 'accent' },
  '--note-3': { ref: [255, 222, 220], rule: 'bgRaise', chroma: 'brand' },
  '--note-4': { ref: [250, 240, 225], rule: 'bgRaise', chroma: 'bg' },
  '--surface': { ref: [255, 253, 249], rule: 'bg', chroma: 'bg' },
  '--surface-2': { ref: [250, 244, 235], rule: 'bg', chroma: 'bg' },
  '--border': { ref: [200, 176, 146], rule: 'bgRaise', chroma: 'bg' },
  '--highlight': { ref: [255, 255, 255], rule: 'bg', chroma: 'bg' },
  '--shadow-color': { ref: [190, 160, 122], rule: 'bg', chroma: 'bg' },
  '--shade': { ref: [214, 192, 162], rule: 'bg', chroma: 'bg' },
  '--muted': { ref: [128, 116, 108], rule: 'mix', chroma: 'bg' },
  '--ink-strong': { ref: [20, 20, 20], rule: 'mix', chroma: 'self' },
  '--chart-label': { ref: [54, 54, 54], rule: 'mix', chroma: 'self' },
  '--chart-axis': { ref: [138, 147, 160], rule: 'mix', chroma: 'self' },
  inkAuto: { ref: INK0, rule: 'text', chroma: 'self' },
  shadowTint: { ref: [232, 214, 190], rule: 'bg', chroma: 'bg' },
  heroStart: { ref: [245, 140, 137], rule: 'brand', chroma: 'brand' },
  brandHighlight: { ref: [255, 255, 255], rule: 'brand', chroma: 'brand' },
  brandTint: { ref: [255, 190, 185], rule: 'brand', chroma: 'brand' },
  sageLight: { ref: [206, 234, 214], rule: 'accent', chroma: 'accent' },
  blushLight: { ref: [255, 236, 233], rule: 'bgRaise', chroma: 'brand' },
  sageCardA: { ref: [226, 242, 231], rule: 'bgRaise', chroma: 'accent' },
  sageCardB: { ref: [206, 232, 214], rule: 'bgRaise', chroma: 'accent' },
  habitDoneA: { ref: [150, 206, 170], rule: 'accent', chroma: 'accent' },
  habitDoneB: { ref: [118, 184, 142], rule: 'accent', chroma: 'accent' },
  metaColor: { ref: [232, 101, 98], rule: 'brand', chroma: 'brand' },
  sageGlow: { ref: [120, 190, 150], rule: 'accent', chroma: 'accent' },
  sageGlowTint: { ref: [205, 232, 214], rule: 'accent', chroma: 'accent' },
};

// Colours that mean the same thing on every theme (streak/reward sun, status colours).
const FIXED = {
  '--brand-soft': [255, 215, 0],
  '--sun': [255, 215, 0],
  '--on-sun': [40, 52, 78],
  '--success': [62, 160, 108],
  '--info': [84, 150, 222],
  '--warn': [236, 170, 20],
  '--focus': [232, 84, 96],
  '--warn-ink': [133, 79, 11],
};

// Measure every recipe once, from the literal references above.
const L0 = {
  bg: rgbToOklch(BG0).L,
  ink: rgbToOklch(INK0).L,
};
const CAL = {};
Object.keys(RECIPES).forEach((name) => {
  const r = RECIPES[name];
  const ref = rgbToOklch(r.ref);
  const c = {};
  if (r.rule === 'mix') c.t = (ref.L - L0.ink) / (L0.bg - L0.ink);
  else if (r.rule === 'text') c.dL = ref.L - L0.bg;
  else c.dL = ref.L - rgbToOklch(r.rule === 'bgRaise' ? BASE0.bg : BASE0[r.rule]).L;
  if (r.chroma === 'self') {
    c.selfC = ref.C;
    c.selfH = ref.h;
  } else {
    const base = rgbToOklch(BASE0[r.chroma]);
    if (ref.C < 1e-4) {
      c.kC = 0;
      c.dh = 0;
    } else {
      c.kC = ref.C / base.C;
      c.dh = ref.h - base.h;
    }
  }
  CAL[name] = c;
});

// Contrast rules. First "against" colour is the main backdrop (never moved); the others
// may be moved if the text still fails. Required pairs use 4.5; extras use
// min(WCAG target, today's ratio), i.e. never worse than today.
export const GUARD = [
  { fg: '--ink', against: [['--canvas', 4.5], ['--surface', 4.5], ['--surface-2', 4.5], ['--highlight', 4.5], ['--blush', 4.5], ['blushLight', 4.5], ['sageCardA', 4.5], ['sageCardB', 4.5], ['--note-1', 4.5], ['--note-2', 4.5], ['--note-3', 4.5], ['--note-4', 4.5]] },
  { fg: '--muted', against: [['--surface', 4.5], ['--highlight', 4.5]] },
  { fg: '--ink-strong', against: [['--surface', 4.5]] },
  { fg: '--on-brand', against: [['--brand', 4.5], ['heroStart', 2.3]] },
  { fg: '--on-sage', against: [['--sage', 4.5], ['sageLight', 4.5], ['habitDoneA', 4.5], ['habitDoneB', 4.4]] },
  { fg: '--sage-deep', against: [['--surface', 2.4]] },
  { fg: '--icon', against: [['--surface', 2.4]] },
  { fg: '--chart-label', against: [['--surface', 4.5]] },
  { fg: '--chart-axis', against: [['--surface', 3]] },
  { fg: '--success', against: [['--surface', 3]] },
  { fg: '--info', against: [['--surface', 3]] },
  { fg: '--focus', against: [['--surface', 3]] },
  { fg: '--warn', against: [['--surface', 2]] },
  { fg: '--warn-ink', against: [['--surface', 4.5], ['warnWash', 4.5]], free: true }, // warnWash: the warn badge's own tint (warn at 20% over the card)
];

// Gradient stops that are not tokens on their own -> the gradient token that holds them.
const STOP_OWNER = {
  heroStart: '--grad-hero',
  sageLight: '--grad-sage',
  blushLight: '--grad-blush',
  sageCardA: '--grad-sage-card',
  sageCardB: '--grad-sage-card',
  habitDoneA: '--grad-sage-deep',
  habitDoneB: '--grad-sage-deep',
  warnWash: '--warn',
};

// The warn badge's tint is checked to 4.5, but on a mid-tone card (about a quarter of the way up
// from black, in a saturated hue) that cannot hold together with warn staying visible on the card.
// There the text keeps the best it can; this is the least that is accepted.
export const WASH_FLOOR = 3.9;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

function runGuard(map) {
  const flags = [];
  const flag = (name) => {
    const token = STOP_OWNER[name] || name;
    if (!flags.includes(token)) flags.push(token);
  };
  const passes = (fg, list) => list.every(([bg, min]) => contrastRatio(fg, map[bg]) >= min);

  // Walk a colour's lightness in steps until `ok(rgb)` holds (or it hits white/black).
  const walk = (rgb, dir, ok) => {
    const { L, C, h } = rgbToOklch(rgb);
    let cur = rgb;
    let l = L;
    for (let i = 0; i < MAX_STEPS + 1 && !ok(cur); i++) {
      l = clamp01(l + dir * STEP);
      cur = oklchToRgb({ L: l, C, h });
    }
    return cur;
  };

  // Everything read on the page or on cards moves the same way as the main text, so a
  // shared backdrop (e.g. --highlight) is never pushed lighter by one entry and darker by
  // another (on mid-tone backgrounds that left --ink white and --muted black).
  const syncWash = () => { map.warnWash = mixRgb(map['--surface'], map['--warn'], 0.2); };
  let textDir = null;
  const runEntry = ({ fg, against, free }) => {
    // warnWash is not a token: it is worked out from the card and warn colours each time they may have moved.
    syncWash();
    const primary = map[against[0][0]];
    const own = contrastRatio(WHITE, primary) > contrastRatio(BLACK, primary) ? 1 : -1;
    const onPage = against[0][0] === '--canvas' || against[0][0] === '--surface';
    // free: this text has its own backdrops (the warn badge tint is lighter than the card), so it
    // goes the way that suits its own backdrops, not the direction of the main text.
    const worst = (c) => Math.min(...against.map(([bg]) => contrastRatio(c, map[bg])));
    const main = ([bg, min]) => contrastRatio(WHITE, map[bg]) >= min;
    const mainB = ([bg, min]) => contrastRatio(BLACK, map[bg]) >= min;
    const okW = main(against[0]);
    const okB = mainB(against[0]);
    // The main backdrop (the card) must be reachable; the tint is then fixed by moving warn.
    const freeDir = okW !== okB ? (okW ? 1 : -1) : (worst(WHITE) >= worst(BLACK) ? 1 : -1);
    const dir = free ? freeDir : (onPage && textDir !== null ? textDir : own);
    const before = map[fg];
    if (!passes(before, against)) {
      map[fg] = walk(before, dir, (c) => passes(c, against));
    }
    if (!same(before, map[fg])) flag(fg);
    // Text at its limit and still failing: move the other backdrops away from it instead.
    against.slice(1).forEach(([bg, min]) => {
      if (contrastRatio(map[fg], map[bg]) >= min) return;
      if (bg === 'warnWash') {
        // The tint is not a colour of its own: move warn (what tints the badge) away from the text,
        // as far as warn stays visible against the card (2:1). On a mid-tone card both cannot hold;
        // the badge text then keeps the best it can (never under WASH_FLOOR, see contrastFailures).
        let w = map['--warn'];
        const { L, C, h } = rgbToOklch(w);
        let l = L;
        for (let i = 0; i < MAX_STEPS + 1; i++) {
          if (contrastRatio(map[fg], mixRgb(map['--surface'], w, 0.2)) >= min) break;
          l = clamp01(l - dir * STEP);
          const next = oklchToRgb({ L: l, C, h });
          if (contrastRatio(next, map['--surface']) < 2) break;
          w = next;
        }
        if (!same(w, map['--warn'])) { map['--warn'] = w; flag('--warn'); }
        syncWash();
        return;
      }
      const old = map[bg];
      map[bg] = walk(old, -dir, (c) => contrastRatio(map[fg], c) >= min);
      if (!same(old, map[bg])) flag(bg);
    });
    if (fg === '--ink') {
      textDir = relativeLuminance(map['--ink']) > relativeLuminance(map['--canvas']) ? 1 : -1;
    }
  };

  // Safety net: a later entry may still move a backdrop an earlier one checked, so repeat
  // until a full pass finds nothing to fix (it settles in one or two passes).
  for (let pass = 0; pass < 4; pass++) {
    GUARD.forEach(runEntry);
    syncWash();
    if (GUARD.every(({ fg, against }) => passes(map[fg], against))) break;
  }
  return flags;
}

export function deriveTokens(theme) {
  const t = sanitizeTheme(theme) || DEFAULT_THEME;
  const bg = hexToRgb(t.background);
  const brand = hexToRgb(t.brand);
  const accent = hexToRgb(t.accent);
  const bgL = rgbToOklch(bg);
  const light = contrastRatio(WHITE, bg) <= contrastRatio(BLACK, bg);
  const lift = 1 + Math.max(0, L0.bg - bgL.L) / L0.bg;
  const bases = { bg, brand, accent };

  let ink = null; // filled once inkAuto is known
  const make = (name) => {
    const r = RECIPES[name];
    const c = CAL[name];
    let L;
    if (r.rule === 'mix') {
      const inkL = rgbToOklch(ink).L;
      L = inkL + c.t * (bgL.L - inkL);
    } else if (r.rule === 'text') {
      L = light ? bgL.L + c.dL : L0.bg;
    } else if (r.rule === 'bg' || r.rule === 'bgRaise') {
      let d = c.dL;
      if (!light && r.rule === 'bgRaise') d = Math.abs(d);
      if (d > 0) d *= lift;
      L = bgL.L + d;
    } else {
      L = rgbToOklch(bases[r.rule]).L + c.dL;
    }
    let C;
    let h;
    if (r.chroma === 'self') {
      C = c.selfC;
      h = c.selfH;
    } else {
      const base = rgbToOklch(bases[r.chroma]);
      C = base.C * c.kC;
      h = base.h + c.dh;
    }
    return oklchToRgb({ L, C, h });
  };

  ink = t.text === 'auto' ? make('inkAuto') : hexToRgb(t.text);

  const map = {
    '--canvas': bg,
    '--brand': brand,
    '--sage': accent,
    '--ink': ink,
    ...FIXED,
  };
  Object.keys(RECIPES).forEach((name) => {
    if (name !== 'inkAuto') map[name] = make(name);
  });
  if (t.logo) map['--logo'] = hexToRgb(t.logo);
  if (t.icon) map['--icon'] = hexToRgb(t.icon);

  const flags = isDefaultPalette(t) ? [] : runGuard(map);

  const trip = (name) => rgbToTriplet(map[name]);
  const HL = trip('--highlight');
  const SC = trip('--shadow-color');
  const TINT = trip('shadowTint');
  const SHADE = trip('--shade');
  const BR = trip('--brand');
  const BHL = trip('brandHighlight');
  const BTINT = trip('brandTint');
  const G = trip('sageGlow');
  const GT = trip('sageGlowTint');
  const g = (a, b) => `linear-gradient(160deg, rgb(${a}), rgb(${b}))`;

  const tokens = {
    '--brand': trip('--brand'),
    '--brand-deep': trip('--brand-deep'),
    '--brand-soft': trip('--brand-soft'),
    '--on-brand': trip('--on-brand'),
    '--sun': trip('--sun'),
    '--on-sun': trip('--on-sun'),
    '--sage': trip('--sage'),
    '--on-sage': trip('--on-sage'),
    '--sage-deep': trip('--sage-deep'),
    '--sage-mid': trip('--sage-mid'),
    '--icon': trip('--icon'),
    '--blush': trip('--blush'),
    '--logo': trip('--logo'),
    '--note-1': trip('--note-1'),
    '--note-2': trip('--note-2'),
    '--note-3': trip('--note-3'),
    '--note-4': trip('--note-4'),
    '--success': trip('--success'),
    '--info': trip('--info'),
    '--warn': trip('--warn'),
    '--warn-ink': trip('--warn-ink'),
    '--focus': trip('--focus'),
    '--canvas': trip('--canvas'),
    '--surface': trip('--surface'),
    '--surface-2': trip('--surface-2'),
    '--ink': trip('--ink'),
    '--ink-strong': trip('--ink-strong'),
    '--muted': trip('--muted'),
    '--border': trip('--border'),
    '--highlight': HL,
    '--shadow-color': SC,
    '--shade': SHADE,
    '--chart-label': trip('--chart-label'),
    '--chart-axis': trip('--chart-axis'),
    '--shadow-neu': `0 16px 30px -14px rgb(${SC} / 0.42), 0 6px 12px -8px rgb(${SC} / 0.24), inset 0 -6px 12px rgb(${TINT} / 0.30), inset 0 6px 10px rgb(${HL} / 0.95)`,
    '--shadow-neu-sm': `0 8px 16px -8px rgb(${SC} / 0.40), inset 0 -3px 6px rgb(${TINT} / 0.30), inset 0 3px 5px rgb(${HL} / 0.9)`,
    '--shadow-neu-inset': `inset 0 4px 8px rgb(${SHADE} / 0.35), inset 0 -2px 4px rgb(${HL} / 0.9)`,
    '--shadow-clay-brand': `0 14px 26px -12px rgb(${BR} / 0.50), inset 0 6px 10px rgb(${BHL} / 0.38), inset 0 -6px 12px rgb(${BTINT} / 0.35)`,
    '--shadow-clay-sage': `0 14px 26px -12px rgb(${G} / 0.45), 0 6px 12px -8px rgb(${G} / 0.3), inset 0 -6px 12px rgb(${GT} / 0.4), inset 0 6px 10px rgb(${HL} / 0.95)`,
    '--shadow-heading': `0 2px 0 rgb(${HL} / 0.85), 0 6px 14px rgb(${SC} / 0.28)`,
    '--glass-bg': trip('--surface'),
    '--glass-border': trip('--border'),
    '--shadow-glass': `0 24px 48px -16px rgb(${SC} / 0.45), inset 0 4px 8px rgb(${HL} / 0.8)`,
    '--grad-hero': g(trip('heroStart'), 'var(--brand)'),
    '--grad-aurora': 'linear-gradient(135deg, rgb(var(--brand)) 0%, rgb(var(--brand-soft)) 100%)',
    '--grad-sun': 'linear-gradient(160deg, rgb(255 226 80), rgb(255 212 0))',
    '--grad-sage': g(trip('sageLight'), 'var(--sage)'),
    '--grad-blush': g(trip('blushLight'), 'var(--blush)'),
    '--grad-sage-card': g(trip('sageCardA'), trip('sageCardB')),
    '--grad-sage-deep': g(trip('habitDoneA'), trip('habitDoneB')),
  };

  return {
    tokens,
    flags,
    scheme: light ? 'light' : 'dark',
    metaColor: rgbToHex(map.metaColor),
    // Internal recipe colours, read by the backend email palette. Not a token; never cached.
    extras: Object.fromEntries(['shadowTint', 'heroStart', 'brandHighlight', 'brandTint', 'sageLight', 'blushLight', 'sageCardA']
      .map((name) => [name, trip(name)])),
  };
}

// Checks a finished token set against GUARD. Returns one line per failing pair.
export function contrastFailures(tokens) {
  const stops = {};
  const stopsOf = (token) => [...String(tokens[token]).matchAll(/rgb\((\d+) (\d+) (\d+)\)/g)]
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
  [stops.heroStart] = stopsOf('--grad-hero');
  [stops.sageLight] = stopsOf('--grad-sage');
  [stops.blushLight] = stopsOf('--grad-blush');
  [stops.sageCardA, stops.sageCardB] = stopsOf('--grad-sage-card');
  [stops.habitDoneA, stops.habitDoneB] = stopsOf('--grad-sage-deep');
  stops.warnWash = mixRgb(tripletToRgb(tokens['--surface']), tripletToRgb(tokens['--warn']), 0.2);
  const read = (name) => stops[name] || tripletToRgb(tokens[name]);

  const out = [];
  GUARD.forEach(({ fg, against }) => {
    const f = read(fg);
    against.forEach(([bg, min]) => {
      const ratio = contrastRatio(f, read(bg));
      if (ratio < (bg === 'warnWash' ? WASH_FLOOR : min)) out.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
    });
  });
  return out;
}
