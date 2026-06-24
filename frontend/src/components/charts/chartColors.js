// Shared chart colour helpers — derive concrete hex/rgba from the active palette
// so recharts (which can't resolve CSS vars in SVG fills) stays theme-aware.

const SCHEME_HEX = {
  indigo: "#2D4759",
  wisteria: "#8A6ED6",
  purple: "#6c5ce7",
  forest: "#2EA06E",
  coral: "#E05A5A",
};

export function chartColors(palette = {}) {
  return {
    brand: palette?.custom?.brand || SCHEME_HEX[palette?.scheme] || "#2D4759",
    accent: palette?.custom?.accent || "#D6C6F7",
  };
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
