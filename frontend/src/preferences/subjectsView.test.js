import React from "react";
import { render, act } from "@testing-library/react";
import { PreferencesProvider } from "./PreferencesProvider";
import { useSubjectsView } from "./useSubjectsView";
import { migratePreferences, sanitizeSubjectsView, DEFAULT_SUBJECTS_VIEW, SCHEMA_VERSION } from "./migrate";

// No network: the sync hook sees a signed-out student.
jest.mock("../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => null,
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

const PREFS = "focusflow:preferences";
const stored = () => JSON.parse(localStorage.getItem(PREFS));

describe("the subjectsView preference in migratePreferences", () => {
  it("defaults to the cube for new, v1, v2 and v3 documents, and keeps everything else", () => {
    expect(DEFAULT_SUBJECTS_VIEW).toBe("cube");
    expect(migratePreferences(null).subjectsView).toBe("cube");
    expect(migratePreferences({ profile: { displayName: "Old" } }).subjectsView).toBe("cube");
    const { subjectsView, ...v3 } = migratePreferences(null);
    expect(migratePreferences(v3).subjectsView).toBe("cube");
    const v2 = { ...v3, schemaVersion: 2, profile: { ...v3.profile, displayName: "Sara" } };
    const r = migratePreferences(v2);
    expect(r.subjectsView).toBe("cube");
    expect(r.profile.displayName).toBe("Sara");
    expect(r.dashboards).toEqual(v3.dashboards);
  });
  it("keeps a valid choice and falls back to the cube for anything else", () => {
    expect(migratePreferences({ ...migratePreferences(null), subjectsView: "table" }).subjectsView).toBe("table");
    expect(migratePreferences({ ...migratePreferences(null), subjectsView: "cube" }).subjectsView).toBe("cube");
    for (const bad of ["grid", "", 3, null, {}, ["table"]]) {
      expect(migratePreferences({ ...migratePreferences(null), subjectsView: bad }).subjectsView).toBe("cube");
    }
    expect([sanitizeSubjectsView("table"), sanitizeSubjectsView(undefined), sanitizeSubjectsView("TABLE")]).toEqual(["table", "cube", "cube"]);
  });
  it("is idempotent and does not change the schema version, so a device not yet updated still reads the document", () => {
    expect(SCHEMA_VERSION).toBe(3);
    const once = migratePreferences({ ...migratePreferences(null), subjectsView: "table" });
    expect(migratePreferences(once)).toEqual(once);
    expect(once.schemaVersion).toBe(3);
  });
});

describe("useSubjectsView with the provider", () => {
  let api;
  function Probe() { api = useSubjectsView(); return null; }
  const mount = () => render(<PreferencesProvider><Probe /></PreferencesProvider>);
  beforeEach(() => localStorage.clear());

  it("starts on the cube", () => {
    mount();
    expect(api[0]).toBe("cube");
  });
  it("saves the choice with the preferences and reads it back after a reload", () => {
    const first = mount();
    act(() => api[1]("table"));
    expect(api[0]).toBe("table");
    expect(stored().subjectsView).toBe("table");
    first.unmount();
    mount();
    expect(api[0]).toBe("table");
  });
  it("ignores a value that is not a view", () => {
    mount();
    act(() => api[1]("table"));
    act(() => api[1]("nonsense"));
    expect(api[0]).toBe("cube");
  });
  it("reads an old saved document (no choice) as the cube", () => {
    const { subjectsView, ...old } = migratePreferences(null);
    localStorage.setItem(PREFS, JSON.stringify(old));
    mount();
    expect(api[0]).toBe("cube");
  });
});

describe("useSubjectsView without a provider", () => {
  it("still works for the life of the page", () => {
    let api;
    function Probe() { api = useSubjectsView(); return null; }
    render(<Probe />);
    expect(api[0]).toBe("cube");
    act(() => api[1]("table"));
    expect(api[0]).toBe("table");
  });
});
