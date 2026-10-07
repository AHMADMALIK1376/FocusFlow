// GENERATED from frontend/src/design/theme/theme.js by backend/scripts/sync-theme-engine.js.
// Do not edit. Edit the frontend file, then run: node scripts/sync-theme-engine.js
// The student's colour theme: its shape, the built-in default, and a strict cleaner.
// Mirrors the server check in backend/utils/preferences.js, so we never send what it refuses.

const THEME_VERSION = 1;

const DEFAULT_THEME = Object.freeze({
  v: 1,
  background: '#F5EFE6',
  brand: '#EC706D',
  accent: '#B8DCC4',
  text: 'auto',
  presetId: 'default',
});

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const PRESET_RE = /^[a-z0-9-]{1,32}$/;

const KEYS = ['v', 'background', 'brand', 'accent', 'text', 'logo', 'icon', 'presetId'];

// Returns a clean copy (hex uppercased) or null when anything is off.
function sanitizeTheme(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (!Object.keys(input).every((k) => KEYS.includes(k))) return null;
  if (input.v !== THEME_VERSION) return null;
  for (const k of ['background', 'brand', 'accent']) {
    if (typeof input[k] !== 'string' || !HEX_RE.test(input[k])) return null;
  }
  if (input.text !== 'auto' && !(typeof input.text === 'string' && HEX_RE.test(input.text))) return null;
  for (const k of ['logo', 'icon']) {
    if (k in input && !(typeof input[k] === 'string' && HEX_RE.test(input[k]))) return null;
  }
  if (typeof input.presetId !== 'string' || !PRESET_RE.test(input.presetId)) return null;

  const out = {
    v: input.v,
    background: input.background.toUpperCase(),
    brand: input.brand.toUpperCase(),
    accent: input.accent.toUpperCase(),
    text: input.text === 'auto' ? 'auto' : input.text.toUpperCase(),
    presetId: input.presetId,
  };
  if ('logo' in input) out.logo = input.logo.toUpperCase();
  if ('icon' in input) out.icon = input.icon.toUpperCase();
  return out;
}

// True when the colours are the built-in ones (the preset name does not matter).
function isDefaultPalette(theme) {
  const t = sanitizeTheme(theme);
  return !!t
    && t.background === DEFAULT_THEME.background
    && t.brand === DEFAULT_THEME.brand
    && t.accent === DEFAULT_THEME.accent
    && t.text === 'auto'
    && !('logo' in t)
    && !('icon' in t);
}

module.exports = { THEME_VERSION, DEFAULT_THEME, HEX_RE, PRESET_RE, sanitizeTheme, isDefaultPalette };
