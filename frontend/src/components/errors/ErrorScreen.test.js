import React from "react";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorScreen from "./ErrorScreen";
import { PreferencesContext } from "../../preferences/PreferencesProvider";
import { DEFAULT_THEME } from "../../design/theme/theme";

const BLUE = { ...DEFAULT_THEME, presetId: "custom", brand: "#2546F0" };

beforeEach(() => localStorage.clear());

const screenOf = () => <ErrorScreen code="404" title="Not here" message="Nothing to see" />;

test("with the normal colours the top of the page shows the app icon", () => {
  const { container } = render(screenOf());
  expect(container.querySelector('img[src="/logo192.png"]')).not.toBeNull();
  expect(container.querySelector('span.place-items-center')).toBeNull();
});

test("outside the provider, a remembered colour theme turns the icon into a brand-coloured tile with the FocusFlow mark", () => {
  localStorage.setItem("focusflow:theme.device", JSON.stringify(BLUE));
  const { container } = render(screenOf());
  expect(container.querySelector('img[src="/logo192.png"]')).toBeNull();
  const tile = container.querySelector("span.place-items-center");
  expect(tile).not.toBeNull();
  expect(tile).toHaveAttribute("aria-hidden", "true");
  expect(tile.querySelector('img[src="/logo/focusflow-mark.png"]')).not.toBeNull();
});

test("a custom logo colour paints the mark with the logo token (checked in the markup, jsdom drops masks)", () => {
  const html = renderToStaticMarkup(
    <PreferencesContext.Provider value={{ theme: BLUE, shownTheme: { ...BLUE, logo: "#FFFFFF" }, themePreview: null }}>
      {screenOf()}
    </PreferencesContext.Provider>
  );
  expect(html).toContain("background-color:rgb(var(--logo))");
  expect(html).toContain("mask-image:url(/logo/focusflow-mark.png)");
  expect(html).not.toContain("logo192.png");
});

test("a theme with the normal brand colour keeps the app icon", () => {
  const html = renderToStaticMarkup(
    <PreferencesContext.Provider value={{ theme: DEFAULT_THEME, shownTheme: { ...DEFAULT_THEME, presetId: "mine", accent: "#112233" }, themePreview: null }}>
      {screenOf()}
    </PreferencesContext.Provider>
  );
  expect(html).toContain("/logo192.png");
});
