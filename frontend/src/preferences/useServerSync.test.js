import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useServerSync, forServer, SAVE_DELAY_MS, RETRY_DELAY_MS } from "./useServerSync";
import { migratePreferences } from "./migrate";

// The real api.js talks to the network; here it is replaced by stand-ins.
const mockGet = jest.fn();
const mockSave = jest.fn();
let mockSignedIn = true;
jest.mock("../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => (mockSignedIn ? "session" : null),
  prefsAPI: { get: (...a) => mockGet(...a), save: (...a) => mockSave(...a) },
}));

const KEY = "preferences";
const localPrefs = () => {
  const p = migratePreferences(null);
  return { ...p, profile: { ...p.profile, displayName: "From this browser", mascot: "fox" } };
};
const serverPrefs = () => {
  const p = migratePreferences(null);
  return { ...p, profile: { ...p.profile, displayName: "From my account", mascot: "sloth" } };
};

// A tiny stand-in for PreferencesProvider: state + the hook.
function useHarness(initial) {
  const [state, setState] = useState(initial);
  useServerSync(state, setState, KEY);
  return { state, setState };
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const wait = (ms) => act(async () => { jest.advanceTimersByTime(ms); await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  mockSignedIn = true;
  mockGet.mockReset(); mockSave.mockReset();            // CRA resets mocks between tests
  mockSave.mockResolvedValue({ success: true });
});
afterEach(() => jest.useRealTimers());

test("signed in: the account's copy wins over this browser's", async () => {
  mockGet.mockResolvedValue({ data: serverPrefs() });
  const { result } = renderHook(() => useHarness(localPrefs()));
  await flush();
  expect(result.current.state.profile.displayName).toBe("From my account");
  expect(result.current.state.profile.mascot).toBe("sloth");
  await wait(SAVE_DELAY_MS * 2);
  expect(mockSave).not.toHaveBeenCalled(); // nothing changed, nothing to send back
});

test("signed in but the account has nothing yet: this browser's layout is uploaded, not lost", async () => {
  mockGet.mockResolvedValue({ data: null });
  renderHook(() => useHarness(localPrefs()));
  await flush();
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave.mock.calls[0][0].profile.displayName).toBe("From this browser");
});

test("an edit is saved a moment later, and several quick edits make one save", async () => {
  mockGet.mockResolvedValue({ data: serverPrefs() });
  const { result } = renderHook(() => useHarness(localPrefs()));
  await flush();
  act(() => result.current.setState((s) => ({ ...s, profile: { ...s.profile, mascot: "bear" } })));
  act(() => result.current.setState((s) => ({ ...s, profile: { ...s.profile, mascot: "owl" } })));
  expect(mockSave).not.toHaveBeenCalled();
  await wait(SAVE_DELAY_MS + 50);
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave.mock.calls[0][0].profile.mascot).toBe("owl");
});

test("nothing is sent before the first load finishes, so a fresh browser cannot overwrite the saved copy", async () => {
  let release;
  mockGet.mockReturnValue(new Promise((r) => { release = r; }));
  const { result } = renderHook(() => useHarness(migratePreferences(null)));
  act(() => result.current.setState((s) => ({ ...s, profile: { ...s.profile, displayName: "typed too early" } })));
  await wait(SAVE_DELAY_MS * 3);
  expect(mockSave).not.toHaveBeenCalled();
  await act(async () => { release({ data: serverPrefs() }); await Promise.resolve(); await Promise.resolve(); });
  expect(result.current.state.profile.displayName).toBe("From my account");
});

test("signed out: nothing is loaded and nothing is sent", async () => {
  mockSignedIn = false;
  const { result } = renderHook(() => useHarness(localPrefs()));
  await flush();
  act(() => result.current.setState((s) => ({ ...s, profile: { ...s.profile, mascot: "bear" } })));
  await wait(SAVE_DELAY_MS * 2);
  expect(mockGet).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});

test("signing in later loads the account's copy", async () => {
  mockSignedIn = false;
  mockGet.mockResolvedValue({ data: serverPrefs() });
  const { result } = renderHook(() => useHarness(migratePreferences(null)));
  await flush();
  expect(mockGet).not.toHaveBeenCalled();
  mockSignedIn = true;
  await act(async () => { window.dispatchEvent(new CustomEvent("ff:auth", { detail: { signedIn: true } })); await Promise.resolve(); await Promise.resolve(); });
  expect(result.current.state.profile.displayName).toBe("From my account");
});

test("signing out wipes this browser's copy, so the next person starts clean and uploads nothing", async () => {
  mockGet.mockResolvedValue({ data: serverPrefs() });
  const { result } = renderHook(() => useHarness(localPrefs()));
  await flush();
  window.localStorage.setItem("focusflow:preferences", "{\"kept\":true}");
  await act(async () => { mockSignedIn = false; window.dispatchEvent(new CustomEvent("ff:auth", { detail: { signedIn: false } })); await Promise.resolve(); });
  expect(result.current.state.profile.displayName).toBe("");
  expect(result.current.state.profile.mascot).toBeUndefined();
  expect(window.localStorage.getItem("focusflow:preferences")).toBeNull();
  await wait(SAVE_DELAY_MS * 2);
  expect(mockSave).not.toHaveBeenCalled();
});

test("server asleep at start: the app keeps working, then tries again and catches up", async () => {
  mockGet.mockRejectedValueOnce(new Error("asleep")).mockResolvedValue({ data: serverPrefs() });
  const { result } = renderHook(() => useHarness(localPrefs()));
  await flush();
  expect(result.current.state.profile.displayName).toBe("From this browser");
  await wait(RETRY_DELAY_MS + 50);
  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(result.current.state.profile.displayName).toBe("From my account");
});

test("a failed save is tried again on the next change", async () => {
  mockGet.mockResolvedValue({ data: serverPrefs() });
  const { result } = renderHook(() => useHarness(localPrefs()));
  await flush();
  mockSave.mockRejectedValueOnce(new Error("offline"));
  act(() => result.current.setState((s) => ({ ...s, profile: { ...s.profile, mascot: "bear" } })));
  await wait(SAVE_DELAY_MS + 50);
  expect(mockSave).toHaveBeenCalledTimes(1);
  act(() => result.current.setState((s) => ({ ...s, profile: { ...s.profile, mascot: "owl" } })));
  await wait(SAVE_DELAY_MS + 50);
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockSave.mock.calls[1][0].profile.mascot).toBe("owl");
});

test("a very large pasted-in photo is not uploaded; a mascot id and small pictures are", () => {
  const base = migratePreferences(null);
  const big = { ...base, profile: { ...base.profile, avatarUrl: "data:image/png;base64," + "A".repeat(70000), mascot: "fox" } };
  const small = { ...base, profile: { ...base.profile, avatarUrl: "data:image/png;base64,AAAA", mascot: "fox" } };
  expect(forServer(big).profile.avatarUrl).toBeUndefined();
  expect(forServer(big).profile.mascot).toBe("fox");
  expect(forServer(small).profile.avatarUrl).toBe("data:image/png;base64,AAAA");
  expect(forServer(base)).toBe(base);
});
