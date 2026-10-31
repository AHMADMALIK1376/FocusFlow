import React from "react";
import { render, screen } from "@testing-library/react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ResetPassword from "./ResetPassword";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock("./UserContext", () => ({
  useUser: () => ({ login: jest.fn(), isLoading: false, error: null, clearError: jest.fn() }),
}));
jest.mock("../../services/api", () => ({ authAPI: {} }));

beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });

// Phone: full width, 16px text (so phones do not zoom). From md up: today's width and 14px text.
const phoneInput = (el, desktopWidth) => {
  expect(el.className).toContain("text-base");
  expect(el.className).toContain("md:text-sm");
  expect(el.className).toMatch(/\bw-full\b/);
  if (desktopWidth) expect(el.className).toContain(desktopWidth);
};

test("sign-in: inputs and button are full width on a phone and keep 85% from md", () => {
  render(<LoginForm />);
  phoneInput(screen.getByPlaceholderText("Growth Email"), "md:w-[85%]");
  phoneInput(screen.getByPlaceholderText("Access Key"), "md:w-[85%]");
  expect(screen.getByRole("button", { name: /unleash focus/i }).className).toContain("w-full md:w-[85%]");
  expect(screen.getByRole("link", { name: /forgot password/i }).className).toContain("min-h-[44px]");
});

test("sign-up: inputs are full width on a phone", () => {
  render(<RegisterForm />);
  phoneInput(screen.getByPlaceholderText("Full Name"));
  phoneInput(screen.getByPlaceholderText("Email Address"));
  phoneInput(screen.getByPlaceholderText("Create Access Key"));
  expect(screen.getByRole("button", { name: /claim your reign/i }).className).toContain("w-full md:w-[85%]");
});

test("forgot and reset password: inputs and buttons fit a phone, keep 80% from md", () => {
  const f = render(<ForgotPasswordForm />);
  phoneInput(screen.getByPlaceholderText("Email Address"), "md:w-[80%]");
  expect(screen.getByRole("button", { name: /send reset code/i }).className).toContain("w-full md:w-[80%]");
  expect(screen.getByRole("link", { name: /back to login/i }).className).toContain("min-h-[44px]");
  f.unmount();
  sessionStorage.setItem("verifiedResetEmail", "a@b.co");
  sessionStorage.setItem("resetCode", "1234");
  render(<ResetPassword />);
  phoneInput(screen.getByPlaceholderText(/min 6 characters/i), "md:w-[80%]");
  phoneInput(screen.getByPlaceholderText("Confirm New Password"), "md:w-[80%]");
});
