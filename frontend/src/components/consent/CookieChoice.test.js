import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CookieChoice from "./CookieChoice";

jest.mock("../../features/consent/googleSignIn", () => ({ loadGoogleScript: () => Promise.resolve() }));

beforeEach(() => localStorage.clear());

test("the buttons say which choice is current, and show a themed focus ring", () => {
  render(<CookieChoice />);
  const all = screen.getByRole("button", { name: "Accept all" });
  const essential = screen.getByRole("button", { name: "Essential only" });
  expect(all).toHaveAttribute("aria-pressed", "false");
  expect(essential).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(essential);
  expect(essential).toHaveAttribute("aria-pressed", "true");
  expect(all).toHaveAttribute("aria-pressed", "false");
  expect(all).toHaveClass("focus-visible:ring-focus-ring");
  expect(essential).toHaveClass("focus-visible:ring-focus-ring");
});
