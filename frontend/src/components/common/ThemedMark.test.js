import React from "react";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import ThemedMark from "./ThemedMark";
import { LoadingSpinner } from "./LoadingSpinner";
import Logo from "../layout/Logo";
import Navbar from "../layout/Navbar";
import { PreferencesContext } from "../../preferences/PreferencesProvider";
import { DEFAULT_THEME } from "../../design/theme/theme";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("../auth/UserContext", () => ({ useUser: () => ({ userName: "Sam Lee", logout: jest.fn() }) }));
jest.mock("../context/AppContext", () => ({ useApp: () => ({ pendingCount: 0, routineTodayDone: 0, routineTodayTotal: 0 }) }));
jest.mock("../ui/LogoutButton", () => ({ LogoutButton: () => null }));
jest.mock("../ui/MascotPicker", () => ({ MascotPicker: () => null }));

const withTheme = (theme, ui, preview = null) => (
  <PreferencesContext.Provider value={{ theme, themePreview: preview, profile: {}, updateProfile: jest.fn() }}>
    {ui}
  </PreferencesContext.Provider>
);
// jsdom throws away inline colours like rgb(var(--x)) and mask-image, so the style checks read the markup React writes.
const markup = (ui) => renderToStaticMarkup(ui);
const MARK = "/logo/focusflow-mark.png";
const BLUE = { ...DEFAULT_THEME, presetId: "custom", brand: "#2546F0" };

describe("ThemedMark", () => {
  it("with no fill renders the plain image with the same src, alt and class", () => {
    const { container } = render(<ThemedMark src={MARK} alt="FocusFlow" className="w-4 h-4" width="85" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", MARK);
    expect(img).toHaveAttribute("alt", "FocusFlow");
    expect(img).toHaveClass("w-4", "h-4");
    expect(img).toHaveAttribute("width", "85");
  });

  it("with a fill renders a masked span named FocusFlow", () => {
    const { container } = render(<ThemedMark src={MARK} fill="rgb(var(--logo))" alt="FocusFlow" width="85" />);
    expect(container.querySelector("img")).toBeNull();
    const span = screen.getByRole("img", { name: "FocusFlow" });
    expect(span.tagName).toBe("SPAN");
    expect(span).not.toHaveAttribute("width");
    const html = markup(<ThemedMark src={MARK} fill="rgb(var(--logo))" alt="FocusFlow" />);
    expect(html).toContain("background-color:rgb(var(--logo))");
    expect(html).toContain(`mask-image:url(${MARK})`);
    expect(html).toContain("-webkit-mask-image:url(");
    expect(html).toContain("mask-size:contain");
    expect(html).toContain("mask-repeat:no-repeat");
    expect(html).toContain("mask-position:center");
  });

  it("without alt the mask is hidden from screen readers", () => {
    const { container } = render(<ThemedMark src={MARK} fill="red" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstChild).not.toHaveAttribute("role");
  });
});

describe("Logo", () => {
  it("shows the original PNG on the default theme", () => {
    const { container } = render(withTheme(DEFAULT_THEME, <Logo />));
    const img = container.querySelector(`img[src="${MARK}"]`);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "FocusFlow");
    expect(img).toHaveAttribute("width", "85");
  });

  it("shows the PNG for a theme with a different brand but no logo colour", () => {
    const { container } = render(withTheme(BLUE, <Logo />));
    expect(container.querySelector(`img[src="${MARK}"]`)).toBeInTheDocument();
  });

  it("shows the PNG outside the provider", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector(`img[src="${MARK}"]`)).toBeInTheDocument();
  });

  it("paints the mark when a logo colour is set (including in a preview)", () => {
    const { container } = render(withTheme(DEFAULT_THEME, <Logo />, { ...BLUE, logo: "#112233" }));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "FocusFlow" })).toBeInTheDocument();
    expect(markup(withTheme(DEFAULT_THEME, <Logo />, { ...BLUE, logo: "#112233" }))).toContain("background-color:rgb(var(--logo))");
  });
});

describe("Navbar logo", () => {
  it("shows the original PNG on the default theme", () => {
    const { container } = render(withTheme(DEFAULT_THEME, <Navbar />));
    const img = container.querySelector(`img[src="${MARK}"]`);
    expect(img).toBeInTheDocument();
    expect(img).toHaveClass("w-12", "h-12", "-my-1", "object-contain", "shrink-0");
  });

  it("paints the mark when a logo colour is set", () => {
    const { container } = render(withTheme({ ...DEFAULT_THEME, logo: "#112233" }, <Navbar />));
    expect(container.querySelector(`img[src="${MARK}"]`)).toBeNull();
    expect(screen.getByRole("button", { name: "FocusFlow home" }).querySelector("span[aria-hidden='true']")).toBeInTheDocument();
  });
});

describe("LoadingSpinner marks", () => {
  const TOP = "/logo/mark-top-coral.png";
  const BOTTOM = "/logo/mark-bottom-coral.png";

  it("keeps the two coral PNGs on the default brand", () => {
    const { container } = render(withTheme(DEFAULT_THEME, <LoadingSpinner />));
    expect(container.querySelector(`img.ff-loader-line.ff-loader-top[src="${TOP}"]`)).toBeInTheDocument();
    expect(container.querySelector(`img.ff-loader-line.ff-loader-bottom[src="${BOTTOM}"]`)).toBeInTheDocument();
    expect(container.querySelectorAll(".ff-loader-logo img")).toHaveLength(2);
  });

  it("keeps the PNGs outside the provider", () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelectorAll(".ff-loader-logo img")).toHaveLength(2);
  });

  it("paints both lines in the brand colour on another brand, inside the wipe wrappers", () => {
    const { container } = render(withTheme(BLUE, <LoadingSpinner />));
    expect(container.querySelectorAll(".ff-loader-logo img")).toHaveLength(0);
    const top = container.querySelector(".ff-loader-line.ff-loader-top");
    const bottom = container.querySelector(".ff-loader-line.ff-loader-bottom");
    [top, bottom].forEach((wrap) => {
      expect(wrap.tagName).toBe("SPAN");
      expect(wrap.firstChild.tagName).toBe("SPAN");
      expect(wrap.firstChild).toHaveAttribute("aria-hidden", "true");
    });
    const html = markup(withTheme(BLUE, <LoadingSpinner />));
    expect(html.match(/background-color:rgb\(var\(--brand\)\)/g)).toHaveLength(2);
    expect(html).toContain(`mask-image:url(${TOP})`);
    expect(html).toContain(`mask-image:url(${BOTTOM})`);
  });

  it("follows a brand preview", () => {
    const { container } = render(withTheme(DEFAULT_THEME, <LoadingSpinner />, BLUE));
    expect(container.querySelectorAll(".ff-loader-logo img")).toHaveLength(0);
  });
});
