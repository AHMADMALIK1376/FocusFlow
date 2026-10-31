import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LmsConnectCard from "./LmsConnectCard";

const mockApi = { status: jest.fn(), connect: jest.fn(), sync: jest.fn(), disconnect: jest.fn() };
jest.mock("../../services/api", () => ({ lmsAPI: { status: (...a) => mockApi.status(...a), connect: (...a) => mockApi.connect(...a), sync: (...a) => mockApi.sync(...a), disconnect: (...a) => mockApi.disconnect(...a) } }));

const SITE = "https://lms.iqra.edu.pk";
beforeEach(() => {
  Object.values(mockApi).forEach((f) => f.mockReset());
  window.history.replaceState(null, "", "/settings?open=lms");
});

test("when the server has not switched the feature on, it says so and offers nothing to click", async () => {
  mockApi.status.mockResolvedValue({ available: false });
  render(<LmsConnectCard />);
  expect(await screen.findByText(/not switched on/i)).toBeInTheDocument();
  expect(screen.queryByRole("link")).toBeNull();
});

test("not connected: a sign-in link to the university LMS, and what FocusFlow does and does not do", async () => {
  mockApi.status.mockResolvedValue({ available: true, site: SITE, connected: false });
  render(<LmsConnectCard />);
  const link = await screen.findByRole("link", { name: /sign in with the lms/i });
  expect(link.getAttribute("href")).toMatch(/^https:\/\/lms\.iqra\.edu\.pk\/admin\/tool\/mobile\/launch\.php\?/);
  expect(new URL(link.getAttribute("href")).searchParams.get("urlscheme")).toBe("web+focusflow");
  expect(screen.getByRole("link", { name: /sign in the manual way/i }).getAttribute("href")).toContain("urlscheme=moodlemobile");
  expect(screen.getByText(/only reads/i)).toBeInTheDocument();
  expect(screen.getByText(/never sees your Microsoft password/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /sync now/i })).toBeNull();
});

test("coming back from the LMS: the key in the address is used once, wiped from the address, and the result is shown", async () => {
  mockApi.status.mockResolvedValue({ available: true, site: SITE, connected: false });
  mockApi.connect.mockResolvedValue({ connected: true, result: { subjects: 3, assignments: 7, moved: 1 } });
  window.history.replaceState(null, "", "/settings?open=lms&lmskey=web%2Bfocusflow%3A%2F%2Ftoken%3DSECRETKEY%3D%3D");
  render(<LmsConnectCard />);
  await waitFor(() => expect(mockApi.connect).toHaveBeenCalledWith("SECRETKEY=="));
  expect(mockApi.connect).toHaveBeenCalledTimes(1);
  expect(window.location.hash).toBe("");
  expect(window.location.search).toBe("?open=lms");
  expect(window.location.href).not.toContain("SECRETKEY");
  expect(await screen.findByText("Added 3 subjects, 7 assignments, 1 marked done.")).toBeInTheDocument();
});

test("pasting the text by hand works too, and a refusal is shown in plain words", async () => {
  mockApi.status.mockResolvedValue({ available: true, site: SITE, connected: false });
  mockApi.connect.mockRejectedValue(new Error("The LMS did not accept that key."));
  render(<LmsConnectCard />);
  await screen.findByRole("link", { name: /sign in with the lms/i });
  const button = screen.getByRole("button", { name: "Connect" });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Text from the LMS"), { target: { value: "moodlemobile://token=abc" } });
  fireEvent.click(button);
  await waitFor(() => expect(mockApi.connect).toHaveBeenCalledWith("moodlemobile://token=abc"));
  expect(await screen.findByRole("alert")).toHaveTextContent("The LMS did not accept that key.");
});

test("connected: shows the last sync, Sync now reports what changed, and a rapid second press says so", async () => {
  mockApi.status.mockResolvedValue({ available: true, site: SITE, connected: true, needsReconnect: false, lastSynced: "2026-10-31T08:00:00Z" });
  mockApi.sync.mockResolvedValueOnce({ result: { subjects: 0, assignments: 2, moved: 0 } }).mockResolvedValueOnce({ result: { skipped: "recent" } });
  render(<LmsConnectCard />);
  expect(await screen.findByText("Connected")).toBeInTheDocument();
  expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /sign in with the lms/i })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /sync now/i }));
  expect(await screen.findByText("Added 2 assignments.")).toBeInTheDocument();
  expect(mockApi.sync).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole("button", { name: /sync now/i }));
  expect(await screen.findByText("Just synced a moment ago.")).toBeInTheDocument();
});

test("a key the LMS no longer accepts asks the student to sign in again", async () => {
  mockApi.status.mockResolvedValue({ available: true, site: SITE, connected: true, needsReconnect: true, lastError: "The LMS no longer accepts your key. Please reconnect." });
  render(<LmsConnectCard />);
  expect(await screen.findByRole("alert")).toHaveTextContent("no longer accepts your key");
  expect(screen.getByRole("link", { name: /sign in with the lms/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /sync now/i })).toBeNull();
});

test("disconnect asks first, says the subjects and assignments stay, and cancels cleanly", async () => {
  mockApi.status.mockResolvedValueOnce({ available: true, site: SITE, connected: true, needsReconnect: false }).mockResolvedValue({ available: true, site: SITE, connected: false });
  mockApi.disconnect.mockResolvedValue({ success: true });
  render(<LmsConnectCard />);
  fireEvent.click(await screen.findByRole("button", { name: /disconnect/i }));
  expect(screen.getByText(/subjects and assignments stay/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(mockApi.disconnect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
  fireEvent.click(screen.getByRole("button", { name: /yes, disconnect/i }));
  await waitFor(() => expect(mockApi.disconnect).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole("link", { name: /sign in with the lms/i })).toBeInTheDocument();
  expect(screen.getByText(/Disconnected\. Your subjects and assignments stay\./)).toBeInTheDocument();
});

test("the browser is asked to send LMS sign-in links to FocusFlow", async () => {
  mockApi.status.mockResolvedValue({ available: true, site: SITE, connected: false });
  const original = navigator.registerProtocolHandler;
  navigator.registerProtocolHandler = jest.fn();
  render(<LmsConnectCard />);
  await screen.findByRole("link", { name: /sign in with the lms/i });
  expect(navigator.registerProtocolHandler).toHaveBeenCalledWith("web+focusflow", expect.stringContaining("/settings?open=lms&lmskey=%s"));
  navigator.registerProtocolHandler = original;
});

test("the key never appears on the page", async () => {
  mockApi.status.mockResolvedValue({ available: true, site: SITE, connected: false });
  mockApi.connect.mockResolvedValue({ connected: true, result: {} });
  window.history.replaceState(null, "", "/settings?open=lms#://token=SECRETKEY==");
  const { container } = render(<LmsConnectCard />);
  await waitFor(() => expect(mockApi.connect).toHaveBeenCalled());
  expect(container.innerHTML).not.toContain("SECRETKEY");
});
