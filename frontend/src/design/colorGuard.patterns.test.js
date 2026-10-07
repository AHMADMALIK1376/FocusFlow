import fs from 'fs';
import path from 'path';
import { COLOR_ALLOWLIST } from './colorAllowlist';

// The guard's own patterns, taken straight from colorGuard.test.js so these cases test the real thing.
const guardSource = fs.readFileSync(path.join(__dirname, 'colorGuard.test.js'), 'utf8');
const literal = (name) => new Function(`return ${guardSource.match(new RegExp(`const ${name} = (/.+/[a-z]*);`))[1]};`)(); // eslint-disable-line no-new-func
const HEX = literal('HEX');
const FUNC = literal('FUNC');
const hits = (text) => [...text.matchAll(HEX), ...text.matchAll(FUNC)].map((m) => m[0]);

describe('what the colour guard flags', () => {
  it.each([
    ['color: #fff;', ['#fff']],
    ['"#EC706D"', ['#EC706D']],
    ['bg-[#123abc]', ['#123abc']],
    ['#12345678', ['#12345678']],
    ['#abcd', ['#abcd']],
    ['rgba(0,0,0,0.5)', ['rgba(0,0,0,0.5)']],
    ['rgba(255, 255, 255, .4)', ['rgba(255, 255, 255, .4)']],
    ['rgb(255 0 0 / 50%)', ['rgb(255 0 0 / 50%)']],
    ['hsl(10 20% 30%)', ['hsl(10 20% 30%)']],
    ['HSLA(10,20%,30%,.5)', ['HSLA(10,20%,30%,.5)']],
    ['shadow-[rgba(0,0,0,0.3)]', ['rgba(0,0,0,0.3)']],
    ['bg-[#123abc]/50', ['#123abc']],
  ])('flags %s', (text, expected) => {
    expect(hits(text)).toEqual(expected);
  });

  it.each([
    'rgb(var(--brand))',
    'rgb(var(--brand) / 0.5)',
    'rgb(var(--shadow-color)/0.35)',
    'rgba(var(--brand), 0.5)',
    '`rgb(var(--brand) / ${alpha})`',
    'hsl(var(--h) 50% 50%)',
    'style={{ filter: "drop-shadow(0 8px 12px rgb(var(--brand) / 0.25))" }}',
    'bg-brand/50',
    'text-ink',
    '&#8199; &#65279;',
    'href="#section-one"',
    'id="#abcdefg"',
    'var(--canvas)',
  ])('does not flag %s', (text) => {
    expect(hits(text)).toEqual([]);
  });

  // Tailwind writes spaces as underscores inside [ ], so a colour can follow an underscore.
  it('flags colours that follow an underscore inside a Tailwind arbitrary value', () => {
    expect(hits('shadow-[0_2px_4px_#ff0000]')).toEqual(['#ff0000']);
    expect(hits('shadow-[0_0_8px_rgba(0,0,0,0.3)]')).toEqual(['rgba(0,0,0,0.3)']);
    expect(hits('shadow-[inset_0_5px_8px_rgb(255_255_255/0.5)]')).toEqual(['rgb(255_255_255/0.5)']);
  });

  it('flags a bare numeric colour even when written with a token word next to it', () => {
    expect(hits('rgb(var(--brand) / 0.5) rgba(0,0,0,0.5)')).toEqual(['rgba(0,0,0,0.5)']);
  });

  it('the black and white alphas the app uses are allowed one by one, with a reason, never by a blanket rule', () => {
    const neutral = COLOR_ALLOWLIST.filter((e) => e.literals.some((l) => /^rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)/.test(l) || /^rgb\(255 255 255/.test(l)));
    expect(neutral.length).toBeGreaterThan(0);
    neutral.forEach((e) => expect(e.reason.length).toBeGreaterThan(10));
    // a new black alpha in a file that is not listed would be flagged
    expect(hits('boxShadow: "0 2px 4px rgba(0,0,0,0.5)"')).toEqual(['rgba(0,0,0,0.5)']);
  });

  it('the allowlist never names the theme engine, tests or the token file (they are skipped, not allowed)', () => {
    COLOR_ALLOWLIST.forEach((e) => {
      expect(e.file.startsWith('src/design/theme/')).toBe(false);
      expect(e.file.endsWith('.test.js')).toBe(false);
      expect(e.file).not.toBe('src/design/tokens.css');
    });
  });

  it('every allowlisted literal is a real colour code (not a typo that matches nothing)', () => {
    COLOR_ALLOWLIST.forEach((e) => e.literals.forEach((l) => {
      expect(hits(l)).toEqual([l]);
    }));
  });
});
