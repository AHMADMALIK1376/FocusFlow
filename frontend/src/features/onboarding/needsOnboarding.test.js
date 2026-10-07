import { needsOnboarding, markNeedsOnboarding, clearNeedsOnboarding } from "./needsOnboarding";

beforeEach(() => window.localStorage.clear());

test("off for everyone by default, so signing in never shows the welcome set-up", () => {
  expect(needsOnboarding()).toBe(false);
});

test("switched on when a new account is verified, off when the set-up is finished", () => {
  markNeedsOnboarding();
  expect(needsOnboarding()).toBe(true);
  clearNeedsOnboarding();
  expect(needsOnboarding()).toBe(false);
});

test("closing the tab half way keeps it on, so the set-up resumes on that device", () => {
  markNeedsOnboarding();
  expect(window.localStorage.getItem("focusflow:needsOnboarding")).toBe("1");
});

test("blocked storage never crashes the app", () => {
  const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(needsOnboarding()).toBe(false);
  spy.mockRestore();
});
