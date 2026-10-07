import {
  hexToRgb, rgbToHex, rgbToTriplet, tripletToRgb, rgbToOklch, oklchToRgb,
  relativeLuminance, contrastRatio, deltaE, WHITE, BLACK,
} from './color';

const REFS = [
  [241, 130, 127], [255, 255, 255], [40, 70, 52], [108, 178, 136], [143, 205, 166],
  [255, 246, 232], [255, 226, 222], [255, 243, 196], [220, 238, 226], [255, 222, 220],
  [250, 240, 225], [255, 253, 249], [250, 244, 235], [200, 176, 146], [190, 160, 122],
  [214, 192, 162], [128, 116, 108], [54, 54, 54], [138, 147, 160], [52, 46, 62],
  [232, 214, 190], [245, 140, 137], [255, 190, 185], [206, 234, 214], [255, 236, 233],
  [226, 242, 231], [206, 232, 214], [150, 206, 170], [118, 184, 142], [232, 101, 98],
  [245, 239, 230], [236, 112, 109], [184, 220, 196], [20, 20, 20],
];

describe('hex and triplet parsing', () => {
  it('parses and formats hex', () => {
    expect(hexToRgb('#EC706D')).toEqual([236, 112, 109]);
    expect(hexToRgb('#ec706d')).toEqual([236, 112, 109]);
    expect(rgbToHex([236, 112, 109])).toBe('#EC706D');
    expect(rgbToHex([0, 0, 0])).toBe('#000000');
  });

  it('rejects bad hex', () => {
    ['#FFF', 'red', 'rgb(1,2,3)', '#GGGGGG', '', null, undefined, 5].forEach((v) => {
      expect(hexToRgb(v)).toBeNull();
    });
  });

  it('parses and formats triplets', () => {
    expect(rgbToTriplet([1, 2, 3])).toBe('1 2 3');
    expect(tripletToRgb('52 46 62')).toEqual([52, 46, 62]);
    expect(tripletToRgb('  52   46 62 ')).toEqual([52, 46, 62]);
  });

  it('rejects bad triplets', () => {
    ['256 0 0', '1 2', '1 2 3 4', 'a b c', '-1 0 0', '1.5 2 3', '', null].forEach((v) => {
      expect(tripletToRgb(v)).toBeNull();
    });
  });
});

describe('contrast', () => {
  it('white on black is 21', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5);
  });

  it('matches the measured coral on white', () => {
    expect(contrastRatio(WHITE, hexToRgb('#EC706D')).toFixed(2)).toBe('2.96');
  });

  it('luminance of white is 1 and black is 0', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 6);
    expect(relativeLuminance(BLACK)).toBe(0);
  });
});

describe('OKLCH', () => {
  it('round-trips every recipe reference colour exactly', () => {
    REFS.forEach((rgb) => {
      expect(oklchToRgb(rgbToOklch(rgb))).toEqual(rgb);
    });
  });

  it('round-trips 1000 pseudo-random colours exactly', () => {
    let seed = 1;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return Math.floor((seed / 4294967296) * 256);
    };
    for (let i = 0; i < 1000; i++) {
      const rgb = [next(), next(), next()];
      expect(oklchToRgb(rgbToOklch(rgb))).toEqual(rgb);
    }
  });

  it('maps an impossible chroma into range and keeps lightness roughly', () => {
    const out = oklchToRgb({ L: 0.6, C: 5, h: 1 });
    out.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
      expect(Number.isInteger(v)).toBe(true);
    });
    expect(Math.abs(rgbToOklch(out).L - 0.6)).toBeLessThan(0.05);
  });

  it('lightness 1 is white and 0 is black', () => {
    expect(oklchToRgb({ L: 1, C: 0.2, h: 1 })).toEqual(WHITE);
    expect(oklchToRgb({ L: 0, C: 0.2, h: 1 })).toEqual(BLACK);
    expect(oklchToRgb({ L: 2, C: 0, h: 0 })).toEqual(WHITE);
    expect(oklchToRgb({ L: -1, C: 0, h: 0 })).toEqual(BLACK);
  });
});

describe('deltaE', () => {
  it('is 0 for the same colour and 1 between black and white', () => {
    expect(deltaE([236, 112, 109], [236, 112, 109])).toBe(0);
    expect(Math.abs(deltaE(BLACK, WHITE) - 1)).toBeLessThan(1e-3);
  });

  it('is symmetric and grows with the difference', () => {
    const a = [236, 112, 109], b = [184, 220, 196], c = [237, 113, 109];
    expect(deltaE(a, b)).toBeCloseTo(deltaE(b, a), 12);
    expect(deltaE(a, c)).toBeLessThan(0.01);
    expect(deltaE(a, b)).toBeGreaterThan(0.1);
  });
});
