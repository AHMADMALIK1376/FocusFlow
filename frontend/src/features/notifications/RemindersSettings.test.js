// The "Send test email" button: it asks the server for an email-only test and shows the real answer.
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemindersSettings from "./RemindersSettings";
import { ToastProvider } from "../../components/ui";
import { notifyAPI } from "../../services/api";
import { pushStatus } from "./push";

jest.mock("../../services/api", () => ({
  notifyAPI: { getSettings: jest.fn(), sendTest: jest.fn(), getStatus: jest.fn() },
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
  notifyAPI.getStatus.mockRejectedValue(new Error("no status in this test")); // CRA resets mocks between tests
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

// ── Status lines (GET /notify/status) ──────────────────────────────────

async function openWithStatus(status) {
  pushStatus.mockResolvedValue("off");
  notifyAPI.getSettings.mockResolvedValue(SETTINGS);
  notifyAPI.getStatus.mockResolvedValue(status);
  render(<ToastProvider><RemindersSettings /></ToastProvider>);
  await screen.findByRole("button", { name: /send test email/i });
}

test("shows the three status lines from the server", async () => {
  await openWithStatus({ lastCheck: { minutesAgo: 4, stale: false }, pushDevices: 2, email: { state: "working", reason: null } });
  expect(await screen.findByText("Last reminder check: 4 minutes ago")).toBeInTheDocument();
  expect(screen.getByText("Pop-ups: on for 2 devices")).toBeInTheDocument();
  expect(screen.getByText("Email: working")).toBeInTheDocument();
  expect(screen.queryByText(/has not checked in/)).toBeNull();
});

test("unknown check, no device and a failing email give the plain wording and the reason", async () => {
  await openWithStatus({ lastCheck: { minutesAgo: null, stale: false }, pushDevices: 0, email: { state: "failing", reason: "Gmail refused the sign-in." } });
  expect(await screen.findByText("Last reminder check: unknown")).toBeInTheDocument();
  expect(screen.getByText("Pop-ups: no device has them on")).toBeInTheDocument();
  expect(screen.getByText("Email: not working (Gmail refused the sign-in.)")).toBeInTheDocument();
});

test("one device, not set up and not checked yet wording", async () => {
  await openWithStatus({ lastCheck: { minutesAgo: 1, stale: false }, pushDevices: 1, email: { state: "not_configured", reason: "Email is not set up on the server yet." } });
  expect(await screen.findByText("Last reminder check: 1 minute ago")).toBeInTheDocument();
  expect(screen.getByText("Pop-ups: on for 1 device")).toBeInTheDocument();
  expect(screen.getByText("Email: not set up on the server yet")).toBeInTheDocument();
});

test("email not checked yet", async () => {
  await openWithStatus({ lastCheck: { minutesAgo: 2, stale: false }, pushDevices: 1, email: { state: "unknown", reason: null } });
  expect(await screen.findByText("Email: not checked yet")).toBeInTheDocument();
});

test("a stale check shows the warning with the minutes", async () => {
  await openWithStatus({ lastCheck: { minutesAgo: 42, stale: true }, pushDevices: 1, email: { state: "working", reason: null } });
  expect(await screen.findByText(/The reminder server has not checked in for 42 minutes, so reminders may be late\./)).toBeInTheDocument();
  expect(screen.getByText("Last reminder check: 42 minutes ago")).toBeInTheDocument();
});

test("when the status cannot be loaded the lines are hidden and no error is shown", async () => {
  await open(); // getStatus rejects
  expect(screen.queryByText(/Last reminder check/)).toBeNull();
  expect(screen.queryByText(/Pop-ups:/)).toBeNull();
  expect(screen.queryByText(/Email:/)).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: /send test email/i })).toBeInTheDocument();
});
