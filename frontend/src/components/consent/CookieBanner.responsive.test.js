import React from "react";
import { render, screen } from "@testing-library/react";
import CookieBanner from "./CookieBanner";
import CookieChoice from "./CookieChoice";

jest.mock("react-router-dom", () => ({ Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a> }), { virtual: true });
jest.mock("../../features/consent/googleSignIn", () => ({ loadGoogleScript: () => Promise.resolve() }));

beforeEach(() => window.localStorage.clear());

test("banner: scrolls inside itself on a short phone and has 44px buttons that shrink from sm", () => {
  render(<CookieBanner />);
  const banner = screen.getByRole("dialog");
  expect(banner.className).toContain("max-h-[85dvh]");
  expect(banner.className).toContain("overflow-y-auto");
  for (const name of [/accept all/i, /essential only/i]) {
    expect(screen.getByRole("button", { name }).className).toContain("py-3.5 sm:py-2.5");
  }
});

test("cookie choice on the privacy page: buttons are tall enough to tap on a phone", () => {
  render(<CookieChoice />);
  expect(screen.getByRole("button", { name: /accept all/i }).className).toContain("py-3.5 sm:py-2.5");
  expect(screen.getByRole("button", { name: /essential only/i }).className).toContain("py-3.5 sm:py-2.5");
});
