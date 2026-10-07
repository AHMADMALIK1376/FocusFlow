import {
  UNDO_LIMIT, FLAG_GROUPS, normalizeHex, sameColours, withPalette, withRole, isPaletteSelected,
  readabilityNotes, studioReducer,
} from './studio';
import { PALETTES, paletteTheme } from './palettes';
import { deriveTokens } from './deriveTokens';
import { DEFAULT_THEME } from './theme';

const A = paletteTheme(PALETTES[0]);
const B = paletteTheme(PALETTES[1]);

describe('normalizeHex', () => {
  it.each([
    ['ec706d', '#EC706D'], ['#ec706d', '#EC706D'], [' #EC706D ', '#EC706D'], ['abc', '#AABBCC'], ['#abc', '#AABBCC'],
  ])('accepts %p', (input, out) => expect(normalizeHex(input)).toBe(out));
  it.each(['', '#', '#ABCD', 'zz1122', '12345', '##ABC', 'rgb(1,2,3)', null, 123, undefined])('rejects %p', (input) => {
    expect(normalizeHex(input)).toBeNull();
  });
});

describe('sameColours', () => {
  it('ignores the preset name', () => {
    expect(sameColours(DEFAULT_THEME, { ...DEFAULT_THEME, presetId: 'custom' })).toBe(true);
  });
  it('treats a set logo or icon as different from Auto', () => {
    expect(sameColours(DEFAULT_THEME, { ...DEFAULT_THEME, logo: '#112233' })).toBe(false);
    expect(sameColours(DEFAULT_THEME, { ...DEFAULT_THEME, icon: '#112233' })).toBe(false);
    expect(sameColours({ ...DEFAULT_THEME, logo: '#abcdef' }, { ...DEFAULT_THEME, logo: '#ABCDEF' })).toBe(true);
  });
  it('compares each colour', () => {
    expect(sameColours(A, B)).toBe(false);
    expect(sameColours(A, { ...A, text: 'auto' })).toBe(false);
  });
  it('two nulls are the same, one null is not', () => {
    expect(sameColours(null, null)).toBe(true);
    expect(sameColours(null, A)).toBe(false);
    expect(sameColours(A, null)).toBe(false);
  });
});

describe('withPalette / isPaletteSelected', () => {
  it('clears logo and icon', () => {
    const next = withPalette({ ...A, logo: '#112233', icon: '#445566' }, PALETTES[1]);
    expect(next).toEqual(B);
    expect('logo' in next).toBe(false);
    expect('icon' in next).toBe(false);
  });
  it('is selected only while the four colours match and no logo or icon is set', () => {
    expect(isPaletteSelected(A, PALETTES[0])).toBe(true);
    expect(isPaletteSelected({ ...A, presetId: 'custom' }, PALETTES[0])).toBe(true);
    expect(isPaletteSelected(B, PALETTES[0])).toBe(false);
    expect(isPaletteSelected({ ...A, logo: '#112233' }, PALETTES[0])).toBe(false);
    expect(isPaletteSelected({ ...A, icon: '#112233' }, PALETTES[0])).toBe(false);
    expect(isPaletteSelected({ ...A, brand: '#000000' }, PALETTES[0])).toBe(false);
    expect(isPaletteSelected(null, PALETTES[0])).toBe(false);
  });
});

describe('withRole', () => {
  it.each(['background', 'brand', 'accent', 'text', 'logo', 'icon'])('sets %s from a loose hex', (role) => {
    const next = withRole(A, role, ' #abc ');
    expect(next[role]).toBe('#AABBCC');
    expect(next.presetId).toBe('custom');
  });
  it('auto text sets text auto', () => {
    expect(withRole(A, 'text', 'auto')).toEqual({ ...A, text: 'auto', presetId: 'custom' });
  });
  it('auto logo and icon remove the key', () => {
    const d = { ...A, logo: '#112233', icon: '#445566' };
    const l = withRole(d, 'logo', 'auto');
    expect('logo' in l).toBe(false);
    expect(l.icon).toBe('#445566');
    expect('icon' in withRole(d, 'icon', 'auto')).toBe(false);
    expect(d.logo).toBe('#112233');
  });
  it('auto for background, brand and accent changes nothing', () => {
    ['background', 'brand', 'accent'].forEach((r) => expect(withRole(A, r, 'auto')).toBe(A));
  });
  it('an invalid hex or role changes nothing', () => {
    expect(withRole(A, 'brand', 'zz12')).toBe(A);
    expect(withRole(A, 'brand', '')).toBe(A);
    expect(withRole(A, 'nope', '#112233')).toBe(A);
  });
});

