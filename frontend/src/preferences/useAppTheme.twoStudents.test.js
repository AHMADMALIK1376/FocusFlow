import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { PreferencesProvider } from "./PreferencesProvider";
import ThemeApplier from "./ThemeApplier";
import { useAppTheme } from "./useAppTheme";
import { useActiveTheme } from "./useActiveTheme";
import { DEFAULT_THEME } from "../design/theme/theme";
import { migratePreferences } from "./migrate";
import { prefsAPI } from "../services/api";

// Two students on one phone or computer, and the colour memory under odd conditions.
let mockSignedIn = false;
jest.mock("../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => (mockSignedIn ? "session" : null),
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

const root = document.documentElement;
const CACHE = "focusflow:theme.colors";
const DEVICE = "focusflow:theme.device";
const A = { ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" }; // canvas 26 11 61
const B = { ...DEFAULT_THEME, presetId: "ink", background: "#000000" };                                         // canvas 0 0 0
const A_CANVAS = "26 11 61";
const B_CANVAS = "0 0 0";
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
const device = () => localStorage.getItem(DEVICE);
const cache = () => localStorage.getItem(CACHE);
const signOut = () => { mockSignedIn = false; authEvent(false); };

// Every value of --canvas that was ever set on <html>, so a flash of the wrong colours would show up.
let seen;
let observer;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("style");
  mockSignedIn = false;
  prefsAPI.get.mockResolvedValue({ data: null });
  prefsAPI.save.mockResolvedValue({});
  seen = [];
  observer = new MutationObserver(() => { const c = canvas(); if (c && seen[seen.length - 1] !== c) seen.push(c); });
  observer.observe(root, { attributes: true, attributeFilter: ["style"] });
});
afterEach(() => observer.disconnect());

async function studentASignedIn() {
  mockSignedIn = true;
  prefsAPI.get.mockResolvedValue(account(A));
  const view = mount();
  await waitFor(() => expect(device() && JSON.parse(device()).brand).toBe(A.brand));
  return view;
}

