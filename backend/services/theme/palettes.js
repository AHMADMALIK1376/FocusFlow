// GENERATED from frontend/src/design/theme/palettes.js by backend/scripts/sync-theme-engine.js.
// Do not edit. Edit the frontend file, then run: node scripts/sync-theme-engine.js
// Ready-made palettes and swatches for the Design Studio. Pure data. The hex values are
// data (like subject colours), shown with inline styles, never used as app colours.
// Every palette passes the readability guard with its own four colours untouched
// (palettes.test.js checks this), so what the student picks is what the app shows.

const PALETTE_GROUPS = [
  { id: 'soft', name: 'Soft', blurb: 'Calm, light and gentle.' },
  { id: 'bold', name: 'Bold', blurb: 'Bright colours with energy.' },
  { id: 'dark', name: 'Dark', blurb: 'Easy on the eyes at night.' },
];

const p = (id, name, group, background, brand, accent, text) => Object.freeze({ id, name, group, background, brand, accent, text });

const PALETTES = Object.freeze([
  p('matcha-latte', 'Matcha Latte', 'soft', '#F3F1E7', '#4F7A4A', '#CFE3C1', '#2B2A26'),
  p('peach-fuzz', 'Peach Fuzz', 'soft', '#FBF1EA', '#B5523B', '#F6CDB8', '#3A2A24'),
  p('lavender-haze', 'Lavender Haze', 'soft', '#F4F1FA', '#6D5BA8', '#D9CFF2', '#2C2640'),
  p('sky-notes', 'Sky Notes', 'soft', '#EEF4FA', '#2F6C9E', '#BFDDF2', '#1F2A36'),
  p('butter-toast', 'Butter Toast', 'soft', '#FBF6E6', '#9A6B12', '#F3DE9C', '#33291A'),
  p('rose-water', 'Rose Water', 'soft', '#FBF0F2', '#B04A6A', '#F4C9D6', '#3A2330'),
  p('mint-chip', 'Mint Chip', 'soft', '#EFF7F3', '#2E7D6B', '#BFE6D8', '#1F302B'),
  p('cloud-grey', 'Cloud Grey', 'soft', '#F2F2F4', '#4A4E69', '#D3D6E4', '#26272E'),
  p('electric-blue', 'Electric Blue', 'bold', '#F2F5FF', '#2546F0', '#9EE6FF', '#141A33'),
  p('hot-pink', 'Hot Pink', 'bold', '#FFF3F8', '#D6246E', '#FFC2DD', '#2E1220'),
  p('tangerine', 'Tangerine', 'bold', '#FFF5EB', '#C2410C', '#FFD3A8', '#2D1A0E'),
  p('lime-pop', 'Lime Pop', 'bold', '#F7FBEA', '#3F7D0F', '#D4F28A', '#1D2610'),
  p('grape-soda', 'Grape Soda', 'bold', '#F6F0FF', '#7B2FF7', '#E0C8FF', '#24133D'),
  p('cherry-cola', 'Cherry Cola', 'bold', '#FFF1EF', '#C8102E', '#FFC9C2', '#2B0F12'),
  p('teal-wave', 'Teal Wave', 'bold', '#EAF8F7', '#00807A', '#9FE7DF', '#0F2A28'),
  p('sunset-drive', 'Sunset Drive', 'bold', '#FFF4E8', '#D6336C', '#FFD08A', '#2E1A14'),
  p('midnight', 'Midnight', 'dark', '#10141F', '#7C9CFF', '#8FD3B6', '#E9ECF5'),
  p('charcoal-coral', 'Charcoal Coral', 'dark', '#1A1716', '#F07A6E', '#9CCFB0', '#F4EEE9'),
  p('deep-forest', 'Deep Forest', 'dark', '#0F1A14', '#5FBF7F', '#B7E4A8', '#E6F2EA'),
  p('night-lavender', 'Night Lavender', 'dark', '#17131F', '#A78BFA', '#F0B8D8', '#F1ECF9'),
  p('ocean-night', 'Ocean Night', 'dark', '#0B1B26', '#38B2D9', '#9BE3D0', '#E3F2F7'),
  p('espresso', 'Espresso', 'dark', '#1C1512', '#D9A066', '#E8C9A0', '#F6EDE3'),
  p('neon-arcade', 'Neon Arcade', 'dark', '#0E0E14', '#FF4FA3', '#5CF2C4', '#F2F2F7'),
  p('slate-gold', 'Slate Gold', 'dark', '#1B1F24', '#E0B44C', '#9EB7D6', '#F3F6F8'),
]);

const s = (name, hex) => Object.freeze({ name, hex });

// Three rows for Background, Brand and Accent. Sage, Coral and Cream are the default's colours.
const SWATCHES = Object.freeze({
  soft: Object.freeze([
    s('Cream', '#F5EFE6'), s('Blush', '#F9D9D6'), s('Peach', '#FBDCC4'), s('Butter', '#F8EBB0'),
    s('Sage', '#B8DCC4'), s('Sky', '#CFE3F5'), s('Lilac', '#E1D7F3'), s('Cloud', '#E6E7EB'),
  ]),
  bold: Object.freeze([
    s('Coral', '#EC706D'), s('Tomato', '#E0453A'), s('Tangerine', '#F07C16'), s('Sunflower', '#F2B705'),
    s('Leaf', '#2E9E5B'), s('Ocean', '#1F7AE0'), s('Violet', '#7B3FE4'), s('Magenta', '#D6247A'),
  ]),
  dark: Object.freeze([
    s('Ink', '#1E1B26'), s('Navy', '#14213D'), s('Forest', '#16332A'), s('Plum', '#2E1A3B'),
    s('Espresso', '#2B1D16'), s('Charcoal', '#26282C'), s('Deep teal', '#0F3D3E'), s('Wine', '#4A1525'),
  ]),
});

// Two rows for the Text picker (dark words on a light page, light words on a dark page).
const TEXT_SWATCHES = Object.freeze({
  dark: Object.freeze([
    s('Ink', '#342E3E'), s('Black', '#111111'), s('Navy', '#1C2541'),
    s('Forest', '#1D3B2A'), s('Cocoa', '#3B2A20'), s('Plum', '#3A1F3D'),
  ]),
  light: Object.freeze([
    s('White', '#FFFFFF'), s('Cream', '#FFF6E8'), s('Pearl', '#ECEFF4'),
    s('Mint', '#E3F5EA'), s('Blush', '#FBE4E1'), s('Sky', '#E2EEFB'),
  ]),
});

// The theme object a palette saves as.
function paletteTheme(palette) {
  return { v: 1, background: palette.background, brand: palette.brand, accent: palette.accent, text: palette.text, presetId: palette.id };
}

module.exports = { PALETTE_GROUPS, PALETTES, SWATCHES, TEXT_SWATCHES, paletteTheme };
