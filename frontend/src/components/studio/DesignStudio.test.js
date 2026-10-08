import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import DesignStudio from "./DesignStudio";
import { PreferencesProvider } from "../../preferences/PreferencesProvider";
import ThemeApplier from "../../preferences/ThemeApplier";
import { useAppTheme } from "../../preferences/useAppTheme";
import { ToastProvider } from "../ui/Toast";
import { DEFAULT_THEME } from "../../design/theme/theme";
import { PALETTES, paletteTheme } from "../../design/theme/palettes";
import { deriveTokens } from "../../design/theme/deriveTokens";
import { hexToRgb, rgbToTriplet } from "../../design/theme/color";

// No network: the sync hook sees a signed-out student.
jest.mock("../../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => null,
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

// Real helpers, except that one describe can make the readability result "unreadable".
let mockForceUnreadable = false;
jest.mock("../../design/theme/studio", () => {
  const actual = jest.requireActual("../../design/theme/studio");
  return {
    ...actual,
    readabilityNotes: (...args) => (mockForceUnreadable ? { status: "unreadable", notes: [] } : actual.readabilityNotes(...args)),
  };
});

const root = document.documentElement;
const PREFS = "focusflow:preferences";
const CACHE = "focusflow:theme.colors";
const trip = (hex) => rgbToTriplet(hexToRgb(hex));
const storedTheme = () => JSON.parse(localStorage.getItem(PREFS)).theme;
const v = (name) => root.style.getPropertyValue(name);
const DEFAULT_CANVAS = trip(DEFAULT_THEME.background);
const MIDNIGHT = PALETTES.find((p) => p.id === "midnight");
const MATCHA = PALETTES.find((p) => p.id === "matcha-latte");

let api;
let reopened;
function Probe() {
  api = useAppTheme();
  return null;
}
function Harness({ initialOpen = true }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(false)}>outside-close</button>
      <button type="button" onClick={() => setOpen(true)}>outside-open</button>
      <DesignStudio open={open} onClose={() => setOpen(false)} onReopen={() => { reopened += 1; setOpen(true); }} />
    </>
  );
}
const tree = (initialOpen = true) => (
  <PreferencesProvider>
    <ThemeApplier />
    <Probe />
    <ToastProvider><Harness initialOpen={initialOpen} /></ToastProvider>
  </PreferencesProvider>
);
const mount = (initialOpen = true) => render(tree(initialOpen));

const dialog = () => screen.getByRole("dialog", { name: "Design your dashboard" });
const palette = (p) => screen.getByRole("button", { name: `${p.name} palette` });
const closed = () => waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
const footer = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("style");
  mockForceUnreadable = false;
  reopened = 0;
});

describe("palettes", () => {
  it("a palette click previews on <html> without saving", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    expect(v("--brand")).toBe(trip(MIDNIGHT.brand));
    expect(v("--sage")).toBe(trip(MIDNIGHT.accent));
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true");
    expect(palette(MATCHA)).toHaveAttribute("aria-pressed", "false");
    expect(storedTheme()).toEqual(DEFAULT_THEME);
    expect(localStorage.getItem(CACHE)).toBeNull();
  });

  it("clicking the palette that is already chosen adds no undo step", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
  });

  it("choosing a palette clears the logo and icon colours", async () => {
    mount();
    fireEvent.click(screen.getByText("Advanced: logo and icon colours"));
    const details = dialog().querySelector("details");
    details.open = true;
    fireEvent(details, new Event("toggle"));
    fireEvent.click(within(screen.getByRole("group", { name: "Logo colour" })).getByRole("button", { name: "Coral #EC706D" }));
    await waitFor(() => expect(v("--logo")).toBe(trip("#EC706D")));
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(footer("Save"));
    await closed();
    expect(storedTheme()).toEqual(paletteTheme(MIDNIGHT));
  });
});

