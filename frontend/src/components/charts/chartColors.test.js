import React from "react";
import { render, act } from "@testing-library/react";
import { chartColors, useChartColors } from "./chartColors";
import { applyTheme, tokenHex } from "../../design/theme/applyTheme";
import { PALETTES, paletteTheme } from "../../design/theme/palettes";
import { PreferencesProvider } from "../../preferences/PreferencesProvider";
import ThemeApplier from "../../preferences/ThemeApplier";
import { useAppTheme } from "../../preferences/useAppTheme";
import { deriveTokens } from "../../design/theme/deriveTokens";
import { DEFAULT_THEME } from "../../design/theme/theme";

// No network: the sync hook sees a signed-out student.
jest.mock("../../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => null,
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

beforeEach(() => document.documentElement.removeAttribute("style"));

describe("chartColors", () => {
  it("falls back to today's colours when no theme is applied", () => {
    expect(chartColors()).toEqual({ brand: "#EC706D", accent: "#FFD700", sage: "#B8DCC4" });
  });

  it("follows the applied theme (sunshine stays fixed)", () => {
    applyTheme(deriveTokens({ ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" }));
    expect(chartColors()).toEqual({ brand: "#FF6B6B", accent: "#FFD700", sage: "#4ECDC4" });
  });
});

describe("useChartColors", () => {
  let colors;
  let theme;
  let renders;
  function Probe() {
    colors = useChartColors();
    renders += 1;
    return null;
  }
  function Controls() {
    theme = useAppTheme();
    return null;
  }
  const mount = () => render(
    <PreferencesProvider>
      <ThemeApplier />
      <Controls />
      <Probe />
    </PreferencesProvider>
  );
  const PURPLE = { ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" };

  beforeEach(() => { localStorage.clear(); renders = 0; });

  it("equals chartColors() outside the provider", () => {
    render(<Probe />);
    expect(colors).toEqual(chartColors());
  });

  it("starts with today's colours", () => {
    mount();
    expect(colors).toEqual({ brand: "#EC706D", accent: "#FFD700", sage: "#B8DCC4" });
  });

  it("re-renders with the new colours on preview, and back when the preview ends", () => {
    mount();
    act(() => { theme.previewTheme(PURPLE); });
    expect(colors).toEqual({ brand: "#FF6B6B", accent: "#FFD700", sage: "#4ECDC4" });
    act(() => { theme.previewTheme(null); });
    expect(colors.brand).toBe("#EC706D");
  });

  it("re-renders on save", () => {
    mount();
    act(() => { theme.setTheme(PURPLE); });
    expect(colors).toEqual({ brand: "#FF6B6B", accent: "#FFD700", sage: "#4ECDC4" });
  });

  it("returns a stable object while the theme does not change", () => {
    const { rerender } = mount();
    const first = colors;
    rerender(
      <PreferencesProvider>
        <ThemeApplier />
        <Controls />
        <Probe />
      </PreferencesProvider>
    );
    expect(colors).toBe(first);
  });

  it("matches the colours put on <html> for every library palette", () => {
    PALETTES.forEach((p) => {
      applyTheme(deriveTokens(paletteTheme(p)));
      const { brand, sage } = chartColors();
      expect(brand).toBe(p.brand);
      expect(sage).toBe(p.accent);
      const { unmount } = render(
        <PreferencesProvider>
          <ThemeApplier />
          <Controls />
          <Probe />
        </PreferencesProvider>
      );
      act(() => { theme.previewTheme(paletteTheme(p)); });
      expect(colors).toEqual({ brand: tokenHex("--brand"), accent: "#FFD700", sage: tokenHex("--sage") });
      unmount();
    });
  });
});
