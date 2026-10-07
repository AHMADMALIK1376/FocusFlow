import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { PreferencesProvider } from "./PreferencesProvider";
import ThemeApplier from "./ThemeApplier";
import { useAppTheme } from "./useAppTheme";
import { useActiveTheme } from "./useActiveTheme";
import { DEFAULT_THEME } from "../design/theme/theme";
import { migratePreferences } from "./migrate";
import { prefsAPI } from "../services/api";

// The colours this browser remembers for the sign-in page (focusflow:theme.device): one test per
// row of the behaviour table in docs/superpowers/specs/2026-10-08-theme-everywhere.md.
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
const X = { ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" }; // canvas 26 11 61
const Y = { ...DEFAULT_THEME, presetId: "ink", background: "#000000" };                                       // canvas 0 0 0
const X_CANVAS = "26 11 61";
const Y_CANVAS = "0 0 0";
const DEFAULT_CANVAS = "245 239 230";

let api; let active;
function Probe() {
  api = useAppTheme();
  active = useActiveTheme();
  return null;
}
const mount = () => render(<PreferencesProvider><ThemeApplier /><Probe /></PreferencesProvider>);
const canvas = () => root.style.getPropertyValue("--canvas");
const account = (theme) => ({ data: { ...migratePreferences(null), theme } });
const authEvent = (signedIn) => act(() => { window.dispatchEvent(new CustomEvent("ff:auth", { detail: { signedIn } })); });
const deviceBrand = () => { const v = localStorage.getItem(DEVICE); return v ? JSON.parse(v).brand : null; };
const cacheCanvas = () => { const v = localStorage.getItem(CACHE); return v ? JSON.parse(v).tokens["--canvas"] : null; };

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("style");
  mockSignedIn = false;
  prefsAPI.get.mockResolvedValue({ data: null }); // CRA resets mocks between tests
  prefsAPI.save.mockResolvedValue({});
});

it("signed in, account loaded, theme X: X is painted and remembered", async () => {
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(X));
  mount();
  await waitFor(() => expect(deviceBrand()).toBe(X.brand));
  expect(canvas()).toBe(X_CANVAS);
  expect(cacheCanvas()).toBe(X_CANVAS);
  expect(active).toEqual(X);
});

it("saving Reset to FocusFlow colours: default painted, device memory and cache removed", async () => {
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(X));
  mount();
  await waitFor(() => expect(deviceBrand()).toBe(X.brand));
  act(() => { api.resetTheme(); });
  expect(canvas()).toBe(DEFAULT_CANVAS);
  expect(localStorage.getItem(DEVICE)).toBeNull();
  expect(localStorage.getItem(CACHE)).toBeNull();
});

it("signing out keeps X on the sign-in page, in the device memory and in the cache", async () => {
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(X));
  mount();
  await waitFor(() => expect(deviceBrand()).toBe(X.brand));
  mockSignedIn = false;
  authEvent(false);
  expect(canvas()).toBe(X_CANVAS);
  expect(deviceBrand()).toBe(X.brand);
  expect(cacheCanvas()).toBe(X_CANVAS);
  expect(api.theme).toEqual(DEFAULT_THEME); // the account copy is gone from this browser
  expect(active).toEqual(X);
});

it("a session that ends (401) is the same as signing out", async () => {
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(X));
  mount();
  await waitFor(() => expect(deviceBrand()).toBe(X.brand));
  mockSignedIn = false;
  authEvent(false); // api.js announces a 401 session end the same way
  expect(canvas()).toBe(X_CANVAS);
  expect(deviceBrand()).toBe(X.brand);
});

it("signing in before the account has loaded shows the device theme (no flash of default)", async () => {
  localStorage.setItem(DEVICE, JSON.stringify(X));
  let release;
  prefsAPI.get.mockReturnValue(new Promise((resolve) => { release = resolve; }));
  mockSignedIn = true;
  mount();
  expect(canvas()).toBe(X_CANVAS);
  expect(deviceBrand()).toBe(X.brand);
  expect(cacheCanvas()).toBe(X_CANVAS);
  await act(async () => { release(account(X)); });
  expect(canvas()).toBe(X_CANVAS);
});

it("another student loads with theme Y: Y is painted and replaces the memory", async () => {
  localStorage.setItem(DEVICE, JSON.stringify(X));
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(Y));
  mount();
  await waitFor(() => expect(canvas()).toBe(Y_CANVAS));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(DEVICE)).background).toBe("#000000"));
  expect(cacheCanvas()).toBe(Y_CANVAS);
});

it("another student loads with the default theme: default painted, memory and cache removed", async () => {
  localStorage.setItem(DEVICE, JSON.stringify(X));
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(DEFAULT_THEME));
  mount();
  await waitFor(() => expect(canvas()).toBe(DEFAULT_CANVAS));
  await waitFor(() => expect(localStorage.getItem(DEVICE)).toBeNull());
  expect(localStorage.getItem(CACHE)).toBeNull();
});

it("the account cannot be loaded: the browser's saved copy is painted and remembered", async () => {
  localStorage.setItem(PREFS, JSON.stringify({ ...migratePreferences(null), theme: X }));
  mockSignedIn = true;
  prefsAPI.get.mockRejectedValue(new Error("offline"));
  mount();
  await waitFor(() => expect(deviceBrand()).toBe(X.brand));
  expect(canvas()).toBe(X_CANVAS);
  expect(cacheCanvas()).toBe(X_CANVAS);
});

it("never signed in: the default, nothing remembered, nothing cached", () => {
  mount();
  expect(canvas()).toBe(DEFAULT_CANVAS);
  expect(localStorage.getItem(DEVICE)).toBeNull();
  expect(localStorage.getItem(CACHE)).toBeNull();
});

it("junk in the device memory is ignored and removed", () => {
  localStorage.setItem(DEVICE, "{oops");
  mount();
  expect(canvas()).toBe(DEFAULT_CANVAS);
  expect(localStorage.getItem(DEVICE)).toBeNull();
});

it("a preview open while signing out ends; the device theme is painted", async () => {
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(X));
  mount();
  await waitFor(() => expect(deviceBrand()).toBe(X.brand));
  act(() => { api.previewTheme(Y); });
  expect(canvas()).toBe(Y_CANVAS);
  mockSignedIn = false;
  authEvent(false);
  expect(canvas()).toBe(X_CANVAS);
});
