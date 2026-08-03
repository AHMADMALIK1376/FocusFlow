// Shared chart colour helpers — concrete hex/rgba for the fixed brand palette
// (recharts/SVG fills can't resolve CSS custom properties), matching
// design/tokens.css's --brand / --brand-soft.

const BRAND_HEX = "#6F3FE0";
const ACCENT_HEX = "#E070BF";

export function chartColors() {
  return { brand: BRAND_HEX, accent: ACCENT_HEX };
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
