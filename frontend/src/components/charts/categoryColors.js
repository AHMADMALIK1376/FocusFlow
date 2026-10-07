// Colours for charts that tell categories apart (budget pucks, home cubes). This is identity, not
// meaning, so the colours are data. On the normal colours they are the long-standing six. On a custom theme
// the first follows the student's Brand, the second their Accent, and the rest are picked from a fixed
// list so that no two categories look alike (categoryColors.test.js checks every ready-made palette).
import { useMemo } from "react";
import { useActiveTheme } from "../../preferences/useActiveTheme";
import { sanitizeTheme, isDefaultPalette } from "../../design/theme/theme";
import { hexToRgb, deltaE } from "../../design/theme/color";

export const DEFAULT_SERIES = ["#EC706D", "#F5C842", "#8FCDA6", "#F4A98A", "#9EC3EA", "#D7B98E"]; // today's SPEND_COLORS
const EXTRAS = ["#F5C842", "#F4A98A", "#9EC3EA", "#D7B98E"];            // sun, peach, powder, mocha
const RESERVE = ["#B3A4E6", "#7CC7C0", "#E9A3C9", "#B9C97E", "#8FB3F0", "#E8B66A"]; // lilac, teal, pink, olive, cornflower, apricot
// 0.05 because today's own six are as close as 0.056 apart (peach and sun); a stricter limit would hold new themes to more than the original.
export const MIN_SERIES_DE = 0.05;
const COUNT = 6;

const distance = (a, b) => deltaE(hexToRgb(a), hexToRgb(b));
const nearest = (hex, list) => Math.min(...list.map((o) => distance(hex, o)));

export function categoryColors(theme) {
  const t = sanitizeTheme(theme);
  if (!t || isDefaultPalette(t)) return DEFAULT_SERIES;
  const candidates = [t.accent, ...EXTRAS, ...RESERVE];
  const out = [t.brand];
  for (const c of candidates) {
    if (out.length >= COUNT) break;
    if (nearest(c, out) >= MIN_SERIES_DE) out.push(c);
  }
  // Still short (a very crowded theme): take the unused colours that stand furthest from what is already there.
  while (out.length < COUNT) {
    const unused = candidates.filter((c) => !out.includes(c));
    let best = unused[0];
    unused.forEach((c) => { if (nearest(c, out) > nearest(best, out)) best = c; });
    out.push(best);
  }
  return out;
}

export function useCategoryColors() {
  const theme = useActiveTheme();
  return useMemo(() => categoryColors(theme), [theme]);
}
