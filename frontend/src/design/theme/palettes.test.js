import { PALETTE_GROUPS, PALETTES, SWATCHES, TEXT_SWATCHES, paletteTheme } from './palettes';
import { deriveTokens, contrastFailures } from './deriveTokens';
import { DEFAULT_THEME, HEX_RE, PRESET_RE, isDefaultPalette, sanitizeTheme } from './theme';
import { hexToRgb, rgbToTriplet, tripletToRgb, contrastRatio } from './color';

const UPPER_HEX = /^#[0-9A-F]{6}$/;
const trip = (hex) => rgbToTriplet(hexToRgb(hex));

describe('palette library', () => {
  it('has three groups with at least 8 palettes each and 24 in total', () => {
    expect(PALETTE_GROUPS.map((g) => g.id)).toEqual(['soft', 'bold', 'dark']);
    PALETTE_GROUPS.forEach((g) => {
      expect(PALETTES.filter((p) => p.group === g.id).length).toBeGreaterThanOrEqual(8);
      expect(g.name && g.blurb).toBeTruthy();
    });
    expect(PALETTES.length).toBeGreaterThanOrEqual(24);
  });

  it('has unique ids and names, valid ids, uppercase hex values and a clean theme', () => {
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length);
    expect(new Set(PALETTES.map((p) => p.name)).size).toBe(PALETTES.length);
    PALETTES.forEach((p) => {
      expect(PRESET_RE.test(p.id)).toBe(true);
      ['background', 'brand', 'accent', 'text'].forEach((k) => {
        expect(HEX_RE.test(p[k])).toBe(true);
        expect(p[k]).toMatch(UPPER_HEX);
      });
      expect(sanitizeTheme(paletteTheme(p))).not.toBeNull();
      expect(paletteTheme(p).presetId).toBe(p.id);
    });
  });

  it('is not the default palette', () => {
    PALETTES.forEach((p) => expect(isDefaultPalette(paletteTheme(p))).toBe(false));
  });

  describe.each(PALETTES.map((p) => [p.id, p]))('%s', (id, p) => {
    const r = deriveTokens(paletteTheme(p));
    it('passes every contrast rule', () => {
      expect(contrastFailures(r.tokens)).toEqual([]);
    });
    it('keeps its own background, brand, accent and text exactly', () => {
      expect(r.tokens['--canvas']).toBe(trip(p.background));
      expect(r.tokens['--brand']).toBe(trip(p.brand));
      expect(r.tokens['--sage']).toBe(trip(p.accent));
      expect(r.tokens['--ink']).toBe(trip(p.text));
    });
    it('does not need to move the text or the cards', () => {
      expect(r.flags).not.toContain('--ink');
      expect(r.flags).not.toContain('--surface');
    });
    it('has the right scheme for its group', () => {
      expect(r.scheme).toBe(p.group === 'dark' ? 'dark' : 'light');
    });
  });
});

describe('swatches', () => {
  const all = [...Object.values(SWATCHES).flat(), ...Object.values(TEXT_SWATCHES).flat()];
  it('every swatch has a name and an uppercase hex', () => {
    all.forEach((s) => {
      expect(s.name).toBeTruthy();
      expect(s.hex).toMatch(UPPER_HEX);
    });
    expect(Object.keys(SWATCHES)).toEqual(['soft', 'bold', 'dark']);
    expect(Object.keys(TEXT_SWATCHES)).toEqual(['dark', 'light']);
  });
  it('names are unique inside a row', () => {
    [...Object.values(SWATCHES), ...Object.values(TEXT_SWATCHES)].forEach((row) => {
      expect(new Set(row.map((s) => s.name)).size).toBe(row.length);
    });
  });
  it('can reach the default colours', () => {
    expect(SWATCHES.soft.find((s) => s.name === 'Sage').hex).toBe(DEFAULT_THEME.accent);
    expect(SWATCHES.bold.find((s) => s.name === 'Coral').hex).toBe(DEFAULT_THEME.brand);
    expect(SWATCHES.soft.find((s) => s.name === 'Cream').hex).toBe(DEFAULT_THEME.background);
  });
});

// The matrix in decision.md: every library palette reaches AA on the five required pairs and on the
// warn badge (warn at 20% over the card), including the dark ones (the guard once ignored the tint).
describe('palette library contrast matrix', () => {
  const rgb = (tokens, name) => tripletToRgb(tokens[name]);
  it.each(PALETTES.map((p) => [p.name, p]))('%s: required pairs and the warn badge are at least 4.5:1', (_n, p) => {
    const { tokens } = deriveTokens(paletteTheme(p));
    const wash = rgb(tokens, '--surface').map((v, i) => Math.round(v + (rgb(tokens, '--warn')[i] - v) * 0.2));
    [['--ink', '--canvas'], ['--ink', '--surface'], ['--muted', '--surface'], ['--on-brand', '--brand'], ['--on-sage', '--sage']]
      .forEach(([f, b]) => expect(contrastRatio(rgb(tokens, f), rgb(tokens, b))).toBeGreaterThanOrEqual(4.5));
    expect(contrastRatio(rgb(tokens, '--warn-ink'), wash)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PALETTES.map((p) => [p.name, p]))('%s: the focus ring shows (3:1) on the card and on the page, and brand is untouched', (_n, p) => {
    const theme = paletteTheme(p);
    const { tokens } = deriveTokens(theme);
    expect(contrastRatio(rgb(tokens, '--ring'), rgb(tokens, '--surface'))).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(rgb(tokens, '--ring'), rgb(tokens, '--canvas'))).toBeGreaterThanOrEqual(3);
    expect(tokens['--brand']).toBe(rgbToTriplet(hexToRgb(theme.brand)));
  });
});
