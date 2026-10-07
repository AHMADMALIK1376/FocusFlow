import { tintLottie, DECOR_MIN_C, DECOR_HUES } from './lottieTint';
import { rgbToOklch } from './color';
import { DEFAULT_THEME } from './theme';
import working from '../../assets/animation/Man Working on Laptop in Office.json';
import security from '../../assets/animation/Profile Password Unlock.json';

const BLUE = '#2546F0';
const SKIN = [0.96, 0.71, 0.56, 1];
const WHITE = [1, 1, 1, 1];
const GREY = [0.5, 0.5, 0.5, 1];
const YELLOW = [1, 0.85, 0.1, 1];
const PURPLE = [0.27, 0.17, 1, 1];
const fill = (k) => ({ ty: 'fl', c: { a: 0, k }, o: { a: 0, k: 100 } });
const doc = (...items) => ({ layers: [{ shapes: [{ it: items }] }] });
const colorsOf = (d) => d.layers[0].shapes[0].it.map((x) => x.c.k);
const hueDeg = (c) => (((rgbToOklch(c.slice(0, 3).map((v) => v * 255)).h * 180) / Math.PI) % 360 + 360) % 360;
const angleBetween = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

describe('tintLottie', () => {
  it('returns the very same object for no brand or the normal brand', () => {
    const d = doc(fill(PURPLE));
    expect(tintLottie(d, null)).toBe(d);
    expect(tintLottie(d, undefined)).toBe(d);
    expect(tintLottie(d, DEFAULT_THEME.brand)).toBe(d);
    expect(tintLottie(d, DEFAULT_THEME.brand.toLowerCase())).toBe(d);
    expect(tintLottie(d, 'not a colour')).toBe(d);
    expect(tintLottie(null, BLUE)).toBeNull();
  });

  it('leaves skin, white, grey and yellow alone', () => {
    const d = doc(fill([...SKIN]), fill([...WHITE]), fill([...GREY]), fill([...YELLOW]));
    const out = tintLottie(d, BLUE);
    expect(colorsOf(out)).toEqual([SKIN, WHITE, GREY, YELLOW]);
  });

  it('turns a purple decoration colour by the brand hue shift, keeping alpha', () => {
    const d = doc(fill([...PURPLE.slice(0, 3), 0.5]));
    const out = tintLottie(d, BLUE);
    const before = hueDeg(PURPLE);
    const shift = hueDeg([0x25 / 255, 0x46 / 255, 0xf0 / 255]) - hueDeg([0xec / 255, 0x70 / 255, 0x6d / 255]);
    const after = hueDeg(colorsOf(out)[0]);
    expect(angleBetween(after, before + shift)).toBeLessThan(2);
    expect(colorsOf(out)[0][3]).toBe(0.5);
    colorsOf(out)[0].forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); });
  });

  it('strokes are handled like fills, and gradients and other shapes are left alone', () => {
    const d = doc({ ty: 'st', c: { a: 0, k: [...PURPLE] } }, { ty: 'gf', g: { k: { a: 0, k: [0, ...PURPLE.slice(0, 3)] } } }, { ty: 'rc', c: { k: [...PURPLE] } });
    const out = tintLottie(d, BLUE);
    expect(out.layers[0].shapes[0].it[0].c.k).not.toEqual(PURPLE);
    expect(out.layers[0].shapes[0].it[1]).toEqual(d.layers[0].shapes[0].it[1]);
    expect(out.layers[0].shapes[0].it[2].c.k).toEqual(PURPLE);
  });

  it('animated colours: every keyframe start and end is handled', () => {
    const d = doc({ ty: 'fl', c: { a: 1, k: [{ t: 0, s: [...PURPLE], e: [...SKIN] }, { t: 10, s: [...PURPLE] }] } });
    const out = tintLottie(d, BLUE);
    const frames = out.layers[0].shapes[0].it[0].c.k;
    expect(frames[0].s).not.toEqual(PURPLE);
    expect(frames[0].e).toEqual(SKIN);
    expect(frames[1].s).toEqual(frames[0].s);
    expect(frames[1].e).toBeUndefined();
  });

  it('never changes the input', () => {
    const d = doc(fill([...PURPLE]));
    const copy = JSON.parse(JSON.stringify(d));
    tintLottie(d, BLUE);
    expect(d).toEqual(copy);
  });

  it('the same inputs give the same object, other brands give other results', () => {
    const d = doc(fill([...PURPLE]));
    expect(tintLottie(d, BLUE)).toBe(tintLottie(d, BLUE));
    expect(tintLottie(d, BLUE)).toBe(tintLottie(d, BLUE.toLowerCase()));
    expect(tintLottie(d, BLUE)).not.toBe(tintLottie(d, '#00A060'));
  });

  it('a grey brand desaturates the decoration', () => {
    const out = tintLottie(doc(fill([...PURPLE])), '#808080');
    const c = colorsOf(out)[0];
    expect(rgbToOklch(c.slice(0, 3).map((v) => v * 255)).C).toBeLessThan(0.04);
  });

  it('the thresholds are the documented ones', () => {
    expect(DECOR_MIN_C).toBe(0.08);
    expect(DECOR_HUES).toEqual([180, 300]);
  });

  [['sign-in', working], ['verify', security]].forEach(([name, data]) => {
    it(`the ${name} illustration can be recoloured without breaking`, () => {
      ['#2546F0', '#00A060', '#808080', '#000000', '#FFFFFF'].forEach((brand) => {
        const out = tintLottie(data, brand);
        expect(out).not.toBe(data);
        expect(() => JSON.stringify(out)).not.toThrow();
        expect(JSON.parse(JSON.stringify(out))).toEqual(out);
        expect(out.layers.length).toBe(data.layers.length);
      });
      expect(JSON.stringify(tintLottie(data, '#2546F0'))).not.toBe(JSON.stringify(data));
    });
  });
});
