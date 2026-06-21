import { fontStack, FONT_OPTIONS, DEFAULT_FONT } from './fonts';

describe('fontStack', () => {
  it('returns the Inter stack for id "inter"', () => {
    const stack = fontStack('inter');
    expect(stack).toContain('Inter');
  });

  it('returns the Poppins stack for id "poppins"', () => {
    const stack = fontStack('poppins');
    expect(stack).toContain('Poppins');
  });

  it('falls back to Poppins for an unknown id', () => {
    const stack = fontStack('unknown-font-xyz');
    expect(stack).toContain('Poppins');
  });

  it('returns a non-empty string for every FONT_OPTIONS entry', () => {
    FONT_OPTIONS.forEach((f) => {
      const s = fontStack(f.id);
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    });
  });
});

describe('DEFAULT_FONT', () => {
  it('is "poppins"', () => {
    expect(DEFAULT_FONT).toBe('poppins');
  });
});
