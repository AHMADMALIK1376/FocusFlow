import fs from 'fs';
import path from 'path';
import { deriveTokens, contrastFailures, NON_THEME_VARS } from './deriveTokens';
import { DEFAULT_THEME } from './theme';
import { contrastRatio, relativeLuminance, tripletToRgb } from './color';

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function parseTokensCss() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const out = {};
  block.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    const name = decl.slice(0, i).trim();
    if (name.startsWith('--')) out[name] = norm(decl.slice(i + 1));
  });
  return out;
}

const mk = (background, brand, accent, text = 'auto', extra = {}) => ({
  ...DEFAULT_THEME, presetId: 'test', background, brand, accent, text, ...extra,
});

const PALETTES = {
  1: mk('#FFFFFF', '#EC706D', '#B8DCC4'),
  2: mk('#000000', '#EC706D', '#B8DCC4'),
  3: mk('#F5EFE6', '#39FF14', '#FF00FF'),
  4: mk('#808080', '#808080', '#808080'),
  5: mk('#F5EFE6', '#F4EEE5', '#F6F0E7'),
  6: mk('#1A0B3D', '#FF6B6B', '#4ECDC4'),
  7: mk('#0F172A', '#1E3A8A', '#334155'),
  8: mk('#FFFFFF', '#FFF3B0', '#FFFDE7'),
  9: mk('#F5EFE6', '#EC706D', '#B8DCC4', '#F0F0F0'),
  10: mk('#121212', '#BB86FC', '#03DAC6', '#222222'),
  11: mk('#777777', '#FF0000', '#00FF00'),
  12: mk('#000000', '#000000', '#000000'),
  13: mk('#FFFFFF', '#FFFFFF', '#FFFFFF'),
  14: mk('#39FF14', '#FF00FF', '#00FFFF'),
  15: mk('#F5EFE6', '#EC706D', '#B8DCC4', '#342E3E'),
  16: mk('#FFFFFF', '#EC706D', '#B8DCC4', 'auto', { icon: '#FFFFFF', logo: '#000000' }),
};

const rgbOf = (tokens, name) => tripletToRgb(tokens[name]);

describe('default theme', () => {
  const css = parseTokensCss();
  const result = deriveTokens(DEFAULT_THEME);

  it('reproduces tokens.css exactly (no visual change)', () => {
    Object.keys(result.tokens).forEach((k) => {
      expect(`${k}: ${norm(result.tokens[k])}`).toBe(`${k}: ${css[k]}`);
    });
  });

  it('covers every token in tokens.css (except motion and shape)', () => {
    expect([...Object.keys(result.tokens), ...NON_THEME_VARS].sort()).toEqual(Object.keys(css).sort());
  });

  it('hands the backend its email colours as extras (never stored as tokens)', () => {
    expect(result.extras).toEqual({
      shadowTint: '232 214 190', heroStart: '245 140 137', brandHighlight: '255 255 255', brandTint: '255 190 185',
      sageLight: '206 234 214', blushLight: '255 236 233', sageCardA: '226 242 231',
    });
    expect(Object.keys(result.tokens)).not.toContain('extras');
  });

  it('uses exactly the brand colour for the focus ring, so the default looks the same as before', () => {
    expect(result.tokens['--ring']).toBe(result.tokens['--brand']);
  });

  it('has no flags, is light, and keeps the status bar colour', () => {
    expect(result.flags).toEqual([]);
    expect(result.scheme).toBe('light');
    expect(result.metaColor).toBe('#E86562');
  });

  it('documents the pairs the default fails today (the focus ring is the brand colour here, so it shares its limits)', () => {
    expect(contrastFailures(result.tokens)).toEqual([
      '--muted on --surface: 4.46 < 4.5',
      '--on-brand on --brand: 2.96 < 4.5',
      '--ring on --surface: 2.91 < 3',
      '--ring on --canvas: 2.59 < 3',
      // text on a badge tint: the default keeps today's tone colours (exempt, like the rest of the default)
      '--success-ink on --surface: 3.20 < 4.5',
      '--success-ink on successWash: 2.74 < 3.8',
      '--info-ink on --surface: 3.04 < 4.5',
      '--info-ink on infoWash: 2.63 < 3.8',
      '--focus-ink on --surface: 3.52 < 4.5',
      '--focus-ink on focusWash: 2.95 < 3.8',
      '--brand-ink on --surface: 2.91 < 4.5',
      '--brand-ink on brandWash: 2.64 < 3.8',
      '--muted-ink on --surface: 4.46 < 4.5',
      '--on-focus on --focus: 3.58 < 4.5',
    ]);
  });

  it('the badge text tokens are exactly the text colours the badges used before', () => {
    const t = result.tokens;
    expect(t['--success-ink']).toBe(t['--success']);
    expect(t['--info-ink']).toBe(t['--info']);
    expect(t['--focus-ink']).toBe(t['--focus']);
    expect(t['--brand-ink']).toBe(t['--brand']);
    expect(t['--muted-ink']).toBe(t['--muted']);
    expect(t['--warn-ink']).toBe('133 79 11');
  });

  it('the text-on-status tokens are exactly the text colours used on the status fills before', () => {
    expect(result.tokens['--on-focus']).toBe('255 255 255');
    expect(result.tokens['--on-success']).toBe('255 255 255');
    expect(result.tokens['--on-warn']).toBe(result.tokens['--on-sun']);
  });
});

