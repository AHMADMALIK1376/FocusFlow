import { DEFAULT_THEME, sanitizeTheme, isDefaultPalette } from './theme';

const ok = (over) => ({ ...DEFAULT_THEME, ...over });

describe('sanitizeTheme', () => {
  it('accepts the default theme', () => {
    expect(sanitizeTheme(DEFAULT_THEME)).toEqual(DEFAULT_THEME);
  });

  it('uppercases hex and keeps logo and icon', () => {
    const out = sanitizeTheme(ok({ background: '#abcdef', logo: '#0a0b0c', icon: '#ffffff', text: '#112233' }));
    expect(out).toEqual(ok({ background: '#ABCDEF', logo: '#0A0B0C', icon: '#FFFFFF', text: '#112233' }));
  });

  it('returns a new object', () => {
    expect(sanitizeTheme(DEFAULT_THEME)).not.toBe(DEFAULT_THEME);
  });

  it('rejects anything malformed', () => {
    const { brand, ...missing } = DEFAULT_THEME;
    [
      null, undefined, [], 'x', 5, missing,
      ok({ v: 2 }), ok({ v: '1' }),
      ok({ brand: '#FFF' }), ok({ brand: 'red' }), ok({ text: 'Auto' }),
      ok({ extra: 1 }),
      ok({ presetId: 'has space' }), ok({ presetId: 'a'.repeat(33) }),
      ok({ logo: null }), ok({ icon: 'blue' }),
    ].forEach((v) => expect(sanitizeTheme(v)).toBeNull());
  });
});

describe('isDefaultPalette', () => {
  it('is true for the default colours whatever the preset name or hex case', () => {
    expect(isDefaultPalette(DEFAULT_THEME)).toBe(true);
    expect(isDefaultPalette(ok({ presetId: 'mine', background: '#f5efe6' }))).toBe(true);
  });

  it('is false when anything differs', () => {
    expect(isDefaultPalette(ok({ text: '#342E3E' }))).toBe(false);
    expect(isDefaultPalette(ok({ logo: '#000000' }))).toBe(false);
    expect(isDefaultPalette(ok({ icon: '#000000' }))).toBe(false);
    expect(isDefaultPalette(ok({ brand: '#EC706E' }))).toBe(false);
    expect(isDefaultPalette(null)).toBe(false);
  });
});
