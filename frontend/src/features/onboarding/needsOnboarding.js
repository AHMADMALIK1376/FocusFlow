// The welcome set-up ("Tell us about you", workspace name...) is for a brand new
// account only: it is switched on when the account's email is verified (or a new
// Google account signs in for the first time) and switched off when the student
// finishes it. Signing in later, on any device, never brings it back.
// It lives in the browser, so closing the tab half way resumes it on that device.

const KEY = 'focusflow:needsOnboarding';

export function needsOnboarding() {
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function markNeedsOnboarding() {
  try { window.localStorage.setItem(KEY, '1'); } catch { /* storage blocked: skip the set-up */ }
}

export function clearNeedsOnboarding() {
  try { window.localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
