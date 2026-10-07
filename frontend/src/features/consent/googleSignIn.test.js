let loadGoogleScript;
beforeEach(() => {
  jest.resetModules(); // the loader remembers a load in progress, so each test starts fresh
  document.head.innerHTML = "";
  delete window.google;
  ({ loadGoogleScript } = require("./googleSignIn"));
});

test("nothing is fetched from Google until the loader is called", () => {
  expect(document.querySelectorAll('script[src*="accounts.google.com"]').length).toBe(0);
});

test("calling it adds Google's script once, even if asked several times", async () => {
  const a = loadGoogleScript();
  const b = loadGoogleScript();
  expect(document.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]').length).toBe(1);
  document.querySelector("script").onload();
  await Promise.all([a, b]);
});

test("once Google is there, no second script is added", async () => {
  window.google = { accounts: {} };
  await loadGoogleScript();
  expect(document.querySelectorAll("script").length).toBe(0);
});

test("if Google cannot be reached it fails clearly and can be tried again", async () => {
  const p = loadGoogleScript();
  document.querySelector("script").onerror();
  await expect(p).rejects.toThrow("could not be loaded");
  expect(document.querySelectorAll("script").length).toBe(0);
  const again = loadGoogleScript();
  expect(document.querySelectorAll("script").length).toBe(1);
  document.querySelector("script").onload();
  await again;
});
