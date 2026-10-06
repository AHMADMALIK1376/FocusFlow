import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundaryRoute from "./ErrorBoundaryRoute";

// Jest here can't load react-router-dom 7 (same mock as SubjectsPage.card.test).
// The page needs only these two hooks, which every router provides; that it no
// longer crashes inside the app's real <BrowserRouter> is checked in the browser.
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/no-such-page" }),
  useNavigate: () => mockNavigate,
}), { virtual: true });

beforeEach(() => mockNavigate.mockClear());

test("an unknown address shows Page Not Found with that address", () => {
  render(<ErrorBoundaryRoute />);
  expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  expect(screen.getByText("/no-such-page")).toBeInTheDocument();
});

test("the buttons go to the dashboard or back", () => {
  render(<ErrorBoundaryRoute />);
  fireEvent.click(screen.getByRole("button", { name: /Go to Dashboard/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  fireEvent.click(screen.getByRole("button", { name: /Go back/ }));
  expect(mockNavigate).toHaveBeenCalledWith(-1);
});
