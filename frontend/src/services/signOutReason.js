// Why was the student sent back to the sign-in page? When the app signs someone out because the
// server said so (not because they pressed Log out), the reason is remembered here and shown
// once, calmly, on the sign-in page. It also tells the owner which kind of problem it was.
const KEY = 'focusflow:signout-reason';

const WORDS = {
  TOKEN_EXPIRED: "Your session ended because it had been a long time since you last used FocusFlow. Please sign in again.",
  INVALID_TOKEN: "Your saved sign-in wasn't valid any more, so we signed you out to keep your account safe. Please sign in again.",
  USER_NOT_FOUND: "We couldn't find your account any more. It may have been deleted. Please sign in again or create a new account.",
  NO_TOKEN: "Your sign-in was no longer saved on this device, which can happen if the browser cleared it. Please sign in again.",
};

export const describeSignOut = (code) => WORDS[code] || null;

export function rememberSignOutReason(code) {
  if (!WORDS[code]) return;
  try { window.localStorage.setItem(KEY, JSON.stringify({ code, at: new Date().toISOString() })); } catch { /* storage blocked */ }
}

// Reads it without removing it (safe to call while rendering).
export function peekSignOutReason() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    return v && WORDS[v.code] ? v : null;
  } catch {
    return null;
  }
}

export function clearSignOutReason() {
  try { window.localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
