import React from "react";
import { render, act } from "@testing-library/react";
import { PreferencesProvider } from "./PreferencesProvider";
import { useAppTheme } from "./useAppTheme";
import { useActiveTheme } from "./useActiveTheme";
import { DEFAULT_THEME } from "../design/theme/theme";

jest.mock("../services/api", () => ({
  AUTH_EVENT: "ff:auth",
  getToken: () => null,
  prefsAPI: { get: jest.fn(), save: jest.fn() },
}));

const BLACK = { ...DEFAULT_THEME, presetId: "black", background: "#000000" };

let active;
let app;
function Probe() {
  active = useActiveTheme();
  return null;
}
function Controls() {
  app = useAppTheme();
  return null;
}

beforeEach(() => localStorage.clear());

describe("useActiveTheme", () => {
  it("is null outside the provider", () => {
    render(<Probe />);
    expect(active).toBeNull();
  });

  it("gives the saved theme, then the preview while one is set", () => {
    render(
      <PreferencesProvider>
        <Probe />
        <Controls />
      </PreferencesProvider>
    );
    expect(active).toEqual(DEFAULT_THEME);
    act(() => { app.previewTheme({ ...BLACK, background: "#000000" }); });
    expect(active).toEqual(BLACK);
    act(() => { app.previewTheme(null); });
    expect(active).toEqual(DEFAULT_THEME);
  });

  it("keeps the same object while nothing changes", () => {
    const seen = [];
    function Collect() {
      seen.push(useActiveTheme());
      return null;
    }
    const { rerender } = render(<PreferencesProvider><Collect /></PreferencesProvider>);
    rerender(<PreferencesProvider><Collect /></PreferencesProvider>);
    expect(seen[seen.length - 1]).toBe(seen[0]);
  });
});

describe("useActiveTheme outside the provider", () => {
  it("gives the colours this browser remembers", () => {
    const PURPLE = { ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" };
    localStorage.setItem("focusflow:theme.device", JSON.stringify(PURPLE));
    render(<Probe />);
    expect(active).toEqual(PURPLE);
  });
});
