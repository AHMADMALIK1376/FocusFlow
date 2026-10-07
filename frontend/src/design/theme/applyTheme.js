// Puts a derived theme on <html> and remembers it so the next page load can paint it
// before the app starts (the inline script in public/index.html reads the same cache).
import storage from '../../storage/storageAdapter';
import { tripletToRgb, rgbToHex } from './color';
import { isDefaultPalette } from './theme';

export const THEME_CACHE_KEY = 'theme.colors'; // localStorage 'focusflow:theme.colors'
export const THEME_CACHE_VERSION = 1; // bump whenever recipes/tokens change

// Sets every token inline on <html>, the colour scheme, and the browser bar colour.
// The .dark class is ThemeProvider's business and is left alone.
export function applyTheme(result, doc = document) {
  const root = doc.documentElement;
  Object.entries(result.tokens).forEach(([name, value]) => root.style.setProperty(name, value));
  root.style.setProperty('color-scheme', result.scheme);
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', result.metaColor);
}

// The default look needs no cache (the stylesheet already has it).
export function writeThemeCache(theme, result) {
  if (isDefaultPalette(theme)) {
    storage.remove(THEME_CACHE_KEY);
    return;
  }
  storage.set(THEME_CACHE_KEY, {
    v: THEME_CACHE_VERSION,
    tokens: result.tokens,
    scheme: result.scheme,
    meta: result.metaColor,
  });
}

// Same checks as the inline script; anything unexpected gives null. The app itself never
// reads the cache (the inline script does); this mirror lets the tests prove both agree.
export function readThemeCache() {
  const c = storage.get(THEME_CACHE_KEY, null);
  if (!c || c.v !== THEME_CACHE_VERSION || !c.tokens || typeof c.tokens !== 'object') return null;
  const name = /^--[a-z0-9-]+$/;
  const safe = /^[0-9a-z .,%()/#-]+$/i;
  const ok = /^(rgb|linear-gradient|var)$/; // only the CSS functions a theme uses (no url(, image-set(, ...)
  for (const k of Object.keys(c.tokens)) {
    const v = c.tokens[k];
    if (!name.test(k) || typeof v !== 'string' || !safe.test(v)) return null;
    if ([...v.matchAll(/([a-z-]+)\(/gi)].some((m) => !ok.test(m[1]))) return null;
  }
  if (c.scheme !== 'light' && c.scheme !== 'dark') return null;
  if (!/^#[0-9a-fA-F]{6}$/.test(c.meta)) return null;
  return c;
}

// Live colour as #RRGGBB (charts need hex), or the fallback when no theme value is set.
export function tokenHex(name, fallback) {
  const rgb = tripletToRgb(document.documentElement.style.getPropertyValue(name));
  return rgb ? rgbToHex(rgb) : fallback;
}
