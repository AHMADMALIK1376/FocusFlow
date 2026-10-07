import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { PreferencesProvider } from "./PreferencesProvider";
import { usePreferences } from "./usePreferences";
import ThemeApplier from "./ThemeApplier";
import { useAppTheme } from "./useAppTheme";
import { DEFAULT_THEME } from "../design/theme/theme";
import { migratePreferences } from "./migrate";
import { prefsAPI } from "../services/api";
import { THEME_CACHE_VERSION } from "../design/theme/applyTheme";

let mockSignedIn = false;
jest.mock("../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => (mockSignedIn ? "session" : null),
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

const root = document.documentElement;
const PREFS = "focusflow:preferences";
const CACHE = "focusflow:theme.colors";
const DEVICE = "focusflow:theme.device";
const BLACK = { ...DEFAULT_THEME, presetId: "black", background: "#000000" };
const PURPLE = { ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" };
const DEFAULT_CANVAS = "245 239 230";

let api; let prefs;
function Probe() {
  api = useAppTheme();
  prefs = usePreferences();
  return null;
}
const mount = () => render(
  <PreferencesProvider><ThemeApplier /><Probe /></PreferencesProvider>
);
const signOut = () => act(() => { window.dispatchEvent(new CustomEvent("ff:auth", { detail: { signedIn: false } })); });
const canvas = () => root.style.getPropertyValue("--canvas");

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("style");
  mockSignedIn = false;
  prefsAPI.get.mockResolvedValue({ data: null }); // CRA resets mocks between tests
  prefsAPI.save.mockResolvedValue({});
});

// Signed in with PURPLE saved on the account, and the account has loaded.
async function mountSignedInWithPurple() {
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue({ data: { ...migratePreferences(null), theme: PURPLE } });
  mount();
  await waitFor(() => expect(canvas()).toBe("26 11 61"));
  await waitFor(() => expect(localStorage.getItem(DEVICE)).not.toBeNull());
}

describe("sign-out", () => {
  it("with a saved theme: the sign-in page keeps the colours, the account copy is gone", async () => {
    await mountSignedInWithPurple();
    mockSignedIn = false;
    signOut();
    expect(canvas()).toBe("26 11 61");
    expect(JSON.parse(localStorage.getItem(CACHE)).tokens["--canvas"]).toBe("26 11 61");
    expect(JSON.parse(localStorage.getItem(DEVICE)).brand).toBe(PURPLE.brand);
    expect(api.theme).toEqual(DEFAULT_THEME);
    expect(JSON.parse(localStorage.getItem(PREFS)).theme).toEqual(DEFAULT_THEME);
  });

  it("with a preview open: the preview ends and the remembered colours show; nothing previewed is stored", async () => {
    await mountSignedInWithPurple();
    act(() => { api.previewTheme(BLACK); });
    expect(canvas()).toBe("0 0 0");
    mockSignedIn = false;
    signOut();
    expect(prefs.themePreview).toBeNull();
    expect(canvas()).toBe("26 11 61");
    expect(JSON.parse(localStorage.getItem(CACHE)).tokens["--canvas"]).toBe("26 11 61");
    expect(JSON.parse(localStorage.getItem(DEVICE)).presetId).toBe("purple");
  });

  it("with only a preview open (default saved, nothing remembered): the preview ends", () => {
    mount();
    act(() => { api.previewTheme(BLACK); });
    signOut();
    expect(canvas()).toBe(DEFAULT_CANVAS);
    expect(localStorage.getItem(CACHE)).toBeNull();
    expect(localStorage.getItem(DEVICE)).toBeNull();
  });

  it("a sign-in event does not end a preview", () => {
    mount();
    act(() => { api.previewTheme(BLACK); });
    act(() => { window.dispatchEvent(new CustomEvent("ff:auth", { detail: { signedIn: true } })); });
    expect(canvas()).toBe("0 0 0");
  });
});

describe("resetPreferences", () => {
  it("ends a preview and removes the device cache", () => {
    mount();
    act(() => { api.setTheme(PURPLE); });
    act(() => { api.previewTheme(BLACK); });
    act(() => { prefs.resetPreferences(); });
    expect(prefs.themePreview).toBeNull();
    expect(canvas()).toBe(DEFAULT_CANVAS);
    expect(localStorage.getItem(CACHE)).toBeNull();
    expect(api.theme).toEqual(DEFAULT_THEME);
  });
});

describe("corrupted storage at load", () => {
  const BAD_THEMES = [{ brand: "red" }, "x", null, 5, [], { ...DEFAULT_THEME, v: 9 }, { ...DEFAULT_THEME, brand: "#EC706D;x:url(y)" }];
  BAD_THEMES.forEach((theme) => {
    it(`stored theme ${JSON.stringify(theme)} gives the default`, () => {
      localStorage.setItem(PREFS, JSON.stringify({ ...migratePreferences(null), theme }));
      mount();
      expect(api.theme).toEqual(DEFAULT_THEME);
      expect(canvas()).toBe(DEFAULT_CANVAS);
    });
  });

  it("stored preferences that are not JSON give a fresh default", () => {
    localStorage.setItem(PREFS, "{oops");
    mount();
    expect(api.theme).toEqual(DEFAULT_THEME);
    expect(canvas()).toBe(DEFAULT_CANVAS);
  });

  it("a broken device cache does not stop the app applying the saved theme", () => {
    localStorage.setItem(PREFS, JSON.stringify({ ...migratePreferences(null), theme: PURPLE }));
    localStorage.setItem(CACHE, "{broken");
    mount();
    expect(canvas()).toBe("26 11 61");
    const c = JSON.parse(localStorage.getItem(CACHE));
    expect(c.v).toBe(THEME_CACHE_VERSION);
  });

  it("a stale device cache for a theme that is no longer saved is removed once the default applies", () => {
    localStorage.setItem(CACHE, JSON.stringify({ v: THEME_CACHE_VERSION, tokens: { "--canvas": "0 0 0" }, scheme: "dark", meta: "#000000" }));
    mount();
    expect(localStorage.getItem(CACHE)).toBeNull();
  });
});
