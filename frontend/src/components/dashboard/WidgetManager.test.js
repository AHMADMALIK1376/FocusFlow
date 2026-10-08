// The feature list is named by what people see, never by internal ids.
import React from "react";
import { render, screen } from "@testing-library/react";
import WidgetManager from "./WidgetManager";
import { WIDGETS } from "../../dashboard/registry";
import { PreferencesContext } from "../../preferences/PreferencesProvider";

function setup() {
  const enabled = {};
  WIDGETS.forEach((w) => { enabled[w.id] = true; });
  const dash = { id: "d1", name: "Main", widgets: { order: WIDGETS.map((w) => w.id), enabled } };
  render(
    <PreferencesContext.Provider value={{
      activeDashboard: dash, toggleWidget: jest.fn(), reorderWidgets: jest.fn(),
    }}>
      <WidgetManager />
    </PreferencesContext.Provider>
  );
}

test("switches and drag handles carry the feature's visible title, not its id", () => {
  setup();
  const switches = screen.getAllByRole("switch");
  expect(switches).toHaveLength(WIDGETS.length);
  const names = switches.map((s) => s.getAttribute("aria-label") || s.textContent);
  expect(names.some((n) => /toggle/i.test(n))).toBe(false);
  expect(new Set(names).size).toBe(names.length);
  const handles = screen.getAllByRole("button", { name: /^Reorder / });
  expect(handles).toHaveLength(WIDGETS.length);
  expect(new Set(handles.map((h) => h.getAttribute("aria-label"))).size).toBe(handles.length);
  names.forEach((n) => expect(screen.getByRole("button", { name: `Reorder ${n}` })).toBeInTheDocument());
});

test("the drag handle shows a focus ring", () => {
  setup();
  expect(screen.getAllByRole("button", { name: /^Reorder / })[0]).toHaveClass("focus-visible:ring-2");
});
