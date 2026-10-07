import { chartColors } from "./chartColors";
import { applyTheme } from "../../design/theme/applyTheme";
import { deriveTokens } from "../../design/theme/deriveTokens";
import { DEFAULT_THEME } from "../../design/theme/theme";

beforeEach(() => document.documentElement.removeAttribute("style"));

describe("chartColors", () => {
  it("falls back to today's colours when no theme is applied", () => {
    expect(chartColors()).toEqual({ brand: "#EC706D", accent: "#FFD700", sage: "#B8DCC4" });
  });

  it("follows the applied theme (sunshine stays fixed)", () => {
    applyTheme(deriveTokens({ ...DEFAULT_THEME, presetId: "purple", background: "#1A0B3D", brand: "#FF6B6B", accent: "#4ECDC4" }));
    expect(chartColors()).toEqual({ brand: "#FF6B6B", accent: "#FFD700", sage: "#4ECDC4" });
  });
});
