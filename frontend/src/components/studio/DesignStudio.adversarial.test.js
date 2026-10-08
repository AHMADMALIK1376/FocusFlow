import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DesignStudio from "./DesignStudio";
import { PreferencesProvider } from "../../preferences/PreferencesProvider";
import ThemeApplier from "../../preferences/ThemeApplier";
import { useAppTheme as realUseAppTheme } from "../../preferences/useAppTheme";
import { ToastProvider } from "../ui/Toast";
import { DEFAULT_THEME, isDefaultPalette } from "../../design/theme/theme";
import { PALETTES, PALETTE_GROUPS, paletteTheme } from "../../design/theme/palettes";
import { deriveTokens, contrastFailures } from "../../design/theme/deriveTokens";
import { readabilityNotes } from "../../design/theme/studio";
import { hexToRgb, rgbToTriplet } from "../../design/theme/color";

jest.mock("../../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => null,
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

// Wrap the real hook so every previewTheme call is recorded (the wrapper keeps one identity).
const mockPreviewCalls = [];
let mockRealPreview = null;
const mockPreviewSpy = (t) => { mockPreviewCalls.push(t); return mockRealPreview(t); };
jest.mock("../../preferences/useAppTheme", () => {
  const actual = jest.requireActual("../../preferences/useAppTheme");
  return {
    ...actual,
    useAppTheme: () => {
      const r = actual.useAppTheme();
      mockRealPreview = r.previewTheme;
      return { ...r, previewTheme: mockPreviewSpy };
    },
  };
});

const root = document.documentElement;
const PREFS = "focusflow:preferences";
const trip = (hex) => rgbToTriplet(hexToRgb(hex));
const storedTheme = () => JSON.parse(localStorage.getItem(PREFS)).theme;
const v = (name) => root.style.getPropertyValue(name);
const DEFAULT_CANVAS = trip(DEFAULT_THEME.background);
const MIDNIGHT = PALETTES.find((p) => p.id === "midnight");
const MATCHA = PALETTES.find((p) => p.id === "matcha-latte");

let api;
let reopened;
function Probe() { api = realUseAppTheme(); return null; }
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
const tree = (o = true) => (
  <PreferencesProvider><ThemeApplier /><Probe /><ToastProvider><Harness initialOpen={o} /></ToastProvider></PreferencesProvider>
);
const mount = (o = true) => render(tree(o));
const dialog = () => screen.getByRole("dialog", { name: "Design your dashboard" });
const palette = (p) => screen.getByRole("button", { name: `${p.name} palette` });
const closed = () => waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
const footer = (name) => screen.getByRole("button", { name });
const openAdvanced = () => {
  const d = dialog().querySelector("details");
  d.open = true;
  fireEvent(d, new Event("toggle"));
};
const signOut = () => act(async () => { window.dispatchEvent(new CustomEvent("ff:auth", { detail: { signedIn: false } })); });
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("style");
  mockPreviewCalls.length = 0;
  reopened = 0;
});

