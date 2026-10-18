// A subject's own colour, as a light clay tint (card), a deeper shade (text) and a mid tone.
function hexToRgb(hex) {
  const h = String(hex || "#E86562").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16) || 0xe86562;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixWhite = (rgb, t) => rgb.map((c) => Math.round(c + (255 - c) * t));
const mixBlack = (rgb, t) => rgb.map((c) => Math.round(c * (1 - t)));
const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
export function subjectPalette(hex) {
  const rgb = hexToRgb(hex);
  // ink and tile are for text and the number tile on the light card: they stay dark and light whatever the theme, so the card reads on dark themes too.
  return { cardBg: css(mixWhite(rgb, 0.86)), badgeBg: css(mixWhite(rgb, 0.7)), deep: css(mixBlack(rgb, 0.25)), mid: css(rgb), ink: css(mixBlack(rgb, 0.78)), tile: css(mixWhite(rgb, 0.94)) };
}
