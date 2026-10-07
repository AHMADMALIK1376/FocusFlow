import React from "react";
import { render } from "@testing-library/react";
import { useThemedLottie } from "./useThemedLottie";
import { PreferencesContext } from "./PreferencesProvider";
import { DEFAULT_THEME } from "../design/theme/theme";

const data = { layers: [{ shapes: [{ it: [{ ty: "fl", c: { a: 0, k: [0.27, 0.17, 1, 1] } }] }] }] };
let got;
const Probe = () => { got = useThemedLottie(data); return null; };
const inProvider = (theme) => render(
  <PreferencesContext.Provider value={{ theme, shownTheme: theme, themePreview: null }}><Probe /></PreferencesContext.Provider>
);

beforeEach(() => localStorage.clear());

test("the normal colours (or no provider) give the original animation", () => {
  render(<Probe />);
  expect(got).toBe(data);
  inProvider(DEFAULT_THEME);
  expect(got).toBe(data);
});

test("another brand gives a recoloured copy", () => {
  inProvider({ ...DEFAULT_THEME, presetId: "b", brand: "#2546F0" });
  expect(got).not.toBe(data);
  expect(got.layers[0].shapes[0].it[0].c.k).not.toEqual([0.27, 0.17, 1, 1]);
});
