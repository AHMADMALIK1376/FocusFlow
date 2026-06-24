// Preset color schemes. Each maps to a [data-scheme] block in tokens.css.
// Default = Indigo Night (indigo + wisteria on cloud pearl), the website's palette.
export const COLOR_SCHEMES = [
  { id: 'indigo', name: 'Indigo Night', swatch: '#2D4759' },
  { id: 'wisteria', name: 'Wisteria', swatch: '#8A6ED6' },
  { id: 'purple', name: 'Purple', swatch: '#6c5ce7' },
  { id: 'forest', name: 'Forest', swatch: '#2EA06E' },
  { id: 'coral', name: 'Coral', swatch: '#E05A5A' },
];

export const DEFAULT_SCHEME = 'indigo';
export const MODES = ['light', 'dark'];

// Curated two-colour combinations (brand + accent). Selecting one applies both
// colours live across the whole app (sidebar, navbar, buttons, charts…).
export const COLOR_COMBOS = [
  { id: 'indigo',  name: 'Indigo Night',  brand: '#2D4759', accent: '#D6C6F7' },
  { id: 'violet',  name: 'Violet Dusk',   brand: '#4F3B78', accent: '#E2B7FF' },
  { id: 'ocean',   name: 'Deep Ocean',    brand: '#1B4965', accent: '#9AD1D4' },
  { id: 'forest',  name: 'Forest Mint',   brand: '#22604A', accent: '#A8E6CF' },
  { id: 'plum',    name: 'Plum Berry',    brand: '#6D2E46', accent: '#F4B8D4' },
  { id: 'coral',   name: 'Coral Sunset',  brand: '#B5485C', accent: '#FFD3A5' },
  { id: 'slate',   name: 'Slate Sky',     brand: '#33415C', accent: '#A9D6E5' },
  { id: 'mocha',   name: 'Mocha Gold',    brand: '#4A3B2A', accent: '#E6C79C' },
  { id: 'midnight',name: 'Midnight Teal', brand: '#143642', accent: '#7FD8BE' },
  { id: 'rose',    name: 'Rosewood',      brand: '#7A3B45', accent: '#F6C8C8' },
];
