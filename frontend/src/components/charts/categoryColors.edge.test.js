import { categoryColors, DEFAULT_SERIES, MIN_SERIES_DE } from "./categoryColors";
import { PALETTES } from "../../design/theme/palettes";
import { DEFAULT_THEME, isDefaultPalette } from "../../design/theme/theme";
import { hexToRgb, deltaE } from "../../design/theme/color";

const de = (a, b) => deltaE(hexToRgb(a), hexToRgb(b));
const gap = (list) => {
  let min = Infinity;
  list.forEach((a, i) => list.slice(i + 1).forEach((b) => { min = Math.min(min, de(a, b)); }));
  return min;
};
const T = (over) => ({ ...DEFAULT_THEME, presetId: "x", ...over });
let seed = 4242;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const hex = () => `#${Math.floor(rnd() * 0x1000000).toString(16).padStart(6, "0").toUpperCase()}`;

describe("chart colours on odd themes", () => {
  it("the default list is exactly today's six, in order, as plain #RRGGBB", () => {
    expect(DEFAULT_SERIES).toEqual(["#EC706D", "#F5C842", "#8FCDA6", "#F4A98A", "#9EC3EA", "#D7B98E"]);
    expect(Object.keys(DEFAULT_SERIES)).toHaveLength(6);
    expect(MIN_SERIES_DE).toBeLessThanOrEqual(gap(DEFAULT_SERIES) + 1e-9);
  });

  it("never throws and always gives six distinct colours for every kind of bad or odd input", () => {
    const odd = [
      undefined, null, 0, 1, "", "theme", true, [], [1, 2], {}, { brand: "#fff" }, () => 1, NaN,
      T({ brand: "#000000", accent: "#000000" }),
      T({ brand: "#FFFFFF", accent: "#FFFFFF" }),
      T({ brand: "#808080", accent: "#808080" }),
      T({ brand: "#F5C842", accent: "#F5C842" }),
      T({ brand: "#f5c842", accent: "#f4a98a" }),            // lower case
      T({ brand: "#F4A98A", accent: "#9EC3EA" }),
      T({ brand: "#B3A4E6", accent: "#7CC7C0" }),            // reserve colours as brand/accent
      T({ brand: "#E8B66A", accent: "#B9C97E" }),
      { ...T({ brand: "#2546F0" }), extra: "x" },            // extra key: not a valid theme
      { ...T({ brand: "#2546F0" }), v: 99 },
    ];
    odd.forEach((theme) => {
      let out;
      expect(() => { out = categoryColors(theme); }).not.toThrow();
      expect(out).toHaveLength(6);
      expect(new Set(out).size).toBe(6);
      out.forEach((c) => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
    });
  });

  it("all 24 ready-made palettes keep every pair apart (not just the first colours)", () => {
    let checked = 0;
    PALETTES.forEach((p) => {
      const theme = { v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id };
      const out = categoryColors(theme);
      if (isDefaultPalette(theme)) { expect(out).toBe(DEFAULT_SERIES); return; }
      checked += 1;
      expect(gap(out)).toBeGreaterThanOrEqual(MIN_SERIES_DE);
      expect(out[0]).toBe(p.brand.toUpperCase());
    });
    expect(checked).toBeGreaterThan(20);
  });

  it("700 random themes: six distinct colours, the brand first, every pair apart", () => {
    let worst = Infinity;
    for (let i = 0; i < 700; i += 1) {
      const theme = T({ background: hex(), brand: hex(), accent: hex(), text: rnd() < 0.5 ? "auto" : hex() });
      const out = categoryColors(theme);
      expect(out).toHaveLength(6);
      expect(new Set(out).size).toBe(6);
      expect(out[0]).toBe(theme.brand);
      worst = Math.min(worst, gap(out));
    }
    expect(worst).toBeGreaterThanOrEqual(MIN_SERIES_DE); // measured on this fixed seed: 0.0512
  });

  it("the same theme gives the same list each time (stable), and the input is not changed", () => {
    const theme = T({ brand: "#2546F0", accent: "#8FB3F0" });
    const copy = JSON.stringify(theme);
    expect(categoryColors(theme)).toEqual(categoryColors({ ...theme }));
    expect(JSON.stringify(theme)).toBe(copy);
  });
});
