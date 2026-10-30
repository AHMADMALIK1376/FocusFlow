import { buildLaunchUrl, keyFromHash, randomPassport, summarizeSync } from "./lmsLink";

test("the sign-in address asks the LMS to come back to our settings page, with a # so the key stays in the browser", () => {
  const url = buildLaunchUrl("https://lms.iqra.edu.pk/", "https://focusflow.app", "12345");
  const u = new URL(url);
  expect(u.origin + u.pathname).toBe("https://lms.iqra.edu.pk/admin/tool/mobile/launch.php");
  expect(u.searchParams.get("service")).toBe("moodle_mobile_app");
  expect(u.searchParams.get("passport")).toBe("12345");
  expect(u.searchParams.get("urlscheme")).toBe("https://focusflow.app/settings?open=lms#");
});

test("the key is read from what follows # when the LMS sends the browser back", () => {
  expect(keyFromHash("#://token=abc123==")).toBe("abc123==");
  expect(keyFromHash("")).toBe("");
  expect(keyFromHash("#section")).toBe("");
  expect(keyFromHash(undefined)).toBe("");
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
