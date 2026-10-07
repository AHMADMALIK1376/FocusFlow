import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PrivacyPage from "./PrivacyPage";
import { getConsent } from "../features/consent/consent";

jest.mock("react-router-dom", () => ({ Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a> }), { virtual: true });
jest.mock("../features/consent/googleSignIn", () => ({ loadGoogleScript: () => Promise.resolve() }));

beforeEach(() => window.localStorage.clear());

test("it explains the cookie, what is stored, and who handles the data", () => {
  render(<PrivacyPage />);
  expect(screen.getByRole("heading", { name: "Privacy and cookies" })).toBeInTheDocument();
  expect(screen.getByText("ff_session (cookie)")).toBeInTheDocument();
  expect(screen.getByText(/HttpOnly/)).toBeInTheDocument();
  expect(screen.getByText("Supabase")).toBeInTheDocument();
  expect(screen.getByText("Render")).toBeInTheDocument();
  expect(screen.getByText("Vercel")).toBeInTheDocument();
});

test("the choice can be changed here, and the page shows the current one", () => {
  render(<PrivacyPage />);
  expect(screen.getByTestId("current-choice")).toHaveTextContent("not chosen yet");
  fireEvent.click(screen.getByRole("button", { name: /essential only/i }));
  expect(getConsent()).toBe("essential");
  expect(screen.getByTestId("current-choice")).toHaveTextContent("Essential only");
  fireEvent.click(screen.getByRole("button", { name: /accept all/i }));
  expect(getConsent()).toBe("all");
  expect(screen.getByText(/Accept all \(Google sign-in allowed\)/)).toBeInTheDocument();
});

test("lists the remembered sign-in colours and how to remove them", () => {
  render(<PrivacyPage />);
  expect(screen.getByText("focusflow:theme.device")).toBeInTheDocument();
  expect(screen.getByText(/keeps them after signing out/)).toBeInTheDocument();
  expect(screen.getByText(/save Reset to FocusFlow colours/)).toBeInTheDocument();
});
