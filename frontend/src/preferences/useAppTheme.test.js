import React from "react";
import { render, act } from "@testing-library/react";
import { PreferencesProvider } from "./PreferencesProvider";
import ThemeApplier from "./ThemeApplier";
import { useAppTheme } from "./useAppTheme";
import { DEFAULT_THEME } from "../design/theme/theme";

// No network: the sync hook sees a signed-out student.
jest.mock("../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => null,
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

const root = document.documentElement;
const PREFS = "focusflow:preferences";
const CACHE = "focusflow:theme.colors";
const BLACK = { ...DEFAULT_THEME, presetId: "black", background: "#000000" };
const PURPLE = { ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" };
const storedTheme = () => JSON.parse(localStorage.getItem(PREFS)).theme;

let api;
function Probe() {
  api = useAppTheme();
  return null;
}
function mount() {
  return render(
    <PreferencesProvider>
      <ThemeApplier />
      <Probe />
    </PreferencesProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("style");
});

describe("useAppTheme", () => {
  it("previews colours without saving them", () => {
    mount();
    act(() => { expect(api.previewTheme(BLACK)).toBe(true); });
    expect(root.style.getPropertyValue("--canvas")).toBe("0 0 0");
    expect(storedTheme()).toEqual(DEFAULT_THEME);
    expect(localStorage.getItem(CACHE)).toBeNull();
    expect(api.theme).toEqual(DEFAULT_THEME);
  });

  it("ends a preview with previewTheme(null)", () => {
    mount();
    act(() => { api.previewTheme(BLACK); });
    act(() => { api.previewTheme(null); });
    expect(root.style.getPropertyValue("--canvas")).toBe("245 239 230");
  });

  it("setTheme saves, caches and ends any preview", () => {
    mount();
    act(() => { api.previewTheme(BLACK); });
    let ok;
    act(() => { ok = api.setTheme(PURPLE); });
    expect(ok).toBe(true);
    expect(storedTheme()).toEqual(PURPLE);
    expect(localStorage.getItem(CACHE)).not.toBeNull();
    expect(root.style.getPropertyValue("--canvas")).toBe("26 11 61");
  });

  it("resetTheme goes back to the default and removes the cache", () => {
    mount();
    act(() => { api.setTheme(PURPLE); });
    act(() => { api.resetTheme(); });
    expect(storedTheme()).toEqual(DEFAULT_THEME);
    expect(localStorage.getItem(CACHE)).toBeNull();
    expect(root.style.getPropertyValue("--canvas")).toBe("245 239 230");
  });

  it("refuses invalid themes and changes nothing", () => {
    mount();
    let a; let b;
    act(() => { a = api.setTheme({ brand: "red" }); b = api.previewTheme("x"); });
    expect(a).toBe(false);
    expect(b).toBe(false);
    expect(storedTheme()).toEqual(DEFAULT_THEME);
    expect(root.style.getPropertyValue("--canvas")).toBe("245 239 230");
  });

  it("applies the default when the stored theme is corrupted", () => {
    localStorage.setItem(PREFS, JSON.stringify({ schemaVersion: 3, theme: { brand: "red" } }));
    mount();
    expect(api.theme).toEqual(DEFAULT_THEME);
    expect(root.style.getPropertyValue("--canvas")).toBe("245 239 230");
  });
});
