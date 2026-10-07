// The student's cookie / privacy choice, kept in this browser.
//   "all"       - essential storage plus optional Google services (Google sign-in)
//   "essential" - only what FocusFlow needs to work; Google's script is not loaded
//                 until the student asks to sign in with Google and agrees then.
// FocusFlow has no analytics, ads or tracking, so Google sign-in is the only
// optional thing there is. Bump VERSION if that ever changes, so everyone is asked again.

export const CONSENT_KEY = 'focusflow:consent';
export const CONSENT_VERSION = 1;

export function getConsent() {
  try {
    const v = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
    if (v && v.version === CONSENT_VERSION && (v.choice === 'all' || v.choice === 'essential')) return v.choice;
  } catch { /* unreadable: treat as not chosen yet */ }
  return null;
}

export function setConsent(choice) {
  if (choice !== 'all' && choice !== 'essential') return false;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, version: CONSENT_VERSION, at: new Date().toISOString() }));
    window.dispatchEvent(new Event('ff:consent'));
    return true;
  } catch {
    return false;
  }
}

export const hasChosen = () => getConsent() !== null;
export const allowsGoogle = () => getConsent() === 'all';