describe('studioReducer', () => {
  const start = { draft: DEFAULT_THEME, past: [] };
  it('open sets the draft and clears the history', () => {
    expect(studioReducer({ draft: A, past: [B] }, { type: 'open', theme: DEFAULT_THEME })).toEqual(start);
  });
  it('change pushes the old draft', () => {
    const s = studioReducer(start, { type: 'change', draft: A });
    expect(s).toEqual({ draft: A, past: [DEFAULT_THEME] });
  });
  it('merge does not push', () => {
    const s1 = studioReducer(start, { type: 'change', draft: A });
    const s2 = studioReducer(s1, { type: 'change', draft: B, merge: true });
    expect(s2).toEqual({ draft: B, past: [DEFAULT_THEME] });
  });
  it('the same colours and preset is a no-op', () => {
    const s1 = studioReducer(start, { type: 'change', draft: A });
    expect(studioReducer(s1, { type: 'change', draft: { ...A } })).toBe(s1);
  });
  it('same colours with another preset name is a change', () => {
    const s = studioReducer(start, { type: 'change', draft: { ...DEFAULT_THEME, presetId: 'custom' } });
    expect(s.past).toHaveLength(1);
  });
  it('undo steps back, and does nothing on an empty history', () => {
    const s1 = studioReducer(start, { type: 'change', draft: A });
    const s2 = studioReducer(s1, { type: 'change', draft: B });
    const u1 = studioReducer(s2, { type: 'undo' });
    expect(u1).toEqual({ draft: A, past: [DEFAULT_THEME] });
    expect(studioReducer(u1, { type: 'undo' })).toEqual(start);
    expect(studioReducer(start, { type: 'undo' })).toBe(start);
  });
  it('keeps at most 20 steps', () => {
    let s = start;
    for (let i = 0; i < 30; i++) {
      s = studioReducer(s, { type: 'change', draft: { ...A, brand: `#0000${(i + 16).toString(16).toUpperCase()}` } });
    }
    expect(UNDO_LIMIT).toBe(20);
    expect(s.past).toHaveLength(20);
  });
  it('ignores unknown actions', () => {
    expect(studioReducer(start, { type: 'x' })).toBe(start);
  });
});

describe('readabilityNotes', () => {
  const notes = (draft) => readabilityNotes(draft, deriveTokens(draft));
  it('the default is exempt', () => {
    expect(notes(DEFAULT_THEME)).toEqual({ status: 'default', notes: [] });
  });
  it('a library palette is clear or adjusted, with no text note', () => {
    PALETTES.forEach((p) => {
      const r = notes(paletteTheme(p));
      expect(['clear', 'adjusted']).toContain(r.status);
      expect(r.notes.find((n) => n.id === 'text')).toBeUndefined();
    });
  });
  it('text equal to the background says darker (light page) or lighter (dark page)', () => {
    const light = notes({ ...DEFAULT_THEME, presetId: 'x', text: '#F5EFE6' });
    expect(light.status).toBe('adjusted');
    expect(light.notes.find((n) => n.id === 'text').text).toBe('We made your text a little darker so it stays readable.');
    const dark = notes({ ...paletteTheme(PALETTES.find((p) => p.id === 'midnight')), text: '#10141F' });
    expect(dark.notes.find((n) => n.id === 'text').text).toBe('We made your text a little lighter so it stays readable.');
  });
  it('a hard icon colour gets the icon sentence', () => {
    const r = notes({ ...DEFAULT_THEME, presetId: 'x', icon: '#F5EFE6' });
    expect(r.notes.find((n) => n.id === 'icons').text).toMatch(/^We made your icon colour a little (darker|lighter) so icons stay visible\.$/);
  });
  it('a logo colour equal to the brand adds the logo note, but never makes it unreadable', () => {
    const r = notes({ ...DEFAULT_THEME, presetId: 'x', logo: DEFAULT_THEME.brand });
    expect(r.notes.map((n) => n.id)).toContain('logo');
    expect(r.status).toBe('adjusted');
  });
  it('a failing result is unreadable', () => {
    const draft = { ...A };
    const good = deriveTokens(draft);
    const bad = { ...good, tokens: { ...good.tokens, '--ink': good.tokens['--canvas'] }, flags: [] };
    expect(readabilityNotes(draft, bad)).toEqual({ status: 'unreadable', notes: [] });
  });
  it('unknown flags go to the other note', () => {
    const draft = { ...A };
    const r = readabilityNotes(draft, { ...deriveTokens(draft), flags: ['--mystery'] });
    expect(r.notes).toEqual([{ id: 'other', text: 'We adjusted a few shades so everything stays readable.' }]);
  });
  it('writes one note per group in display order', () => {
    const draft = { ...A };
    const r = readabilityNotes(draft, { ...deriveTokens(draft), flags: ['--warn', '--muted', '--on-sage'] });
    expect(r.notes.map((n) => n.id)).toEqual(['text', 'pills', 'status']);
  });
});

// Same seeded generator as deriveTokens.property.test.js.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const hex = (rnd) => '#' + Array.from({ length: 3 }, () => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('').toUpperCase();

describe('FLAG_GROUPS', () => {
  it('cover every flag the guard can raise (200 seeded random palettes)', () => {
    const rnd = lcg(20261007);
    const known = FLAG_GROUPS.flatMap((g) => g.tokens);
    const unknown = new Set();
    for (let i = 0; i < 200; i++) {
      const theme = {
        ...DEFAULT_THEME, presetId: 'random', background: hex(rnd), brand: hex(rnd), accent: hex(rnd), text: rnd() < 0.3 ? hex(rnd) : 'auto',
      };
      deriveTokens(theme).flags.forEach((f) => { if (!known.includes(f)) unknown.add(f); });
    }
    expect([...unknown]).toEqual([]);
  });
});