describe("hex box and colour input", () => {
  it("applies a code on Enter, with or without #", async () => {
    mount();
    const input = screen.getByLabelText("Hex code for background");
    fireEvent.change(input, { target: { value: "ec706d" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#EC706D")));
  });

  it("expands #abc on blur", async () => {
    mount();
    const input = screen.getByLabelText("Hex code for background");
    fireEvent.change(input, { target: { value: "#abc" } });
    fireEvent.blur(input);
    await waitFor(() => expect(v("--canvas")).toBe(trip("#AABBCC")));
    await waitFor(() => expect(screen.getByLabelText("Hex code for background")).toHaveValue("#AABBCC"));
    expect(screen.getByText("Now: #AABBCC")).toBeInTheDocument();
  });

  it("a bad code shows the error and changes nothing; typing clears it", async () => {
    mount();
    const input = screen.getByLabelText("Hex code for background");
    fireEvent.change(input, { target: { value: "zz12" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("That isn't a colour code. Try something like #EC706D.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(v("--canvas")).toBe(DEFAULT_CANVAS);
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
    fireEvent.change(input, { target: { value: "zz1" } });
    expect(screen.queryByText("That isn't a colour code. Try something like #EC706D.")).toBeNull();
  });

  it("the colour input previews, and two changes before blur are one undo step", async () => {
    mount();
    const color = screen.getByLabelText("Pick the background colour");
    fireEvent.change(color, { target: { value: "#123456" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#123456")));
    fireEvent.change(color, { target: { value: "#234567" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#234567")));
    fireEvent.blur(color);
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
  });

  it("after blur a new drag is a new undo step", async () => {
    mount();
    const color = screen.getByLabelText("Pick the background colour");
    fireEvent.change(color, { target: { value: "#123456" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#123456")));
    fireEvent.blur(color);
    fireEvent.change(color, { target: { value: "#234567" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#234567")));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(trip("#123456")));
  });

  it("only the last colour of a burst is applied (one per frame)", async () => {
    mount();
    const color = screen.getByLabelText("Pick the background colour");
    fireEvent.change(color, { target: { value: "#111111" } });
    fireEvent.change(color, { target: { value: "#222222" } });
    fireEvent.change(color, { target: { value: "#333333" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#333333")));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
  });

  it("Text Auto saves text as auto, and a text swatch sets it", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    expect(screen.getByRole("button", { name: "Auto text" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Black #111111" }));
    await waitFor(() => expect(v("--ink")).toBe(trip("#111111")));
    expect(screen.getByRole("button", { name: "Auto text" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Auto text" }));
    await waitFor(() => expect(v("--ink")).not.toBe(trip("#111111")));
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.click(screen.getByRole("button", { name: "Auto text" }));
    fireEvent.click(footer("Save"));
    await closed();
    expect(storedTheme().text).toBe("auto");
  });

  it("the Text picker has dark and light rows", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    expect(screen.getByText("Dark text")).toBeInTheDocument();
    expect(screen.getByText("Light text")).toBeInTheDocument();
    expect(screen.queryByText("Soft", { selector: "p" })).toBeNull();
  });
});

describe("Cancel, Save, Reset, Undo", () => {
  it("Cancel closes with no question and ends the preview", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    fireEvent.click(footer("Cancel"));
    await closed();
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(storedTheme()).toEqual(DEFAULT_THEME);
  });

  it("Save stores the draft, writes the cache, toasts, and survives a reload", async () => {
    const first = mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(footer("Save"));
    await closed();
    expect(screen.getByText("Colours saved")).toBeInTheDocument();
    expect(storedTheme()).toEqual(paletteTheme(MIDNIGHT));
    expect(localStorage.getItem(CACHE)).not.toBeNull();
    expect(v("--canvas")).toBe(trip(MIDNIGHT.background));
    first.unmount();
    root.removeAttribute("style");
    mount(false);
    expect(api.theme).toEqual(paletteTheme(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
  });

  it("Reset goes back to the FocusFlow colours in the draft, and needs Save", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    fireEvent.click(footer("Reset to FocusFlow colours"));
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(storedTheme()).toEqual(DEFAULT_THEME);
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
  });

  it("Reset then Save stores the default colours and removes the cache", async () => {
    mount(false);
    act(() => { api.setTheme(paletteTheme(MIDNIGHT)); });
    expect(localStorage.getItem(CACHE)).not.toBeNull();
    fireEvent.click(screen.getByText("outside-open"));
    await waitFor(() => expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(footer("Reset to FocusFlow colours"));
    fireEvent.click(footer("Save"));
    await closed();
    expect(storedTheme()).toEqual({ ...DEFAULT_THEME, presetId: "default" });
    expect(localStorage.getItem(CACHE)).toBeNull();
    expect(v("--canvas")).toBe(DEFAULT_CANVAS);
  });

  it("Undo is disabled at first, then steps back one change at a time", async () => {
    mount();
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(palette(MATCHA));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MATCHA.background)));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
  });

  it("announces changes in a polite live region", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    const live = dialog().querySelector("[aria-live='polite']");
    expect(live).toHaveTextContent("Midnight palette applied");
    fireEvent.click(footer(/Undo/));
    expect(live).toHaveTextContent("Undid the last change");
    fireEvent.click(footer("Reset to FocusFlow colours"));
    expect(live).toHaveTextContent("Back to FocusFlow colours");
  });
});

describe("unsaved changes guard", () => {
  const dirtyThenEscape = async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
  };

  it("Escape with changes asks, and the dialog stays", async () => {
    await dirtyThenEscape();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByText("You changed your colours but haven't saved them.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Unsaved changes");
    expect(dialog()).toBeInTheDocument();
    expect(document.activeElement).toBe(footer("Keep editing"));
  });

  it("Keep editing hides the question; Escape while asking does the same", async () => {
    await dirtyThenEscape();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(footer("Keep editing"));
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    expect(dialog()).toBeInTheDocument();
    expect(v("--canvas")).toBe(trip(MIDNIGHT.background));
  });

  it("the X does the same as Escape", async () => {
    await dirtyThenEscape();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Close" }));
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
  });

  it("a tap on the backdrop does the same", async () => {
    await dirtyThenEscape();
    fireEvent.click(dialog().previousSibling);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
  });

  it("Discard changes closes and reverts", async () => {
    await dirtyThenEscape();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(footer("Discard changes"));
    await closed();
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(storedTheme()).toEqual(DEFAULT_THEME);
  });

  it("Save and close saves", async () => {
    await dirtyThenEscape();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(footer("Save and close"));
    await closed();
    expect(storedTheme()).toEqual(paletteTheme(MIDNIGHT));
  });

  it("Escape with no changes closes at once, and a change undone back to the saved colours counts as none", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(footer(/Undo/));
    fireEvent.keyDown(window, { key: "Escape" });
    await closed();
    expect(screen.queryByText("Unsaved changes")).toBeNull();
  });

  it("beforeunload is blocked only while there are unsaved changes", async () => {
    mount();
    const fire = () => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(fire()).toBe(false);
    fireEvent.click(palette(MIDNIGHT));
    expect(fire()).toBe(true);
    fireEvent.click(footer(/Undo/));
    expect(fire()).toBe(false);
  });

  it("closed from outside while dirty (the Back button): reopens with the question and keeps the preview", async () => {
    await dirtyThenEscape();
    fireEvent.click(screen.getByText("outside-close"));
    await waitFor(() => expect(reopened).toBe(1));
    await waitFor(() => expect(screen.getByText("Unsaved changes")).toBeInTheDocument());
    expect(dialog()).toBeInTheDocument();
    expect(v("--canvas")).toBe(trip(MIDNIGHT.background));
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true");
  });

  it("closed from outside with no changes: closes and ends the preview", async () => {
    mount();
    fireEvent.click(screen.getByText("outside-close"));
    await closed();
    expect(reopened).toBe(0);
  });

  it("opening again starts from the saved colours", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(footer("Cancel"));
    await closed();
    fireEvent.click(screen.getByText("outside-open"));
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "false");
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
    expect(v("--canvas")).toBe(DEFAULT_CANVAS);
  });

  it("the theme changing from the server keeps the draft", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    act(() => { api.setTheme(paletteTheme(MATCHA)); });
    // setTheme ends the preview, then the Studio previews its draft again.
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true");
  });
});

describe("leaving the page", () => {
  it("unmounting while previewing puts the saved colours back", async () => {
    function Gone() {
      const [show, setShow] = useState(true);
      return <>{show && <DesignStudio open onClose={() => {}} onReopen={() => {}} />}<button type="button" onClick={() => setShow(false)}>leave</button></>;
    }
    render(<PreferencesProvider><ThemeApplier /><Probe /><ToastProvider><Gone /></ToastProvider></PreferencesProvider>);
    fireEvent.click(palette(PALETTES.find((p) => p.id === "espresso")));
    await waitFor(() => expect(v("--canvas")).toBe(trip("#1C1512")));
    fireEvent.click(screen.getByText("leave"));
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
  });

  it("an animation frame still pending at unmount dispatches nothing", async () => {
    const cancel = jest.spyOn(window, "cancelAnimationFrame");
    const { unmount } = mount();
    fireEvent.change(screen.getByLabelText("Pick the background colour"), { target: { value: "#123456" } });
    unmount();
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });
});

describe("readability", () => {
  it("says the default is original, a readable palette is fine, and mentions text changes", async () => {
    mount();
    expect(screen.getByText("These are the original FocusFlow colours.")).toBeInTheDocument();
    fireEvent.click(palette(MATCHA));
    await waitFor(() => expect(screen.queryByText("These are the original FocusFlow colours.")).toBeNull());
    expect(screen.getAllByRole("status").some((el) => el.textContent.includes("Readability check"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.click(screen.getByRole("button", { name: "Cream #FFF6E8" }));
    await waitFor(() => expect(screen.getByText("We made your text a little darker so it stays readable.")).toBeInTheDocument());
  });

  it("shows the preview card text", () => {
    mount();
    expect(screen.getByText("A small preview of your colours.")).toHaveClass("sr-only");
    expect(screen.getByText("Data Structures, 9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Start focus").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("a logo colour close to the brand gets a warning but Save stays on", async () => {
    mount();
    const details = dialog().querySelector("details");
    details.open = true;
    fireEvent(details, new Event("toggle"));
    fireEvent.click(within(screen.getByRole("group", { name: "Logo colour" })).getByRole("button", { name: "Coral #EC706D" }));
    await waitFor(() => expect(screen.getByText(/Your logo colour is hard to see/)).toBeInTheDocument());
    expect(footer("Save")).not.toBeDisabled();
  });

  describe("an unreadable mix", () => {
    it("switches Save off and says why, in the dialog and in the question", async () => {
      mockForceUnreadable = true;
      mount();
      fireEvent.click(palette(MIDNIGHT));
      await waitFor(() => expect(screen.getByText("This mix can't be made readable. Try a different background or text colour.")).toBeInTheDocument());
      expect(footer("Save")).toBeDisabled();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(footer("Save and close")).toBeDisabled();
    });
  });
});

describe("keyboard and labels", () => {
  it("every palette button has a name and aria-pressed; palettes are grouped with headings", () => {
    mount();
    PALETTES.forEach((p) => {
      const b = palette(p);
      expect(b).toHaveAttribute("aria-pressed");
      expect(b).toHaveTextContent(p.name);
    });
    ["Soft", "Bold", "Dark"].forEach((g) => expect(screen.getByRole("heading", { name: g })).toBeInTheDocument());
    expect(screen.getByText("Hand-picked sets that are easy to read.")).toBeInTheDocument();
  });

  it("every swatch has a name with its hex and aria-pressed, and the selected one has a tick", async () => {
    mount();
    const group = screen.getByRole("group", { name: "Background" });
    const swatches = within(group).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"));
    expect(swatches).toHaveLength(24);
    swatches.forEach((b) => expect(b.getAttribute("aria-label")).toMatch(/^.+ #[0-9A-F]{6}$/));
    const cream = within(group).getByRole("button", { name: "Cream #F5EFE6" });
    expect(cream).toHaveAttribute("aria-pressed", "true");
    expect(cream.querySelector("svg")).not.toBeNull();
    expect(within(group).getByRole("button", { name: "Blush #F9D9D6" }).querySelector("svg")).toBeNull();
  });

  it("the role buttons switch the picker and say which is pressed", () => {
    mount();
    const roles = screen.getByRole("group", { name: "Choose what to colour" });
    ["Background", "Brand", "Accent", "Text"].forEach((n) => expect(within(roles).getByRole("button", { name: n })).toBeInTheDocument());
    expect(within(roles).getByRole("button", { name: "Background" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(roles).getByRole("button", { name: "Brand" }));
    expect(within(roles).getByRole("button", { name: "Brand" })).toHaveAttribute("aria-pressed", "true");
    expect(within(roles).getByRole("button", { name: "Background" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Buttons, the navbar, the sidebar and highlights.")).toBeInTheDocument();
    expect(screen.getByLabelText("Hex code for brand")).toBeInTheDocument();
    expect(screen.getByLabelText("Pick the brand colour")).toBeInTheDocument();
  });

  it("the hex box and colour input have names, and Advanced starts closed", () => {
    mount();
    expect(screen.getByLabelText("Hex code for background")).toBeInTheDocument();
    expect(screen.getByLabelText("Pick the background colour")).toBeInTheDocument();
    const details = dialog().querySelector("details");
    expect(details).not.toHaveAttribute("open");
    expect(within(details).getByText("Advanced: logo and icon colours")).toBeInTheDocument();
  });

  it("Advanced holds the Logo and Icon pickers with Auto", () => {
    mount();
    const details = dialog().querySelector("details");
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(screen.getByRole("group", { name: "Logo colour" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Icon colour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auto logo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Auto icon" })).toHaveAttribute("aria-pressed", "true");
  });

  it("the footer buttons exist and no window.confirm is used", () => {
    const confirm = jest.spyOn(window, "confirm");
    mount();
    ["Cancel", "Save"].forEach((n) => footer(n));
    footer(/Undo/);
    footer("Reset to FocusFlow colours");
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

test("deriveTokens agrees with what is shown for a palette (sanity)", async () => {
  mount();
  fireEvent.click(palette(MIDNIGHT));
  const r = deriveTokens(paletteTheme(MIDNIGHT));
  await waitFor(() => expect(v("--ink")).toBe(r.tokens["--ink"]));
});
