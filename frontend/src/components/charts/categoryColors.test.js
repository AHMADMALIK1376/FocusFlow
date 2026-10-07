import React from "react";
import { render } from "@testing-library/react";
import { categoryColors, useCategoryColors, DEFAULT_SERIES, MIN_SERIES_DE } from "./categoryColors";
import { PALETTES } from "../../design/theme/palettes";
import { DEFAULT_THEME } from "../../design/theme/theme";
import { hexToRgb, deltaE } from "../../design/theme/color";
import { PreferencesContext } from "../../preferences/PreferencesProvider";

const de = (a, b) => deltaE(hexToRgb(a), hexToRgb(b));
const smallestGap = (list) => {
  let min = Infinity;
  list.forEach((a, i) => list.slice(i + 1).forEach((b) => { min = Math.min(min, de(a, b)); }));
  return min;
};
const asTheme = (p) => ({ v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id });

describe("categoryColors", () => {
  it("the normal colours give today's six colours (the same array)", () => {
    expect(categoryColors(DEFAULT_THEME)).toBe(DEFAULT_SERIES);
    expect(categoryColors(null)).toBe(DEFAULT_SERIES);
    expect(categoryColors({ brand: "red" })).toBe(DEFAULT_SERIES);
    expect(DEFAULT_SERIES).toEqual(["#EC706D", "#F5C842", "#8FCDA6", "#F4A98A", "#9EC3EA", "#D7B98E"]);
  });

  it("today's six are far enough apart for the minimum to be fair", () => {
    expect(smallestGap(DEFAULT_SERIES)).toBeGreaterThanOrEqual(MIN_SERIES_DE);
  });

  PALETTES.forEach((p) => {
    it(`${p.name}: six different colours, the brand first, all pairs apart`, () => {
      const theme = asTheme(p);
      const out = categoryColors(theme);
      if (out === DEFAULT_SERIES) return; // a palette equal to the normal colours
      expect(out).toHaveLength(6);
      expect(new Set(out).size).toBe(6);
      expect(out[0]).toBe(p.brand.toUpperCase());
      expect(smallestGap(out)).toBeGreaterThanOrEqual(MIN_SERIES_DE);
    });
  });

  it("300 random themes always give six distinct colours, the brand first", () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const hex = () => `#${Math.floor(rnd() * 0x1000000).toString(16).padStart(6, "0").toUpperCase()}`;
    for (let i = 0; i < 300; i += 1) {
      const theme = { ...DEFAULT_THEME, presetId: "r", background: hex(), brand: hex(), accent: hex() };
      const out = categoryColors(theme);
      expect(out).toHaveLength(6);
      expect(new Set(out).size).toBe(6);
      expect(out[0]).toBe(theme.brand);
    }
  });

  it("a theme whose accent is also a list colour still gives six distinct colours", () => {
    const out = categoryColors({ ...DEFAULT_THEME, presetId: "x", brand: "#F5C842", accent: "#F4A98A" });
    expect(new Set(out).size).toBe(6);
  });
});

describe("useCategoryColors", () => {
  it("follows the colours on screen", () => {
    let got;
    const Probe = () => { got = useCategoryColors(); return null; };
    const blue = { ...DEFAULT_THEME, presetId: "b", brand: "#2546F0" };
    render(<PreferencesContext.Provider value={{ theme: blue, shownTheme: blue, themePreview: null }}><Probe /></PreferencesContext.Provider>);
    expect(got[0]).toBe("#2546F0");
    render(<Probe />);
    expect(got).toBe(DEFAULT_SERIES);
  });
});
