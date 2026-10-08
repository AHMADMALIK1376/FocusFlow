import { REASON_KEY, saveSignOutReason, readSignOutReason, clearSignOutReason, signOutMessage } from "./sessionReason";

beforeEach(() => localStorage.clear());

test("save, read and clear", () => {
  expect(readSignOutReason()).toBeNull();
  saveSignOutReason("NO_TOKEN");
  const r = readSignOutReason();
  expect(r.code).toBe("NO_TOKEN");
  expect(Number.isNaN(Date.parse(r.at))).toBe(false);
  clearSignOutReason();
  expect(readSignOutReason()).toBeNull();
});

test("junk in storage reads as no reason", () => {
  for (const junk of ["{not json", "null", "42", '{"code":5}', "[]"]) {
    localStorage.setItem(REASON_KEY, junk);
    expect(readSignOutReason()).toBeNull();
  }
});

test("it survives sessionStorage being wiped", () => {
  saveSignOutReason("TOKEN_EXPIRED");
  sessionStorage.clear();
  expect(readSignOutReason().code).toBe("TOKEN_EXPIRED");
});

test("one plain line per reason, never blaming the student, no emoji; manual and unknown give none", () => {
  const codes = ["TOKEN_EXPIRED", "USER_NOT_FOUND", "INVALID_TOKEN", "NO_TOKEN"];
  const lines = codes.map(signOutMessage);
  expect(new Set(lines).size).toBe(4);
  lines.forEach((l) => {
    expect(l).toMatch(/^You were signed out because /);
    expect(l).not.toMatch(/[^\x20-\x7e]/);
    expect(l).not.toMatch(/\b(you did|your fault|wrong)\b/i);
  });
  expect(signOutMessage("manual")).toBeNull();
  expect(signOutMessage("SOMETHING_ELSE")).toBeNull();
  expect(signOutMessage(null)).toBeNull();
  expect(signOutMessage(undefined)).toBeNull();
});
