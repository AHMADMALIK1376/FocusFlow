import fs from "fs";
import path from "path";
import { subjectPalette } from "./SubjectTable";
import { contrastRatio } from "../../design/theme/color";

const rgbOf = (css) => css.match(/\d+/g).map(Number);

// The subject card is a light tint of the subject's colour, so its text must stay dark whatever the
// student's theme is (theme ink is light on a dark theme and was unreadable on the card).
describe("subject card colours", () => {
  const colours = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#FFD700", "#FFFFFF", "#000000", "#E86562", "#22c55e", "#7c3aed", "#cbd5e1", "#ff3b3b"];
  it.each(colours)("%s: the card text colour is at least 7:1 on the card and on the number tile", (hex) => {
    const p = subjectPalette(hex);
    expect(contrastRatio(rgbOf(p.ink), rgbOf(p.cardBg))).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(rgbOf(p.ink), rgbOf(p.tile))).toBeGreaterThanOrEqual(7);
  });

  it("the tinted card does not use the theme's ink or muted classes for its text", () => {
    const src = fs.readFileSync(path.join(__dirname, "SubjectTable.js"), "utf8");
    const from = src.indexOf('key="featured"');
    const featured = src.slice(from, src.indexOf('title="Delete subject"', from));
    expect(featured.match(/text-ink\/|text-muted|text-ink "/g) || []).toEqual([]);
  });
});
