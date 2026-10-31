import React from "react";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "./PrivacyPage";

jest.mock("react-router-dom", () => ({ Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a> }), { virtual: true });
jest.mock("../features/consent/googleSignIn", () => ({ loadGoogleScript: () => Promise.resolve() }));

test("privacy page: cards are tighter on a phone, the back link is tappable, the long address can wrap", () => {
  const { container } = render(<PrivacyPage />);
  expect(container.querySelector("section").className).toContain("p-4 sm:p-6");
  expect(container.querySelector("main").className).toContain("min-h-[100dvh]");
  expect(screen.getByRole("link", { name: /back to focusflow/i }).className).toContain("min-h-[44px] sm:min-h-0");
  expect(screen.getByRole("link", { name: /github.com/i }).className).toContain("[overflow-wrap:anywhere]");
});