describe('other palettes', () => {
  Object.entries(PALETTES).forEach(([n, theme]) => {
    describe(`palette ${n} ${theme.background}/${theme.brand}/${theme.accent}/${theme.text}`, () => {
      const { tokens } = deriveTokens(theme);

      it('passes every contrast rule', () => {
        expect(contrastFailures(tokens)).toEqual([]);
      });

      it('passes the five required pairs', () => {
        const c = (a, b) => contrastRatio(rgbOf(tokens, a), rgbOf(tokens, b));
        expect(c('--ink', '--canvas')).toBeGreaterThanOrEqual(4.5);
        expect(c('--ink', '--surface')).toBeGreaterThanOrEqual(4.5);
        expect(c('--muted', '--surface')).toBeGreaterThanOrEqual(4.5);
        expect(c('--on-brand', '--brand')).toBeGreaterThanOrEqual(4.5);
        expect(c('--on-sage', '--sage')).toBeGreaterThanOrEqual(4.5);
      });

      it('makes only well-formed triplets', () => {
        Object.entries(tokens).forEach(([k, v]) => {
          if (/^--(shadow-(neu|neu-sm|neu-inset|clay-brand|clay-sage|heading|glass)|grad-.*)$/.test(k)) return;
          expect(v).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
          v.split(' ').forEach((x) => expect(Number(x)).toBeLessThanOrEqual(255));
        });
      });

      it('is deterministic', () => {
        expect(deriveTokens(theme)).toEqual(deriveTokens({ ...theme }));
      });
    });
  });

  it('reports which tokens the guard changed', () => {
    expect(deriveTokens(PALETTES[9]).flags).toContain('--ink');
    const f15 = deriveTokens(PALETTES[15]).flags;
    expect(f15).toContain('--muted');
    expect(f15).toContain('--on-brand');
    const r16 = deriveTokens(PALETTES[16]);
    expect(r16.flags).toContain('--icon');
    expect(r16.tokens['--logo']).toBe('0 0 0');
  });

  it('keeps a user logo and icon when they are readable', () => {
    const r = deriveTokens(mk('#FFFFFF', '#EC706D', '#B8DCC4', 'auto', { icon: '#222222', logo: '#FEDCBA' }));
    expect(r.tokens['--icon']).toBe('34 34 34');
    expect(r.tokens['--logo']).toBe('254 220 186');
  });

  [2, 6].forEach((n) => {
    it(`palette ${n} behaves like a dark theme`, () => {
      const r = deriveTokens(PALETTES[n]);
      const y = (name) => relativeLuminance(rgbOf(r.tokens, name));
      expect(r.scheme).toBe('dark');
      expect(y('--surface')).toBeGreaterThan(y('--canvas'));
      expect(y('--shadow-color')).toBeLessThanOrEqual(y('--canvas'));
      expect(y('--highlight')).toBeGreaterThan(y('--canvas'));
      expect(r.tokens['--highlight']).not.toBe('255 255 255');
      expect(y('--border')).toBeGreaterThan(y('--canvas'));
      expect(y('--ink')).toBeGreaterThan(y('--canvas'));
    });
  });

  it('light palettes report a light scheme', () => {
    expect(deriveTokens(PALETTES[1]).scheme).toBe('light');
  });
});

describe('corrupted input', () => {
  const base = deriveTokens(DEFAULT_THEME);
  [null, undefined, 'x', { brand: 'red' }, { ...DEFAULT_THEME, v: 9 }].forEach((bad) => {
    it(`falls back to the default for ${JSON.stringify(bad)}`, () => {
      expect(deriveTokens(bad)).toEqual(base);
    });
  });
});
