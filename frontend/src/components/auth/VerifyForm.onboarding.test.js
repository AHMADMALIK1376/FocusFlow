import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VerifyForm from "./VerifyForm";
import { needsOnboarding } from "../../features/onboarding/needsOnboarding";

const mockNavigate = jest.fn();
let mockVerify;
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock("./UserContext", () => ({
  useUser: () => ({ verifyEmail: (...a) => mockVerify(...a), resendVerificationCode: jest.fn(), isLoading: false }),
}));

beforeEach(() => {
  window.localStorage.clear();
  sessionStorage.setItem("pendingVerificationEmail", "new@student.edu");
  mockNavigate.mockClear();
});

function enterCode(digits) {
  const boxes = screen.getAllByRole("textbox");
  digits.split("").forEach((d, i) => fireEvent.change(boxes[i], { target: { value: d } }));
  fireEvent.click(screen.getByRole("button", { name: /verify/i }));
}

test("a right code takes a new account to the welcome set-up, and switches it on", async () => {
  mockVerify = jest.fn().mockResolvedValue({ success: true });
  render(<VerifyForm />);
  enterCode("1234");
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/onboarding"));
  expect(mockVerify).toHaveBeenCalledWith("new@student.edu", "1234");
  expect(needsOnboarding()).toBe(true);
});

test("a wrong code stays on the page and starts no set-up", async () => {
  mockVerify = jest.fn().mockResolvedValue({ success: false, error: "Invalid code" });
  render(<VerifyForm />);
  enterCode("9999");
  await screen.findByText("Invalid code");
  expect(mockNavigate).not.toHaveBeenCalledWith("/onboarding");
  expect(needsOnboarding()).toBe(false);
});
