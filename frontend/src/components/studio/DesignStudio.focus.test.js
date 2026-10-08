// Keyboard focus and server updates: the things a mouse-only check misses.
import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DesignStudio from "./DesignStudio";
import { PreferencesProvider } from "../../preferences/PreferencesProvider";
import ThemeApplier from "../../preferences/ThemeApplier";
import { useAppTheme } from "../../preferences/useAppTheme";
import { ToastProvider } from "../ui/Toast";
import { PALETTES, paletteTheme } from "../../design/theme/palettes";
import { hexToRgb, rgbToTriplet } from "../../design/theme/color";

jest.mock("../../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => null,
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

const root = document.documentElement;
const trip = (hex) => rgbToTriplet(hexToRgb(hex));
const v = (name) => root.style.getPropertyValue(name);
const MIDNIGHT = PALETTES.find((p) => p.id === "midnight");
const MATCHA = PALETTES.find((p) => p.id === "matcha-latte");

let api;
function Probe() { api = useAppTheme(); return null; }
function Harness() {
  const [open, setOpen] = useState(true);
  return <DesignStudio open={open} onClose={() => setOpen(false)} onReopen={() => setOpen(true)} />;
}
const mount = () => render(
  <PreferencesProvider><ThemeApplier /><Probe /><ToastProvider><Harness /></ToastProvider></PreferencesProvider>
);
const palette = (p) => screen.getByRole("button", { name: `${p.name} palette` });
const insideDialog = () => screen.getByRole("dialog").contains(document.activeElement);

beforeEach(() => { localStorage.clear(); root.removeAttribute("style"); });

test("pressing Enter in the hex box keeps the keyboard focus in that same box", async () => {
  mount();
  const box = screen.getByLabelText("Hex code for background");
  box.focus();
  await userEvent.clear(box);
  await userEvent.type(box, "ec706d{enter}");
  await waitFor(() => expect(v("--canvas")).toBe(trip("#EC706D")));
  expect(screen.getByLabelText("Hex code for background")).toBe(box); // not replaced
  expect(document.activeElement).toBe(box);
  expect(box).toHaveValue("#EC706D");
});

test("the hex box still follows a swatch, a palette and Undo", async () => {
  mount();
  const box = screen.getByLabelText("Hex code for background");
  fireEvent.click(palette(MIDNIGHT));
  await waitFor(() => expect(box).toHaveValue(MIDNIGHT.background));
  fireEvent.click(screen.getByRole("button", { name: /^Undo/ }));
  await waitFor(() => expect(box).not.toHaveValue(MIDNIGHT.background));
});

test("focus stays inside the dialog when Keep editing closes the question", async () => {
  mount();
  fireEvent.click(palette(MIDNIGHT));
  fireEvent.keyDown(window, { key: "Escape" });
  const keep = await screen.findByRole("button", { name: "Keep editing" });
  await waitFor(() => expect(document.activeElement).toBe(keep));
  fireEvent.click(keep);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Keep editing" })).toBeNull());
  expect(document.activeElement).not.toBe(document.body);
  expect(insideDialog()).toBe(true);
});

test("focus stays inside the dialog when Escape closes the question", async () => {
  mount();
  fireEvent.click(palette(MIDNIGHT));
  fireEvent.keyDown(window, { key: "Escape" });
  await screen.findByRole("button", { name: "Keep editing" });
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("button", { name: "Keep editing" })).toBeNull());
  expect(document.activeElement).not.toBe(document.body);
  expect(insideDialog()).toBe(true);
});

test("an untouched draft follows a server update, so Escape does not ask about changes nobody made", async () => {
  mount();
  await act(async () => { api.setTheme(paletteTheme(MATCHA)); });
  await waitFor(() => expect(v("--canvas")).toBe(trip(MATCHA.background)));
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryByText("Unsaved changes")).toBeNull();
});

test("a draft with changes keeps them when a server update arrives", async () => {
  mount();
  fireEvent.click(palette(MIDNIGHT));
  await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
  await act(async () => { api.setTheme(paletteTheme(MATCHA)); });
  await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
  fireEvent.keyDown(window, { key: "Escape" });
  expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
});

test("reopening after Discard changes starts focus in the dialog, not on Save", async () => {
  function Reopenable() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>reopen</button>
        <DesignStudio open={open} onClose={() => setOpen(false)} onReopen={() => setOpen(true)} />
      </>
    );
  }
  render(<PreferencesProvider><ThemeApplier /><Probe /><ToastProvider><Reopenable /></ToastProvider></PreferencesProvider>);
  fireEvent.click(palette(MIDNIGHT));
  fireEvent.keyDown(window, { key: "Escape" });
  fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByText("reopen"));
  const dlg = await screen.findByRole("dialog");
  await waitFor(() => expect(dlg.contains(document.activeElement)).toBe(true));
  expect(document.activeElement).not.toBe(screen.getByRole("button", { name: /^Save$/ }));
});

test("Undo keeps the keyboard focus when it runs out of steps, and does nothing then", async () => {
  mount();
  fireEvent.click(palette(MIDNIGHT));
  const undo = screen.getByRole("button", { name: /^Undo/ });
  expect(undo).toHaveAttribute("aria-disabled", "false");
  undo.focus();
  fireEvent.click(undo);
  await waitFor(() => expect(undo).toHaveAttribute("aria-disabled", "true"));
  expect(undo).not.toBeDisabled();
  expect(document.activeElement).toBe(undo);
  const before = v("--canvas");
  fireEvent.click(undo);
  expect(v("--canvas")).toBe(before);
});

test("the dialog scrolls focused controls clear of the sticky Save bar", () => {
  mount();
  expect(screen.getByRole("dialog")).toHaveClass("scroll-pb-40");
});
