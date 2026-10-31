import { buildLaunchUrl, handlerUrl, keyFromAddress, MANUAL_SCHEME, PROTOCOL, randomPassport, registerHandler, summarizeSync } from "./lmsLink";

test("the sign-in address asks Moodle to hand the key back to an app name that Moodle accepts", () => {
  const u = new URL(buildLaunchUrl("https://lms.iqra.edu.pk/", "12345"));
  expect(u.origin + u.pathname).toBe("https://lms.iqra.edu.pk/admin/tool/mobile/launch.php");
  expect(u.searchParams.get("service")).toBe("moodle_mobile_app");
  expect(u.searchParams.get("passport")).toBe("12345");
  const scheme = u.searchParams.get("urlscheme");
  expect(scheme).toBe(PROTOCOL);
  // Moodle's own rule: starts with a letter, then only letters, numbers and . + -
  expect(scheme).toMatch(/^[A-Za-z][A-Za-z0-9.+-]*$/);
  expect(MANUAL_SCHEME).toMatch(/^[A-Za-z][A-Za-z0-9.+-]*$/);
  expect(new URL(buildLaunchUrl("https://lms.iqra.edu.pk", "1", MANUAL_SCHEME)).searchParams.get("urlscheme")).toBe("moodlemobile");
});

test("the browser is told to open FocusFlow's settings with the link, and tolerates browsers that cannot", () => {
  expect(handlerUrl("https://focusflow.app")).toBe("https://focusflow.app/settings?open=lms&lmskey=%s");
  const original = navigator.registerProtocolHandler;
  navigator.registerProtocolHandler = jest.fn();
  expect(registerHandler("https://focusflow.app")).toBe(true);
  expect(navigator.registerProtocolHandler).toHaveBeenCalledWith("web+focusflow", "https://focusflow.app/settings?open=lms&lmskey=%s");
  navigator.registerProtocolHandler = () => { throw new Error("not allowed"); };
  expect(registerHandler("https://focusflow.app")).toBe(false);
  navigator.registerProtocolHandler = undefined;
  expect(registerHandler("https://focusflow.app")).toBe(false);
  navigator.registerProtocolHandler = original;
});

test("the key is found in the address the browser opens, or after a #", () => {
  expect(keyFromAddress("?open=lms&lmskey=web%2Bfocusflow%3A%2F%2Ftoken%3Dabc123%3D%3D", "")).toBe("abc123==");
  expect(keyFromAddress("?open=lms", "#://token=abc123==")).toBe("abc123==");
  expect(keyFromAddress("?open=lms", "")).toBe("");
  expect(keyFromAddress("", "#section")).toBe("");
  expect(keyFromAddress(undefined, undefined)).toBe("");
});

test("each sign-in link gets a fresh number", () => {
  expect(randomPassport()).toMatch(/^\d+$/);
  expect(randomPassport()).not.toBe(randomPassport());
});

test("the result of a sync is said in plain words", () => {
  expect(summarizeSync({ subjects: 1, assignments: 5, moved: 0 })).toBe("Added 1 subject, 5 assignments.");
  expect(summarizeSync({ subjects: 0, assignments: 1, moved: 2 })).toBe("Added 1 assignment, 2 marked done.");
  expect(summarizeSync({ subjects: 0, assignments: 0, moved: 0, sessions: 40 })).toBe("Everything is up to date.");
  expect(summarizeSync({ skipped: "recent" })).toBe("Everything is up to date.");
  expect(summarizeSync({ error: "unreachable" })).toBe("");
  expect(summarizeSync(undefined)).toBe("");
});
