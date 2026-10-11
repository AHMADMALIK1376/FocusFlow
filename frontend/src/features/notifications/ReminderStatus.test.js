import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ReminderStatus, { ago } from "./ReminderStatus";

const status = (over = {}) => ({
  reminders: { state: "awake", lastCheckedSecondsAgo: 120, warning: null },
  phone: { devices: 1 },
  email: { state: "working", note: null },
  keepAlive: { triggerConfigured: true },
  ...over,
});

test("ago: plain words for how long it has been", () => {
  expect(ago(null)).toBe("");
  expect(ago(10)).toBe("less than a minute ago");
  expect(ago(60)).toBe("1 minute ago");
  expect(ago(600)).toBe("10 minutes ago");
  expect(ago(3600)).toBe("1 hour ago");
  expect(ago(7200)).toBe("2 hours ago");
  expect(ago(3 * 86400)).toBe("3 days ago");
});

test("all good: awake, a phone, email working", () => {
  render(<ReminderStatus status={status()} onTestEmail={() => {}} />);
  expect(screen.getByText("Awake")).toBeInTheDocument();
  expect(screen.getByText("Last checked 2 minutes ago.")).toBeInTheDocument();
  expect(screen.getByText("1 device will get pop-ups.")).toBeInTheDocument();
  expect(screen.getByText("Working")).toBeInTheDocument();
  expect(screen.getByText("Emails are going out.")).toBeInTheDocument();
  expect(screen.queryByText(/keep-alive is not switched on/)).toBeNull();
});

test("asleep: shows the warning and says the keep-alive is missing", () => {
  render(<ReminderStatus status={status({
    reminders: { state: "asleep", lastCheckedSecondsAgo: 7200, warning: "The reminder server has not checked for a while, so reminders may be late." },
    keepAlive: { triggerConfigured: false },
  })} onTestEmail={() => {}} />);
  expect(screen.getByText("Asleep?")).toBeInTheDocument();
  expect(screen.getByText("Last checked 2 hours ago.")).toBeInTheDocument();
  expect(screen.getByText(/may be late/)).toBeInTheDocument();
  expect(screen.getByText(/keep-alive is not switched on/)).toBeInTheDocument();
});

test("no phone and failing email are called out in plain words", () => {
  render(<ReminderStatus status={status({
    phone: { devices: 0 },
    email: { state: "failing", note: "Google refused the saved Gmail permission." },
  })} onTestEmail={() => {}} />);
  expect(screen.getByText(/No phone has pop-ups turned on/)).toBeInTheDocument();
  expect(screen.getByText("Not working")).toBeInTheDocument();
  expect(screen.getByText("Google refused the saved Gmail permission.")).toBeInTheDocument();
});

test("email not set up shows what to do", () => {
  render(<ReminderStatus status={status({ email: { state: "not-set-up", note: "SMTP is blocked on Render's free plan." } })} onTestEmail={() => {}} />);
  expect(screen.getByText("Not set up")).toBeInTheDocument();
  expect(screen.getByText(/blocked on Render/)).toBeInTheDocument();
});

test("the test-email button calls back and shows progress", () => {
  const onTest = jest.fn();
  const { rerender } = render(<ReminderStatus status={status()} onTestEmail={onTest} />);
  fireEvent.click(screen.getByRole("button", { name: "Send test email" }));
  expect(onTest).toHaveBeenCalledTimes(1);
  rerender(<ReminderStatus status={status()} onTestEmail={onTest} testing />);
  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
});

test("if the status can't be loaded it says so quietly; before it loads it shows nothing", () => {
  const { container, rerender } = render(<ReminderStatus status={null} onTestEmail={() => {}} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<ReminderStatus status={null} error="Network error" onTestEmail={() => {}} />);
  expect(screen.getByText(/Couldn't check the reminder status right now \(Network error\)/)).toBeInTheDocument();
});
