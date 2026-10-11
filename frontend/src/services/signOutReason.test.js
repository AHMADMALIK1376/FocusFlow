import { rememberSignOutReason, peekSignOutReason, clearSignOutReason, describeSignOut } from "./signOutReason";

beforeEach(() => window.localStorage.clear());

test("each server reason has calm, plain words and none is alarming or technical", () => {
  for (const code of ["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND", "NO_TOKEN"]) {
    const text = describeSignOut(code);
    expect(text).toMatch(/sign in again|create a new account/i);
    expect(text).not.toMatch(/token|401|error|JWT|cookie/i);
  }
  expect(describeSignOut("SOMETHING_ELSE")).toBeNull();
});

test("a reason is remembered, can be peeked without being removed, and cleared", () => {
  expect(peekSignOutReason()).toBeNull();
  rememberSignOutReason("TOKEN_EXPIRED");
  expect(peekSignOutReason().code).toBe("TOKEN_EXPIRED");
  expect(peekSignOutReason().code).toBe("TOKEN_EXPIRED"); // peeking again still works (safe while rendering)
  clearSignOutReason();
  expect(peekSignOutReason()).toBeNull();
});

test("an unknown code is not stored, and damaged storage reads as nothing", () => {
  rememberSignOutReason("NOT_A_REAL_REASON");
  expect(peekSignOutReason()).toBeNull();
  window.localStorage.setItem("focusflow:signout-reason", "{broken");
  expect(peekSignOutReason()).toBeNull();
  window.localStorage.setItem("focusflow:signout-reason", JSON.stringify({ code: "BOGUS" }));
  expect(peekSignOutReason()).toBeNull();
});

test("blocked storage never throws", () => {
  const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(() => rememberSignOutReason("NO_TOKEN")).not.toThrow();
  spy.mockRestore();
});
