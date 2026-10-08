import fs from 'fs';
import path from 'path';
import { deriveTokens, contrastFailures, NON_THEME_VARS, WASH_FLOOR, TINT_FLOOR } from './deriveTokens';
import { DEFAULT_THEME, isDefaultPalette } from './theme';
import { SWATCHES } from './palettes';
import { tripletToRgb, hexToRgb, rgbToTriplet, contrastRatio } from './color';

// Small deterministic random numbers (same palettes on every run and machine).
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const hex = (rnd) => '#' + Array.from({ length: 3 }, () => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('').toUpperCase();

function makePalettes(count, seed) {
  const rnd = lcg(seed);
  return Array.from({ length: count }, () => ({
    ...DEFAULT_THEME,
    presetId: 'random',
    background: hex(rnd),
    brand: hex(rnd),
    accent: hex(rnd),
    text: rnd() < 0.3 ? hex(rnd) : 'auto',
  }));
}

const SHAPE_ONLY = /^--(shadow-(neu|neu-sm|neu-inset|clay-brand|clay-sage|heading|glass)|grad-.*)$/;

describe('random palettes (property test)', () => {
  const palettes = makePalettes(200, 20261007);

  it('uses a stable generator', () => {
    expect(palettes[0]).toEqual(makePalettes(1, 20261007)[0]);
    expect(new Set(palettes.map((p) => p.background + p.brand + p.accent)).size).toBeGreaterThan(190);
  });

  it('every palette derives without throwing, passes every contrast rule, and has valid triplets', () => {
    const bad = [];
    palettes.forEach((theme) => {
      let r;
      try {
        r = deriveTokens(theme);
      } catch (e) {
        bad.push({ theme, threw: String(e) });
        return;
      }
      const fails = contrastFailures(r.tokens);
      if (fails.length) bad.push({ theme, fails });
      Object.entries(r.tokens).forEach(([k, v]) => {
        if (SHAPE_ONLY.test(k)) {
          if (/NaN|undefined|Infinity/.test(v)) bad.push({ theme, token: k, v });
          return;
        }
        const rgb = tripletToRgb(v);
        if (!rgb || !/^\d{1,3} \d{1,3} \d{1,3}$/.test(v)) bad.push({ theme, token: k, v });
      });
      if (!['light', 'dark'].includes(r.scheme) || !/^#[0-9A-F]{6}$/.test(r.metaColor)) bad.push({ theme, scheme: r.scheme, meta: r.metaColor });
      if (Object.keys(r.tokens).some((k) => NON_THEME_VARS.includes(k))) bad.push({ theme, motion: true });
    });
    expect(bad).toEqual([]);
  });

  it('badge text reaches 4.5:1 on the card and at least the tint floor on its tint, for every palette', () => {
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const tints = [['--warn-ink', '--warn', 0.2, WASH_FLOOR], ['--success-ink', '--success', 0.15, TINT_FLOOR], ['--info-ink', '--info', 0.15, TINT_FLOOR],
      ['--focus-ink', '--focus', 0.15, TINT_FLOOR], ['--brand-ink', '--brand', 0.1, TINT_FLOOR], ['--muted-ink', '--ink', 0.08, TINT_FLOOR]];
    const bad = [];
    palettes.forEach((theme) => {
      const { tokens } = deriveTokens(theme);
      const card = tripletToRgb(tokens['--surface']);
      tints.forEach(([text, colour, alpha, floor]) => {
        const f = tripletToRgb(tokens[text]);
        const onCard = contrastRatio(f, card);
        const onTint = contrastRatio(f, mix(card, tripletToRgb(tokens[colour]), alpha));
        if (onTint < floor || onCard < 4.5) bad.push({ theme, text, onCard, onTint });
      });
      if (tokens['--brand'] !== rgbToTriplet(hexToRgb(theme.brand))) bad.push({ theme, brandMoved: true });
    });
    expect(bad).toEqual([]);
  });

  it('text on the solid status fills reaches 4.5:1 (3:1 for the tick) for every palette', () => {
    const bad = [];
    palettes.forEach((theme) => {
      const { tokens } = deriveTokens(theme);
      const c = (a, b) => contrastRatio(tripletToRgb(tokens[a]), tripletToRgb(tokens[b]));
      const r = [c('--on-focus', '--focus'), c('--on-warn', '--warn'), c('--on-success', '--success')];
      if (r[0] < 4.5 || r[1] < 4.5 || r[2] < 3) bad.push({ theme, r });
    });
    expect(bad).toEqual([]);
  });

  it('text on the status fills is readable for every Studio background and brand swatch (the review found 1,152 failing combinations)', () => {
    const all = [...SWATCHES.soft, ...SWATCHES.bold, ...SWATCHES.dark].map((s) => s.hex);
    const bad = [];
    all.forEach((background) => all.forEach((brand) => {
      const theme = { ...DEFAULT_THEME, presetId: 'x', background, brand };
      if (isDefaultPalette(theme)) return; // the default keeps today's colours (exempt)
      const { tokens } = deriveTokens(theme);
      const c = (a, b) => contrastRatio(tripletToRgb(tokens[a]), tripletToRgb(tokens[b]));
      if (c('--on-focus', '--focus') < 4.5 || c('--on-warn', '--warn') < 4.5 || c('--on-success', '--success') < 3) bad.push({ background, brand });
    }));
    expect(bad).toEqual([]);
  });

  it('the focus ring shows (3:1) on the card and the page for every palette, and brand is never moved', () => {
    const bad = [];
    palettes.forEach((theme) => {
      const { tokens } = deriveTokens(theme);
      const ring = tripletToRgb(tokens['--ring']);
      const lows = ['--surface', '--canvas'].map((b) => contrastRatio(ring, tripletToRgb(tokens[b])));
      if (Math.min(...lows) < 3 || tokens['--brand'] !== rgbToTriplet(hexToRgb(theme.brand))) bad.push({ theme, lows });
    });
    expect(bad).toEqual([]);
  });

  it('is deterministic for every palette', () => {
    palettes.slice(0, 40).forEach((t) => expect(deriveTokens(t)).toEqual(deriveTokens({ ...t })));
  });
});

// Proves the "no visual change" comparison would notice an edit to tokens.css.
describe('the default-equals-tokens.css comparison can fail', () => {
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const css = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const parsed = {};
  block.split(';').forEach((d) => {
    const i = d.indexOf(':');
    const n = d.slice(0, i).trim();
    if (n.startsWith('--')) parsed[n] = norm(d.slice(i + 1));
  });
  const mismatches = (copy) => Object.entries(deriveTokens(DEFAULT_THEME).tokens)
    .filter(([k, v]) => norm(v) !== copy[k]).map(([k]) => k);

  it('finds nothing in an untouched copy', () => {
    expect(mismatches({ ...parsed })).toEqual([]);
  });

  it('catches a one-digit change to a colour, a gradient and a shadow', () => {
    expect(mismatches({ ...parsed, '--brand': '236 112 110' })).toEqual(['--brand']);
    expect(mismatches({ ...parsed, '--grad-hero': parsed['--grad-hero'].replace('245', '244') })).toEqual(['--grad-hero']);
    expect(mismatches({ ...parsed, '--shadow-neu': parsed['--shadow-neu'].replace('0.42', '0.43') })).toEqual(['--shadow-neu']);
  });

  it('catches a token removed from the copy', () => {
    const { '--ink-strong': gone, ...rest } = parsed;
    expect(gone).toBeDefined();
    expect(mismatches(rest)).toEqual(['--ink-strong']);
  });
});
