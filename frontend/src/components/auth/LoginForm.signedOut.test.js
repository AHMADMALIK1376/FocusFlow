import React from "react";
import { render, screen } from "@testing-library/react";
import LoginForm from "./LoginForm";
import { rememberSignOutReason, peekSignOutReason } from "../../services/signOutReason";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock("./UserContext", () => ({
  useUser: () => ({ login: jest.fn(), isLoading: false, error: null, clearError: jest.fn() }),
}));

beforeEach(() => window.localStorage.clear());

test("signed out by the server: the sign-in page says why, calmly, in plain words", () => {
  rememberSignOutReason("TOKEN_EXPIRED");
  render(<LoginForm />);
  expect(screen.getByRole("status")).toHaveTextContent(/it had been a long time since you last used FocusFlow/);
});

test("the note is shown once: it is gone after the page has loaded", () => {
  rememberSignOutReason("NO_TOKEN");
  render(<LoginForm />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(peekSignOutReason()).toBeNull();
});

test("a normal visit to the sign-in page shows no note", () => {
  render(<LoginForm />);
  expect(screen.queryByRole("status")).toBeNull();
});
