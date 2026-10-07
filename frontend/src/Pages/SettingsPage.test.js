// Settings is a grid of cards; each card opens its existing controls in a pop-up.
import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import SettingsPage from "./SettingsPage";
import { PreferencesContext } from "../preferences/PreferencesProvider";
import { ToastProvider } from "../components/ui";
import { getConsent } from "../features/consent/consent";

// The address holds the open card (?open=...). A tiny stand-in for the router keeps a
// history of addresses, so tests can see what was pushed, replaced and gone back over.
let mockHistory = [""];
const mockListeners = new Set();
jest.mock("react-router-dom", () => {
  const React = require("react");
  const notify = () => mockListeners.forEach((f) => f());
  return {
    Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
    useSearchParams: () => {
      const [, rerender] = React.useReducer((x) => x + 1, 0);
      React.useEffect(() => { mockListeners.add(rerender); return () => mockListeners.delete(rerender); }, []);
      const set = (next, opts) => {
        const search = new URLSearchParams(next).toString();
        if (opts && opts.replace) mockHistory[mockHistory.length - 1] = search;
        else mockHistory.push(search);
        notify();
      };
      return [new URLSearchParams(mockHistory[mockHistory.length - 1]), set];
    },
    useNavigate: () => (n) => { if (n === -1) { mockHistory.pop(); notify(); } },
  };
}, { virtual: true });
const goBack = () => act(() => { mockHistory.pop(); mockListeners.forEach((f) => f()); });
jest.mock("../features/consent/googleSignIn", () => ({ loadGoogleScript: () => Promise.resolve() }));
// The heavy controls have their own tests; here we only check each lands in the right pop-up.
jest.mock("../features/notifications/RemindersSettings", () => () => <div data-testid="reminders-controls" />);
jest.mock("../components/dashboard/FontSelector", () => () => <div data-testid="font-controls" />);
jest.mock("../components/dashboard/WidgetManager", () => () => <div data-testid="widget-controls" />);
jest.mock("../components/dashboard/DashboardSwitcher", () => () => <div data-testid="workspace-controls" />);

let updateProfile;
function page(profile = { displayName: "Ahmad", mascot: "cap" }) {
  updateProfile = jest.fn();
  return render(
    <PreferencesContext.Provider value={{ profile, updateProfile }}>
      <ToastProvider><SettingsPage /></ToastProvider>
    </PreferencesContext.Provider>
  );
}

const CARDS = [
  ["Profile", () => screen.getByLabelText("Display name")],
  ["Reminders", () => screen.getByTestId("reminders-controls")],
  ["Appearance", () => screen.getByTestId("font-controls")],
  ["Dashboard and workspaces", () => { screen.getByTestId("workspace-controls"); return screen.getByTestId("widget-controls"); }],
  ["Language", () => screen.getByRole("button", { name: /english/i })],
  ["Privacy and cookies", () => screen.getByRole("link", { name: /read the privacy details/i })],
];

beforeEach(() => { mockHistory = [""]; window.localStorage.clear(); });

test("shows one card per group, and no pop-up yet", () => {
  page();
  for (const [title] of CARDS) expect(screen.getByRole("button", { name: new RegExp(`^${title}`) })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test.each(CARDS)("the %s card opens a labelled pop-up with its controls, and Escape closes it", async (title, control) => {
  page();
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${title}`) }));
  expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
  expect(control()).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("the close button closes the pop-up and focus goes back to the card", async () => {
  page();
  const card = screen.getByRole("button", { name: /^Reminders/ });
  card.focus();
  fireEvent.click(card);
  const dialog = screen.getByRole("dialog", { name: "Reminders" });
  expect(document.activeElement).toBe(dialog);
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).toBe(card);
});

test("Tab stays inside the pop-up", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /^Privacy and cookies/ }));
  const dialog = screen.getByRole("dialog", { name: "Privacy and cookies" });
  const close = within(dialog).getByRole("button", { name: "Close" });
  const last = within(dialog).getByRole("button", { name: /essential only/i });
  last.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
});

test("a link with ?open=reminders opens that card", () => {
  mockHistory = ["open=reminders"];
  page();
  expect(screen.getByRole("dialog", { name: "Reminders" })).toBeInTheDocument();
  expect(screen.getByTestId("reminders-controls")).toBeInTheDocument();
});

test("an unknown ?open= opens nothing", () => {
  mockHistory = ["open=nope"];
  page();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("the student's mascot is shown, and Choose mascot opens the picker", () => {
  page();
  expect(screen.getByRole("button", { name: "Boop the Cap" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /choose mascot/i }));
  const picker = screen.getByRole("dialog", { name: "Choose your mascot" });
  fireEvent.click(within(picker).getByText("Sloth"));
  expect(updateProfile).toHaveBeenCalledWith({ mascot: "sloth", avatarUrl: null });
});

test("with no mascot picked, the default one shows", () => {
  page({ displayName: "Ahmad" });
  expect(screen.getByRole("button", { name: "Boop the Sloth" })).toBeInTheDocument();
});

test("the profile pop-up still saves the profile", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /^Profile/ }));
  fireEvent.change(screen.getByLabelText("University / College"), { target: { value: "FAST" } });
  fireEvent.click(screen.getByRole("button", { name: /^save/i }));
  expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Ahmad", university: "FAST" }));
});

test("the privacy pop-up changes the cookie choice", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /^Privacy and cookies/ }));
  fireEvent.click(screen.getByRole("button", { name: /essential only/i }));
  expect(getConsent()).toBe("essential");
  expect(screen.getByTestId("current-choice")).toHaveTextContent("Essential only");
});

test("opening a card adds one history entry, and closing goes back over it", async () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /^Appearance/ }));
  expect(mockHistory).toEqual(["", "open=appearance"]);
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mockHistory).toEqual([""]);
});

test("the back button closes the pop-up, and a later close does not go back again", async () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /^Language/ }));
  goBack();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mockHistory).toEqual([""]);
});

test("closing a pop-up opened by a link clears the address without going back", async () => {
  mockHistory = ["", "open=reminders"];
  page();
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mockHistory).toEqual(["", ""]);
});
