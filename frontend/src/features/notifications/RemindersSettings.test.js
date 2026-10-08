// The "Send test email" button: it asks the server for an email-only test and shows the real answer.
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemindersSettings from "./RemindersSettings";
import { ToastProvider } from "../../components/ui";
import { notifyAPI } from "../../services/api";
import { pushStatus } from "./push";

jest.mock("../../services/api", () => ({
  notifyAPI: { getSettings: jest.fn(), sendTest: jest.fn() },
}));
jest.mock("./push", () => ({
  pushStatus: jest.fn(),
  enablePush: jest.fn(),
  disablePush: jest.fn(),
}));

const SETTINGS = {
  timezone: "Asia/Karachi", digestEnabled: true, digestTime: "07:00", classReminders: true, deadlineReminders: true,
  routineReminders: true, attendancePrompts: true, leadMinutes: 60, attendanceDelay: 0, submitPrompts: true, submitLead: 180,
  quizFollowups: true, quizFollowupDelay: 10, emailEnabled: false, whatsappEnabled: false, whatsappPhone: "", vapidPublicKey: "k",
};

async function open() {
  pushStatus.mockResolvedValue("off"); // CRA resets mocks between tests
  notifyAPI.getSettings.mockResolvedValue(SETTINGS);
  render(<ToastProvider><RemindersSettings /></ToastProvider>);
  return screen.findByRole("button", { name: /send test email/i });
}

test("Send test email asks for an email test and shows the success toast", async () => {
  notifyAPI.sendTest.mockResolvedValue({ success: true, result: { email: { ok: true } } });
  fireEvent.click(await open());
  await waitFor(() => expect(notifyAPI.sendTest).toHaveBeenCalledWith("email"));
  expect(await screen.findByText("Test email sent. Check your inbox (and spam).")).toBeInTheDocument();
});

test("while it is sending the button says so and every test button is disabled", async () => {
  let finish;
  notifyAPI.sendTest.mockReturnValue(new Promise((r) => { finish = r; }));
  fireEvent.click(await open());
  const sending = await screen.findByRole("button", { name: /sending/i });
  expect(sending).toBeDisabled();
  expect(screen.getByRole("button", { name: /send a test/i })).toBeDisabled();
  finish({ success: true });
  expect(await screen.findByRole("button", { name: /send test email/i })).toBeEnabled();
});

test("a failure shows the server's plain message and no success toast", async () => {
  notifyAPI.sendTest.mockRejectedValue(new Error("The test email could not be sent: Google refused the access token (401)."));
  fireEvent.click(await open());
  expect(await screen.findByText("The test email could not be sent: Google refused the access token (401).")).toBeInTheDocument();
  expect(screen.queryByText(/Test email sent/)).toBeNull();
});

test("the general test names the email result, including the reason when it failed", async () => {
  notifyAPI.sendTest.mockResolvedValue({ result: { email: { ok: false, error: "Gmail refused to send (403)." } } });
  fireEvent.click(await open().then(() => screen.getByRole("button", { name: /^send a test$/i })));
  expect(await screen.findByText(/email failed: Gmail refused to send \(403\)\./)).toBeInTheDocument();
});
