import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CookieBanner from "./CookieBanner";
import { getConsent, CONSENT_KEY, CONSENT_VERSION } from "../../features/consent/consent";

jest.mock("react-router-dom", () => ({ Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a> }), { virtual: true });
const mockLoad = jest.fn(() => Promise.resolve());
jest.mock("../../features/consent/googleSignIn", () => ({ loadGoogleScript: () => mockLoad() }));

beforeEach(() => { window.localStorage.clear(); mockLoad.mockReset(); mockLoad.mockImplementation(() => Promise.resolve()); }); // CRA resets mocks between tests

test("a first-time visitor sees the notice, with a link to the privacy details", () => {
  render(<CookieBanner />);
  expect(screen.getByRole("dialog", { name: "Cookies and privacy" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /privacy details/i })).toHaveAttribute("href", "/privacy");
  expect(mockLoad).not.toHaveBeenCalled(); // nothing goes to Google before a choice
});

test("Accept all remembers the choice, hides the notice and allows Google's script", () => {
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole("button", { name: /accept all/i }));
  expect(getConsent()).toBe("all");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mockLoad).toHaveBeenCalledTimes(1);
});

test("Essential only remembers the choice and never loads Google's script", () => {
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole("button", { name: /essential only/i }));
  expect(getConsent()).toBe("essential");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mockLoad).not.toHaveBeenCalled();
});

test("someone who already chose is not asked again", () => {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: "essential", version: CONSENT_VERSION }));
  render(<CookieBanner />);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("someone who already accepted gets Google's script on this visit, with no banner", () => {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: "all", version: CONSENT_VERSION }));
  render(<CookieBanner />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mockLoad).toHaveBeenCalledTimes(1);
});