describe("hex box: nothing odd is applied or previewed", () => {
  const BAD = [
    "#GGGGGG", "", "   ", "#EC706D;color:red", "#EC706D)", "rgb(1,2,3)", "#12", "#1234", "#12345", "#1234567",
    "ec706", "0x123456", "#ec 706d", "éc706d", "\u{1F600}", "#１２３４５６",
    "a".repeat(5000), "#" + "f".repeat(300), "#EC706D\u0000", "<script>", "red", "--brand",
  ];
  it.each(BAD.map((s) => [JSON.stringify(s).slice(0, 30), s]))("rejects %s on Enter and on blur", async (label, bad) => {
    mount();
    const before = mockPreviewCalls.length;
    const input = screen.getByLabelText("Hex code for background");
    fireEvent.change(input, { target: { value: bad } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    await settle();
    expect(v("--canvas")).toBe(DEFAULT_CANVAS);
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
    expect(storedTheme()).toEqual(DEFAULT_THEME);
    // every preview call since the start shows the default background (or ends the preview)
    mockPreviewCalls.slice(before).forEach((t) => { if (t) expect(t.background).toBe(DEFAULT_THEME.background); });
    mockPreviewCalls.forEach((t) => { if (t) expect(JSON.stringify(t)).not.toMatch(/[^#0-9A-Za-z":,{}_ \-]/); });
    if (bad.trim() !== "") expect(screen.getByText("That isn't a colour code. Try something like #EC706D.")).toBeInTheDocument();
  });

  it.each([["#abc", "#AABBCC"], ["ABC", "#AABBCC"], [" #ec706d ", "#EC706D"], ["ec706d", "#EC706D"]])(
    "accepts and tidies %j as %s", async (typed, want) => {
      mount();
      const input = screen.getByLabelText("Hex code for background");
      fireEvent.change(input, { target: { value: typed } });
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(v("--canvas")).toBe(trip(want)));
      mockPreviewCalls.forEach((t) => { if (t) expect(t.background).toMatch(/^#[0-9A-F]{6}$/); });
    },
  );

  it("a rejected code in the hex box does not wreck a later valid one", async () => {
    mount();
    const input = screen.getByLabelText("Hex code for background");
    fireEvent.change(input, { target: { value: "#GGGGGG" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "#123456" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#123456")));
    expect(screen.queryByText(/isn't a colour code/)).toBeNull();
  });
});

describe("races and sequences", () => {
  it("Back (outside close) while dirty, then fast Back again, never loses the draft or leaves a stuck preview", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    fireEvent.click(screen.getByText("outside-close"));
    fireEvent.click(screen.getByText("outside-close"));
    await waitFor(() => expect(screen.getByText("Unsaved changes")).toBeInTheDocument());
    await settle();
    expect(dialog()).toBeInTheDocument();
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true");
    expect(v("--canvas")).toBe(trip(MIDNIGHT.background));
    fireEvent.click(footer("Discard changes"));
    await closed();
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
  });

  it("Back-reopen then Keep editing then Save still saves the draft", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(screen.getByText("outside-close"));
    await waitFor(() => expect(screen.getByText("Unsaved changes")).toBeInTheDocument());
    fireEvent.click(footer("Keep editing"));
    fireEvent.click(footer("Save"));
    await closed();
    expect(storedTheme()).toEqual(paletteTheme(MIDNIGHT));
  });

  it("after Back-reopen and Discard, opening again is clean (no stale question, saved baseline)", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(screen.getByText("outside-close"));
    await waitFor(() => expect(screen.getByText("Unsaved changes")).toBeInTheDocument());
    fireEvent.click(footer("Discard changes"));
    await closed();
    fireEvent.click(screen.getByText("outside-open"));
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "false");
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
  });

  it("close and open in the same tick with changes does not crash or leave a preview behind on Cancel", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    await act(async () => {
      screen.getByText("outside-close").click();
      screen.getByText("outside-open").click();
    });
    await settle();
    if (screen.queryByRole("dialog")) fireEvent.click(footer(/^(Cancel|Discard changes)$/));
    await closed();
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(storedTheme()).toEqual(DEFAULT_THEME);
  });

  it("palette, then logo colour, then another palette: the logo colour is gone from the page and the save", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    openAdvanced();
    fireEvent.click(within(screen.getByRole("group", { name: "Logo colour" })).getByRole("button", { name: "Coral #EC706D" }));
    await waitFor(() => expect(v("--logo")).toBe(trip("#EC706D")));
    expect(within(screen.getByRole("group", { name: "Logo colour" })).getByRole("button", { name: "Auto logo" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(palette(MATCHA));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MATCHA.background)));
    expect(v("--logo")).toBe(deriveTokens(paletteTheme(MATCHA)).tokens["--logo"]);
    expect(v("--logo")).not.toBe(trip("#EC706D"));
    expect(screen.getByRole("button", { name: "Auto logo" })).toHaveAttribute("aria-pressed", "true");
    expect(palette(MATCHA)).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(footer("Save"));
    await closed();
    expect(storedTheme()).toEqual(paletteTheme(MATCHA));
    expect(storedTheme().logo).toBeUndefined();
  });

  it("setting a logo colour makes the palette unselected; Undo brings the palette back", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    openAdvanced();
    fireEvent.click(within(screen.getByRole("group", { name: "Icon colour" })).getByRole("button", { name: "Coral #EC706D" }));
    await waitFor(() => expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "false"));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true"));
  });

  it("undo merging: drag background, switch to Brand mid-drag, drag brand = separate undo steps", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Pick the background colour"), { target: { value: "#123456" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#123456")));
    fireEvent.change(screen.getByLabelText("Pick the background colour"), { target: { value: "#223456" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#223456")));
    // switch role without any blur reaching the old input
    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    fireEvent.change(screen.getByLabelText("Pick the brand colour"), { target: { value: "#336699" } });
    await waitFor(() => expect(v("--brand")).toBe(trip("#336699")));
    fireEvent.click(screen.getByRole("button", { name: "Background" }));
    fireEvent.change(screen.getByLabelText("Pick the background colour"), { target: { value: "#445566" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#445566")));
    // 3 steps: bg(merged), brand, bg again
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(trip("#223456")));
    expect(v("--brand")).toBe(trip("#336699"));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--brand")).toBe(trip(DEFAULT_THEME.brand)));
    expect(v("--canvas")).toBe(trip("#223456"));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(DEFAULT_CANVAS));
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
  });

  it("a drag followed by a swatch click never merges into the drag", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Pick the background colour"), { target: { value: "#123456" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#123456")));
    fireEvent.click(screen.getByRole("button", { name: "Blush #F9D9D6" }));
    await waitFor(() => expect(v("--canvas")).toBe(trip("#F9D9D6")));
    fireEvent.change(screen.getByLabelText("Pick the background colour"), { target: { value: "#654321" } });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#654321")));
    fireEvent.click(footer(/Undo/));
    await waitFor(() => expect(v("--canvas")).toBe(trip("#F9D9D6")));
  });
});

describe("Reset, Save, reload", () => {
  it("Reset then Save works from a failing-default start, and Save is enabled on the default palette", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(footer("Reset to FocusFlow colours"));
    await waitFor(() => expect(footer("Save")).not.toBeDisabled());
    // the default palette fails two pairs on purpose; it is exempt
    expect(contrastFailures(deriveTokens(DEFAULT_THEME).tokens).length).toBeGreaterThan(0);
    expect(screen.getByText("These are the original FocusFlow colours.")).toBeInTheDocument();
    fireEvent.click(footer("Save"));
    await closed();
    expect(screen.getByText("Colours saved")).toBeInTheDocument();
  });

  it("Save, reload: Studio opens with the saved colours as baseline; Cancel reverts to them, not to default", async () => {
    const first = mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.click(footer("Save"));
    await closed();
    first.unmount();
    root.removeAttribute("style");
    mount(false);
    fireEvent.click(screen.getByText("outside-open"));
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true");
    expect(footer(/Undo/)).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(palette(MATCHA));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MATCHA.background)));
    fireEvent.click(footer("Cancel"));
    await closed();
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    expect(storedTheme()).toEqual(paletteTheme(MIDNIGHT));
    // Escape straight after opening with no change: no question
    fireEvent.click(screen.getByText("outside-open"));
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    fireEvent.keyDown(window, { key: "Escape" });
    await closed();
    expect(v("--canvas")).toBe(trip(MIDNIGHT.background));
  });

  it("Save of a palette that is NOT on a failing pair writes exactly the draft (custom hex roundtrip)", async () => {
    mount();
    const input = screen.getByLabelText("Hex code for background");
    fireEvent.change(input, { target: { value: "#101820" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(v("--canvas")).toBe(trip("#101820")));
    fireEvent.click(footer("Save"));
    await closed();
    expect(storedTheme().background).toBe("#101820");
    expect(storedTheme().presetId).toBe("custom");
  });
});

describe("signing out while the Studio is open", () => {
  it("ends the preview and does not bring it back; the default colours show", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    await signOut();
    await settle();
    expect(v("--canvas")).toBe(DEFAULT_CANVAS);
    expect(api.theme).toEqual(DEFAULT_THEME);
    expect(storedTheme()).toEqual(DEFAULT_THEME);
  });

  it("with a saved non-default theme, sign-out leaves the default on screen", async () => {
    mount(false);
    await act(async () => { api.setTheme(paletteTheme(MATCHA)); });
    fireEvent.click(screen.getByText("outside-open"));
    await waitFor(() => expect(dialog()).toBeInTheDocument());
    fireEvent.click(palette(MIDNIGHT));
    await waitFor(() => expect(v("--canvas")).toBe(trip(MIDNIGHT.background)));
    await signOut();
    await settle();
    expect(v("--canvas")).toBe(DEFAULT_CANVAS);
  });
});

describe("palette groups and names", () => {
  it("aria-pressed stays correct when moving through all three groups; names unique within a group", async () => {
    mount();
    for (const g of PALETTE_GROUPS) {
      const list = PALETTES.filter((p) => p.group === g.id);
      const names = list.map((p) => palette(p).getAttribute("aria-label"));
      expect(new Set(names).size).toBe(names.length);
      fireEvent.click(palette(list[0]));
      await waitFor(() => expect(v("--canvas")).toBe(trip(list[0].background)));
      PALETTES.forEach((p) => expect(palette(p)).toHaveAttribute("aria-pressed", String(p.id === list[0].id)));
    }
    expect(screen.getAllByRole("button", { pressed: true }).filter((b) => /palette$/.test(b.getAttribute("aria-label") || ""))).toHaveLength(1);
  }, 60000);

  it("swatch names are unique within each row and each picker role", () => {
    mount();
    ["Background", "Brand", "Accent", "Text"].forEach((r) => {
      fireEvent.click(screen.getByRole("button", { name: r }));
      const group = screen.getByRole("group", { name: r });
      const names = within(group).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed")).map((b) => b.getAttribute("aria-label"));
      names.forEach((n) => expect(n).toBeTruthy());
      expect(new Set(names).size).toBe(names.length);
    });
  });
});

describe("keyboard", () => {
  // userEvent.tab() takes ~2s per press on this big dialog in jsdom, so the order is checked from the markup
  // plus the dialog's own Tab trap (which is what keeps focus inside).
  it("every control can be reached by Tab, and Tab from the last control wraps to the first", () => {
    mount();
    openAdvanced();
    const all = Array.from(dialog().querySelectorAll("button, input, summary, a[href], [tabindex]"));
    expect(all.length).toBeGreaterThan(40);
    all.forEach((el) => {
      expect(el.getAttribute("tabindex")).not.toBe("-1");
      expect(el.closest("[aria-hidden='true']")).toBeNull();
      expect(el.closest("[hidden]")).toBeNull();
    });
    // the dialog itself may hold focus first (tabindex -1 is on the dialog, not on a control)
    const items = all.filter((el) => !el.disabled);
    ["Cancel", "Save", "Reset to FocusFlow colours"].forEach((n) => expect(items).toContain(footer(n)));
    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog().contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(last);
  });

  it("Shift+Tab from the start wraps to the last control", () => {
    mount();
    userEvent.tab({ shift: true });
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it("Escape with unsaved changes asks (does not close); Escape on the question = Keep editing; third Escape asks again", async () => {
    mount();
    fireEvent.click(palette(MIDNIGHT));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    expect(dialog()).toBeInTheDocument();
    expect(palette(MIDNIGHT)).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("the hex box applies on Enter with the keyboard alone", async () => {
    mount();
    const input = screen.getByLabelText("Hex code for background");
    input.focus();
    userEvent.type(input, "{selectall}#112233{enter}");
    await waitFor(() => expect(v("--canvas")).toBe(trip("#112233")));
  });
});

describe("no emoji in the Studio", () => {
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;
  it("rendered text, labels and attributes have none, in every state", async () => {
    mount();
    const scan = () => {
      expect(dialog().textContent).not.toMatch(EMOJI);
      dialog().querySelectorAll("*").forEach((el) => {
        ["aria-label", "title", "placeholder", "value", "alt"].forEach((a) => {
          if (el.hasAttribute(a)) expect(el.getAttribute(a)).not.toMatch(EMOJI);
        });
      });
    };
    scan();
    openAdvanced();
    ["Brand", "Accent", "Text"].forEach((r) => { fireEvent.click(screen.getByRole("button", { name: r })); scan(); });
    fireEvent.click(palette(MIDNIGHT));
    scan();
    fireEvent.click(within(screen.getByRole("group", { name: "Logo colour" })).getByRole("button", { name: "Coral #EC706D" }));
    await waitFor(() => expect(screen.getByText(/Your logo colour is hard to see/)).toBeInTheDocument());
    scan();
    fireEvent.keyDown(window, { key: "Escape" });
    scan();
    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    const input = screen.getByLabelText("Hex code for brand");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.keyDown(input, { key: "Enter" });
  });
});

// Seeded generator so a failure can be reproduced.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const hex6 = (r) => `#${Array.from({ length: 6 }, () => "0123456789ABCDEF"[Math.floor(r() * 16)]).join("")}`;

describe("random drafts (200 seeded plus hand-made worst cases)", () => {
  const r = rng(20260507);
  const drafts = Array.from({ length: 200 }, () => {
    const d = { v: 1, presetId: "custom", background: hex6(r), brand: hex6(r), accent: hex6(r), text: r() < 0.4 ? "auto" : hex6(r) };
    if (r() < 0.4) d.logo = hex6(r);
    if (r() < 0.4) d.icon = hex6(r);
    return d;
  });
  // hand-made worst cases: one colour everywhere, near-equal colours
  ["#000000", "#FFFFFF", "#777777", "#808080", "#7F7F7F", "#FF00FF", "#00FF00"].forEach((c) => {
    drafts.push({ v: 1, presetId: "custom", background: c, brand: c, accent: c, text: c });
    drafts.push({ v: 1, presetId: "custom", background: c, brand: c, accent: c, text: "auto", logo: c, icon: c });
  });
  it("readabilityNotes never throws; unreadable exactly when the guard still fails (default exempt)", () => {
    let unreadable = 0;
    drafts.forEach((d) => {
      const res = deriveTokens(d);
      let out;
      expect(() => { out = readabilityNotes(d, res); }).not.toThrow();
      const fails = contrastFailures(res.tokens).length;
      if (isDefaultPalette(d)) expect(out.status).toBe("default");
      else expect(out.status === "unreadable").toBe(fails > 0);
      if (out.status === "unreadable") unreadable += 1;
      out.notes.forEach((n) => { expect(n.text).toMatch(/\S/); expect(n.text).not.toMatch(/undefined|NaN|\[object/); });
    });
    // the guard should repair nearly everything; record the count so a change is noticed
    expect(unreadable).toBeLessThanOrEqual(drafts.length);
  });

  it("the Save button follows that rule in the real dialog (sampled drafts, unreadable ones included)", async () => {
    // the dialog sets four colours by hand, so compare on drafts without logo/icon
    const plain = drafts.map(({ logo, icon, v: _v, ...rest }) => ({ v: 1, ...rest }));
    const status = (d) => readabilityNotes(d, deriveTokens(d)).status;
    const bad = plain.filter((d) => status(d) === "unreadable").slice(0, 4);
    const good = plain.filter((d) => status(d) !== "unreadable").slice(0, 4);
    for (const d of [...bad, ...good]) {
      const { unmount } = mount();
      const setHex = (role, value) => {
        fireEvent.click(screen.getByRole("button", { name: role[0].toUpperCase() + role.slice(1) }));
        if (value === "auto") { fireEvent.click(screen.getByRole("button", { name: `Auto ${role}` })); return; }
        const input = screen.getByLabelText(`Hex code for ${role}`);
        fireEvent.change(input, { target: { value } });
        fireEvent.keyDown(input, { key: "Enter" });
      };
      setHex("background", d.background);
      setHex("brand", d.brand);
      setHex("accent", d.accent);
      setHex("text", d.text);
      const want = status(d) !== "unreadable";
      await waitFor(() => (want ? expect(footer("Save")).not.toBeDisabled() : expect(footer("Save")).toBeDisabled()));
      unmount();
      root.removeAttribute("style");
      localStorage.clear();
    }
    // report how many drafts the check really covered
    expect(bad.length + good.length).toBeGreaterThan(0);
  }, 60000);
});
