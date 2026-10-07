// The colours of the last person who signed in on this browser (colour codes only), so the
// sign-in page, error pages and splash keep them after signing out. The theme itself also
// lives in the account's preferences; this is only the browser's memory of it.
// Cleared by saving "Reset to FocusFlow colours", by another student's account loading, or
// by clearing the site's data. Not cleared on sign-out.
import storage from '../../storage/storageAdapter';
import { sanitizeTheme, isDefaultPalette } from './theme';

export const DEVICE_THEME_KEY = 'theme.device'; // localStorage 'focusflow:theme.device'

// A clean non-default theme, or null. An invalid stored value is removed.
export function readDeviceTheme() {
  const clean = sanitizeTheme(storage.get(DEVICE_THEME_KEY, null)); // unreadable JSON also reads as null
  if (!clean || isDefaultPalette(clean)) {
    storage.remove(DEVICE_THEME_KEY);
    return null;
  }
  return clean;
}

// Stores a non-default theme and returns the clean copy; a default or invalid one removes the memory and returns null.
export function writeDeviceTheme(theme) {
  const clean = sanitizeTheme(theme);
  if (!clean || isDefaultPalette(clean)) {
    storage.remove(DEVICE_THEME_KEY);
    return null;
  }
  storage.set(DEVICE_THEME_KEY, clean);
  return clean;
}

// What to paint: the signed-in student's own theme once their account has loaded, otherwise
// the theme this browser remembers, otherwise the saved one.
export function pickShownTheme({ own, theme, deviceTheme }) {
  return own ? theme : (deviceTheme || theme);
}

// For screens outside the preferences provider (splash, connection gate, crash screen).
export function initialShownTheme() {
  const saved = storage.get('preferences', null);
  return readDeviceTheme() || sanitizeTheme(saved && saved.theme) || null;
}
