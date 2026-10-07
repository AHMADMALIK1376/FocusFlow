import { tintLottie } from './lottieTint';

// Odd animation files must never break the sign-in page: the worst outcome is "not recoloured".
const BLUE = '#2546F0';
const PURPLE = [0.27, 0.17, 1, 1];
const fill = (k, extra = {}) => ({ ty: 'fl', c: { a: 0, k }, o: { a: 0, k: 100 }, ...extra });
const clone = (x) => JSON.parse(JSON.stringify(x));
const firstColour = (d) => d.layers[0].shapes[0].it[0].c.k;

describe('tintLottie on odd files', () => {
  const ODD = {
    'empty object': {},
    'empty layers': { layers: [] },
    'layers is not an array': { layers: 'x' },
    'layers is null': { layers: null },
    'layer without shapes': { layers: [{ ty: 4 }, null, 7, 'x'] },
    'shapes is an object': { layers: [{ shapes: { it: [] } }] },
    'fill without c': { layers: [{ shapes: [{ it: [{ ty: 'fl' }] }] }] },
    'c is null': { layers: [{ shapes: [{ it: [{ ty: 'fl', c: null }] }] }] },
    'c.k missing': { layers: [{ shapes: [{ it: [{ ty: 'fl', c: { a: 0 } }] }] }] },
    'c.k is a string': { layers: [{ shapes: [{ it: [{ ty: 'fl', c: { a: 0, k: 'red' } }] }] }] },
    'c.k too short': { layers: [{ shapes: [{ it: [fill([0.2, 0.3])] }] }] },
    'c.k has text': { layers: [{ shapes: [{ it: [fill(['a', 'b', 'c'])] }] }] },
    'c.k has null': { layers: [{ shapes: [{ it: [fill([null, null, null])] }] }] },
    'c.k has NaN': { layers: [{ shapes: [{ it: [fill([NaN, 0.5, 1])] }] }] },
    'c.k has Infinity': { layers: [{ shapes: [{ it: [fill([Infinity, -Infinity, 1])] }] }] },
    'c.k out of range': { layers: [{ shapes: [{ it: [fill([5, -3, 9])] }] }] },
    'keyframes without s or e': { layers: [{ shapes: [{ it: [{ ty: 'fl', c: { a: 1, k: [{ t: 0 }, null, 5, { s: 'x', e: [] }] } }] }] }] },
    'animated but k is not an array': { layers: [{ shapes: [{ it: [{ ty: 'fl', c: { a: 1, k: 'x' } }] }] }] },
    'nested precomps': { assets: [{ id: 'a', layers: [{ ty: 0, refId: 'b' }] }, { id: 'b', layers: [{ shapes: [{ it: [fill([...PURPLE])] }] }] }], layers: [{ ty: 0, refId: 'a' }] },
    'a root array': [fill([...PURPLE])],
    'a number': 5,
    'a string': 'animation',
  };
  Object.entries(ODD).forEach(([name, data]) => {
    it(`${name}: does not throw, does not change the input, and gives JSON back`, () => {
      const before = JSON.stringify(data);
      let out;
      expect(() => { out = tintLottie(data, BLUE); }).not.toThrow();
      expect(JSON.stringify(data)).toBe(before);
      if (data && typeof data === 'object') expect(() => JSON.stringify(out)).not.toThrow();
    });
  });

  it('a colour inside nested pre-compositions (assets) is recoloured', () => {
    const d = ODD['nested precomps'];
    const out = tintLottie(d, BLUE);
    expect(out.assets[1].layers[0].shapes[0].it[0].c.k).not.toEqual(PURPLE);
    expect(d.assets[1].layers[0].shapes[0].it[0].c.k).toEqual(PURPLE);
  });

  it('colours that are not real numbers keep their length and never become text (NaN is not JSON, so it may turn to null)', () => {
    ['c.k has NaN', 'c.k has Infinity', 'c.k out of range'].forEach((name) => {
      const k = firstColour(tintLottie(ODD[name], BLUE));
      expect(k).toHaveLength(3);
      k.forEach((v) => expect(v === null || typeof v === 'number').toBe(true));
    });
  });

  it('an empty file and a file that is only a colour list are returned usable', () => {
    expect(tintLottie({}, BLUE)).toEqual({});
    expect(tintLottie([], BLUE)).toEqual([]);
  });

  it('a very wide file (50,000 layers) is done in reasonable time', () => {
    const big = { layers: Array.from({ length: 50000 }, () => ({ shapes: [{ it: [fill([...PURPLE])] }] })) };
    const start = Date.now();
    const out = tintLottie(big, BLUE);
    expect(Date.now() - start).toBeLessThan(10000);
    expect(out.layers).toHaveLength(50000);
    expect(firstColour(out)).not.toEqual(PURPLE);
  });

  it('a deep file (1,500 levels) does not throw', () => {
    let node = { ty: 'fl', c: { a: 0, k: [...PURPLE] } };
    for (let i = 0; i < 1500; i += 1) node = { it: [node] };
    expect(() => tintLottie({ layers: [{ shapes: [node] }] }, BLUE)).not.toThrow();
  });

  it('the original (module) object stays pristine across many brands and many calls', () => {
    const original = { layers: [{ shapes: [{ it: [fill([...PURPLE]), { ty: 'st', c: { a: 1, k: [{ s: [...PURPLE], e: [...PURPLE] }] } }] }] }] };
    const snapshot = JSON.stringify(original);
    const brands = ['#2546F0', '#00A060', '#808080', '#000000', '#FFFFFF', '#2546f0', '#E8B66A'];
    const results = brands.map((b) => tintLottie(original, b));
    brands.forEach((b) => tintLottie(original, b));
    expect(JSON.stringify(original)).toBe(snapshot);
    // the default brand afterwards still gives back the original object
    expect(tintLottie(original, '#EC706D')).toBe(original);
    // results for different brands are different objects, each stable
    expect(new Set(results.slice(0, 5)).size).toBe(5);
    expect(tintLottie(original, '#2546F0')).toBe(results[0]);
    expect(tintLottie(original, '#2546f0')).toBe(results[0]); // letter case does not make a second copy
  });

  it('changing a recoloured copy cannot damage the original or the next recolouring', () => {
    const original = { layers: [{ shapes: [{ it: [fill([...PURPLE])] }] }] };
    const out = tintLottie(original, BLUE);
    firstColour(out)[0] = 99;
    expect(firstColour(original)).toEqual(PURPLE);
    expect(firstColour(tintLottie(original, '#00A060'))[0]).not.toBe(99);
  });

  it('bad brand values return the original object', () => {
    const d = { layers: [{ shapes: [{ it: [fill([...PURPLE])] }] }] };
    ['', '#12', 'blue', '#GGGGGG', '#2546F0FF', 5, {}, [], NaN, false].forEach((b) => {
      expect(tintLottie(d, b)).toBe(d);
    });
  });

  it('data that already holds a recoloured copy is recoloured from its own colours, not twice', () => {
    const d = { layers: [{ shapes: [{ it: [fill([...PURPLE])] }] }] };
    const once = tintLottie(d, BLUE);
    expect(tintLottie(d, BLUE)).toBe(once);
    expect(clone(once)).toEqual(once);
  });
});
