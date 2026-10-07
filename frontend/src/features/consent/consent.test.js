import { getConsent, setConsent, hasChosen, allowsGoogle, CONSENT_KEY, CONSENT_VERSION } from "./consent";

beforeEach(() => window.localStorage.clear());

test("nothing chosen at first: the banner will show and Google is not allowed", () => {
  expect(getConsent()).toBeNull();
  expect(hasChosen()).toBe(false);
  expect(allowsGoogle()).toBe(false);
});

test("Accept all allows Google sign-in; Essential only does not", () => {
  expect(setConsent("all")).toBe(true);
  expect(getConsent()).toBe("all");
  expect(allowsGoogle()).toBe(true);
  setConsent("essential");
  expect(getConsent()).toBe("essential");
  expect(allowsGoogle()).toBe(false);
  expect(hasChosen()).toBe(true);
});

test("the choice is remembered with its version and time, and announced to the page", () => {
  const heard = jest.fn();
  window.addEventListener("ff:consent", heard);
  setConsent("essential");
  window.removeEventListener("ff:consent", heard);
  const saved = JSON.parse(window.localStorage.getItem(CONSENT_KEY));
  expect(saved.choice).toBe("essential");
  expect(saved.version).toBe(CONSENT_VERSION);
  expect(Number.isNaN(Date.parse(saved.at))).toBe(false);
  expect(heard).toHaveBeenCalledTimes(1);
});

test("a made-up choice is refused and nothing is saved", () => {
  expect(setConsent("everything")).toBe(false);
  expect(getConsent()).toBeNull();
});

test("a choice saved under an older version, or damaged, means ask again", () => {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: "all", version: CONSENT_VERSION - 1 }));
  expect(getConsent()).toBeNull();
  window.localStorage.setItem(CONSENT_KEY, "{not json");
  expect(getConsent()).toBeNull();
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: "maybe", version: CONSENT_VERSION }));
  expect(getConsent()).toBeNull();
});