describe("student A signs out, student B signs in on the same browser", () => {
  it("B with the default theme: A's colours show on the sign-in page and while B loads, then the default, and A is forgotten", async () => {
    await studentASignedIn();
    signOut();
    expect(canvas()).toBe(A_CANVAS);

    let release;
    prefsAPI.get.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    mockSignedIn = true;
    authEvent(true);
    expect(canvas()).toBe(A_CANVAS);        // still A's while B's account loads
    expect(JSON.parse(device()).brand).toBe(A.brand);
    expect(api.theme).toEqual(DEFAULT_THEME); // A's account copy is not B's

    await act(async () => { release(account(DEFAULT_THEME)); });
    await waitFor(() => expect(canvas()).toBe(DEFAULT_CANVAS));
    expect(device()).toBeNull();
    expect(cache()).toBeNull();
    expect(active).toEqual(DEFAULT_THEME);
  });

  it("B with another theme: A's colours until B loads, then B's, in both keys", async () => {
    await studentASignedIn();
    signOut();
    prefsAPI.get.mockResolvedValue(account(B));
    mockSignedIn = true;
    authEvent(true);
    await waitFor(() => expect(canvas()).toBe(B_CANVAS));
    await waitFor(() => expect(JSON.parse(device()).background).toBe("#000000"));
    expect(JSON.parse(cache()).tokens["--canvas"]).toBe(B_CANVAS);
    expect(active).toEqual(B);
  });

  it("B has no saved preferences at all: B gets the default and A's memory is gone", async () => {
    await studentASignedIn();
    signOut();
    prefsAPI.get.mockResolvedValue({ data: null });
    mockSignedIn = true;
    authEvent(true);
    await waitFor(() => expect(canvas()).toBe(DEFAULT_CANVAS));
    expect(device()).toBeNull();
  });

  it("A signs back in: A's colours never flicker to the default", async () => {
    await studentASignedIn();
    signOut();
    seen = [];
    mockSignedIn = true;
    authEvent(true);
    await waitFor(() => expect(prefsAPI.get).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(seen).not.toContain(DEFAULT_CANVAS);
    expect(canvas()).toBe(A_CANVAS);
  });

  it("B's account cannot be loaded (server asleep): B sees the browser's own copy, which is the default, and A is no longer shown", async () => {
    await studentASignedIn();
    signOut();
    prefsAPI.get.mockRejectedValue(new Error("asleep"));
    mockSignedIn = true;
    authEvent(true);
    await waitFor(() => expect(canvas()).toBe(DEFAULT_CANVAS));
    expect(device()).toBeNull();
  });

  it("the sign-in page after a reload still shows A's colours (device memory, no provider state)", async () => {
    const view = await studentASignedIn();
    signOut();
    view.unmount();
    root.removeAttribute("style");
    mount();
    expect(canvas()).toBe(A_CANVAS);
    expect(active).toEqual(A);
  });
});

describe("a colour preview never writes anything", () => {
  it("while signed in as A, previewing B changes neither key", async () => {
    await studentASignedIn();
    const before = [device(), cache()];
    act(() => { api.previewTheme(B); });
    expect(canvas()).toBe(B_CANVAS);
    expect([device(), cache()]).toEqual(before);
    act(() => { api.previewTheme(null); });
    expect(canvas()).toBe(A_CANVAS);
    expect([device(), cache()]).toEqual(before);
  });

  it("signed out with nothing remembered, a preview writes no key", () => {
    mount();
    act(() => { api.previewTheme(A); });
    expect(canvas()).toBe(A_CANVAS);
    expect(device()).toBeNull();
    expect(cache()).toBeNull();
  });

  it("previewing the default over a remembered theme does not delete the memory", async () => {
    await studentASignedIn();
    act(() => { api.previewTheme(DEFAULT_THEME); });
    expect(device()).not.toBeNull();
    expect(cache()).not.toBeNull();
  });

  it("an invalid preview is refused and changes nothing", async () => {
    await studentASignedIn();
    let ok;
    act(() => { ok = api.previewTheme({ brand: "red" }); });
    expect(ok).toBe(false);
    expect(canvas()).toBe(A_CANVAS);
  });
});

describe("saving and resetting", () => {
  it("changing the saved theme A to B while signed in updates the memory and the cache", async () => {
    await studentASignedIn();
    act(() => { api.setTheme(B); });
    await waitFor(() => expect(JSON.parse(device()).background).toBe("#000000"));
    expect(JSON.parse(cache()).tokens["--canvas"]).toBe(B_CANVAS);
  });

  it("an invalid setTheme is refused and leaves both keys alone", async () => {
    await studentASignedIn();
    const before = [device(), cache()];
    let ok;
    act(() => { ok = api.setTheme({ ...A, brand: "#EC706D;background:url(x)" }); });
    expect(ok).toBe(false);
    expect([device(), cache()]).toEqual(before);
  });

  it("Reset then sign out: the sign-in page is the normal look", async () => {
    await studentASignedIn();
    act(() => { api.resetTheme(); });
    expect(device()).toBeNull();
    expect(cache()).toBeNull();
    signOut();
    expect(canvas()).toBe(DEFAULT_CANVAS);
  });

  it("Reset while not signed in does not erase the remembered colours (only an account's own save does)", async () => {
    await studentASignedIn();
    signOut();
    act(() => { api.resetTheme(); });
    expect(device()).not.toBeNull();
    expect(canvas()).toBe(A_CANVAS);
  });
});

describe("damaged memory", () => {
  const BAD = {
    "not json": "{oops",
    "a number": "42",
    "an array": "[1,2]",
    "css injected into the brand": JSON.stringify({ ...A, brand: "#EC706D;background:url(x)" }),
    "extra key": JSON.stringify({ ...A, evil: "x" }),
    "huge string": JSON.stringify({ ...A, presetId: "a".repeat(100000) }),
  };
  Object.entries(BAD).forEach(([name, raw]) => {
    it(`${name} is dropped on load and the app opens in the default look`, () => {
      localStorage.setItem(DEVICE, raw);
      mount();
      expect(canvas()).toBe(DEFAULT_CANVAS);
      expect(device()).toBeNull();
    });
  });

  it("damaged memory does not stop a student signing in and getting their own theme", async () => {
    localStorage.setItem(DEVICE, "{oops");
    mockSignedIn = true;
    prefsAPI.get.mockResolvedValue(account(A));
    mount();
    await waitFor(() => expect(canvas()).toBe(A_CANVAS));
    await waitFor(() => expect(JSON.parse(device()).brand).toBe(A.brand));
  });

  it("an old (version 1) colour cache is not used by the app and is replaced by the right one", async () => {
    localStorage.setItem(CACHE, JSON.stringify({ v: 1, tokens: { "--canvas": "1 2 3" }, scheme: "light", meta: "#112233" }));
    localStorage.setItem(DEVICE, JSON.stringify(A));
    mount();
    expect(canvas()).toBe(A_CANVAS);
    expect(JSON.parse(cache()).v).toBe(2);
  });

  it("an old cache with the normal look is removed rather than kept", () => {
    localStorage.setItem(CACHE, JSON.stringify({ v: 1, tokens: { "--canvas": "1 2 3" }, scheme: "light", meta: "#112233" }));
    mount();
    expect(canvas()).toBe(DEFAULT_CANVAS);
    expect(cache()).toBeNull();
  });
});
