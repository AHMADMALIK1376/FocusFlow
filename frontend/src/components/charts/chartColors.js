// Shared chart colour helpers. Recharts/SVG and the `${hex}66` trick need hex, so the
// brand and accent are read from the theme applied on <html> (tokenHex), with today's
// colours as the fallback. Sunshine is fixed.
import { useMemo } from "react";
import { tokenHex } from "../../design/theme/applyTheme";
import { useActiveTheme } from "../../preferences/useActiveTheme";

export function chartColors() {
  return { brand: tokenHex("--brand", "#EC706D"), accent: "#FFD700", sage: tokenHex("--sage", "#B8DCC4") };
}

// Same values as chartColors(), but re-renders when the theme or a preview changes.
// --brand and --sage are the theme's own brand/accent (the guard never moves them).
export function useChartColors() {
  const t = useActiveTheme();
  return useMemo(
    () => (t ? { brand: t.brand, accent: "#FFD700", sage: t.accent } : chartColors()),
    [t]
  );
}

export function hexToRgba(hex, a = 1) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const CHART_TOOLTIP = {
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 12,
  fontWeight: 600,
  boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
  padding: "8px 12px",
};
