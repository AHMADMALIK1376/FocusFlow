import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import LoginForm from "./LoginForm";

const mockNavigate = jest.fn();
const mockRestore = jest.fn();
jest.mock("react-router-dom", () => ({
  Link: ({ to, children }) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}), { virtual: true });
jest.mock("./UserContext", () => ({
  useUser: () => ({ login: jest.fn(), isLoading: false, error: null, clearError: jest.fn(), restoreSession: mockRestore }),
}));

const saveReason = (code) => localStorage.setItem("ff_signout_reason", JSON.stringify({ code, at: "2026-10-08T00:00:00Z" }));

beforeEach(() => {
  localStorage.clear();
  mockRestore.mockResolvedValue(false);
});

test("an expired session shows one calm line", () => {
  saveReason("TOKEN_EXPIRED");
  render(<LoginForm />);
  expect(screen.getByText("You were signed out because your session expired.")).toBeInTheDocument();
});

test("each reason has its own wording", () => {
  const seen = new Set();
  for (const code of ["TOKEN_EXPIRED", "USER_NOT_FOUND", "INVALID_TOKEN", "NO_TOKEN"]) {
    localStorage.clear();
    saveReason(code);
    const { container, unmount } = render(<LoginForm />);
    const line = container.querySelector("p.text-muted.text-center");
    expect(line.textContent).toMatch(/^You were signed out because /);
    seen.add(line.textContent);
    unmount();
  }
  expect(seen.size).toBe(4);
});

test("no line after a deliberate sign-out, or with no reason", () => {
  saveReason("manual");
  const a = render(<LoginForm />);
  expect(a.container.textContent).not.toMatch(/signed out because/);
  a.unmount();
  localStorage.clear();
  const b = render(<LoginForm />);
  expect(b.container.textContent).not.toMatch(/signed out because/);
});

test("when the cookie is still good the student goes straight to the dashboard", async () => {
  mockRestore.mockResolvedValue(true);
  render(<LoginForm />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true }));
  expect(mockRestore).toHaveBeenCalledTimes(1);
});

test("when there is no usable cookie the student stays on the page", async () => {
  render(<LoginForm />);
  await waitFor(() => expect(mockRestore).toHaveBeenCalledTimes(1));
  await Promise.resolve();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("right after a deliberate sign-out nothing is restored", () => {
  saveReason("manual");
  render(<LoginForm />);
  expect(mockRestore).not.toHaveBeenCalled();
});

test("re-rendering does not ask the server again", async () => {
  const { rerender } = render(<LoginForm />);
  rerender(<LoginForm />);
  rerender(<LoginForm />);
  await waitFor(() => expect(mockRestore).toHaveBeenCalledTimes(1));
});
