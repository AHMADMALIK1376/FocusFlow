// Below lg the bottom tab bar is the navigation; from lg the sidebar takes over.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileTabBar from "./MobileTabBar";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/dashboard" }),
}), { virtual: true });
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));

beforeEach(() => mockNavigate.mockClear());

test("the tab bar hides from lg up (the sidebar is shown there) and not before", () => {
  render(<MobileTabBar />);
  const nav = screen.getByRole("navigation", { name: "Primary" });
  expect(nav.className).toContain("lg:hidden");
  expect(nav.className).not.toContain("md:hidden");
});

test("labels shrink instead of overflowing, and carry a title with the full name", () => {
  render(<MobileTabBar />);
  const tab = screen.getByTitle("nav.exams");
  expect(tab.className).toContain("min-w-0");
  expect(tab.querySelector("span").className).toContain("truncate");
});

test("tapping a tab goes to its page", () => {
  render(<MobileTabBar />);
  fireEvent.click(screen.getByTitle("nav.subjects"));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects");
});
