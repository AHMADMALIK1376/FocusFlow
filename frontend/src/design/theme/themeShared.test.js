import { sanitizeTheme, isDefaultPalette } from './theme';

const B = { v: 1, background: '#F5EFE6', brand: '#EC706D', accent: '#B8DCC4', text: 'auto', presetId: 'default' };
const without = (k) => { const { [k]: _gone, ...rest } = B; return rest; };
// [label, theme, accepted]  (same table is in backend/utils/preferences.test.js)
const CASES = [
  ['default', B, true],
  ['lowercase hex', { ...B, brand: '#ec706d' }, true],
  ['text hex', { ...B, text: '#342e3e' }, true],
  ['logo and icon', { ...B, logo: '#000000', icon: '#ffffff' }, true],
  ['presetId 32 chars', { ...B, presetId: 'a'.repeat(32) }, true],
  ['presetId with digits and dash', { ...B, presetId: 'dark-2' }, true],
  ['null', null, false],
  ['array', [B], false],
  ['string', 'x', false],
  ['number', 5, false],
  ['empty object', {}, false],
  ['missing background', without('background'), false],
  ['missing accent', without('accent'), false],
  ['missing text', without('text'), false],
  ['missing presetId', without('presetId'), false],
  ['missing v', without('v'), false],
  ['3-digit hex', { ...B, brand: '#FFF' }, false],
  ['8-digit hex', { ...B, brand: '#EC706DFF' }, false],
  ['no hash', { ...B, brand: 'EC706D' }, false],
  ['named colour', { ...B, brand: 'red' }, false],
  ['rgb()', { ...B, brand: 'rgb(1,2,3)' }, false],
  ['bad hex digits', { ...B, brand: '#GGGGGG' }, false],
  ['injection after hex', { ...B, brand: '#EC706D;background:url(x)' }, false],
  ['trailing newline', { ...B, brand: '#EC706D\n' }, false],
  ['leading space', { ...B, brand: ' #EC706D' }, false],
  ['hex as number', { ...B, brand: 0xec706d }, false],
  ['hex as array', { ...B, brand: ['#EC706D'] }, false],
  ['text Auto', { ...B, text: 'Auto' }, false],
  ['text 3-digit', { ...B, text: '#FFF' }, false],
  ['text null', { ...B, text: null }, false],
  ['extra key', { ...B, extra: 1 }, false],
  ['version as string', { ...B, v: '1' }, false],
  ['version 0', { ...B, v: 0 }, false],
  ['version 1.5', { ...B, v: 1.5 }, false],
  ['version null', { ...B, v: null }, false],
  ['presetId with space', { ...B, presetId: 'Has Space' }, false],
  ['presetId uppercase', { ...B, presetId: 'Dark' }, false],
  ['presetId empty', { ...B, presetId: '' }, false],
  ['presetId 33 chars', { ...B, presetId: 'a'.repeat(33) }, false],
  ['presetId number', { ...B, presetId: 5 }, false],
  ['logo number', { ...B, logo: 123 }, false],
  ['logo null', { ...B, logo: null }, false],
  ['logo empty string', { ...B, logo: '' }, false],
  ['icon undefined', { ...B, icon: undefined }, false],
  ['icon bad', { ...B, icon: '#12345' }, false],
  ['own __proto__ key', JSON.parse('{"__proto__":{"x":1},"v":1,"background":"#F5EFE6","brand":"#EC706D","accent":"#B8DCC4","text":"auto","presetId":"d"}'), false],
  ['constructor key', { ...B, constructor: 'x' }, false],
];

describe('sanitizeTheme on the shared table', () => {
  CASES.forEach(([label, theme, ok]) => {
    it(`${ok ? 'accepts' : 'rejects'}: ${label}`, () => {
      expect(sanitizeTheme(theme) !== null).toBe(ok);
    });
  });

  it('never throws and never returns the same object', () => {
    CASES.forEach(([, t]) => {
      const r = sanitizeTheme(t);
      if (r) expect(r).not.toBe(t);
    });
  });

  it('is idempotent and uppercases every hex', () => {
    CASES.filter(([, , ok]) => ok).forEach(([, t]) => {
      const once = sanitizeTheme(t);
      expect(sanitizeTheme(once)).toEqual(once);
      ['background', 'brand', 'accent', 'logo', 'icon'].forEach((k) => {
        if (k in once) expect(once[k]).toBe(once[k].toUpperCase());
      });
    });
  });

  it('the app only writes version 1 (the server also takes 2+, the app does not)', () => {
    expect(sanitizeTheme({ ...B, v: 2 })).toBeNull();
  });

  it('isDefaultPalette is false for everything rejected', () => {
    CASES.filter(([, , ok]) => !ok).forEach(([, t]) => expect(isDefaultPalette(t)).toBe(false));
  });
});
