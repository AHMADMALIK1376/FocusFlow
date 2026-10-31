// Pure helpers for the "Connect my LMS" flow.

// Moodle will only send the sign-in result back to an "app name" made of letters, numbers and . + -  (never a web
// address). "web+" names are the ones a website is allowed to claim in the browser, so FocusFlow claims this one and,
// when Moodle redirects to "web+focusflow://token=<key>", the browser opens FocusFlow with that text.
export const PROTOCOL = "web+focusflow";
export const MANUAL_SCHEME = "moodlemobile"; // what the Moodle phone app uses; the browser cannot open it, so the key is copied by hand

// The university's own sign-in address (Microsoft 365 is handled by the LMS).
export function buildLaunchUrl(site, passport, scheme = PROTOCOL) {
  return `${String(site).replace(/\/+$/, "")}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${encodeURIComponent(passport)}&urlscheme=${encodeURIComponent(scheme)}`;
}

// Where the browser should open FocusFlow when it is handed a web+focusflow:// link (%s is replaced by the link).
export const handlerUrl = (origin) => `${origin}/settings?open=lms&lmskey=%s`;

// Ask the browser to send web+focusflow:// links to FocusFlow. Not every browser can; then the manual way still works.
export function registerHandler(origin) {
  try {
    if (typeof navigator !== "undefined" && navigator.registerProtocolHandler) {
      navigator.registerProtocolHandler(PROTOCOL, handlerUrl(origin));
      return true;
    }
  } catch (e) { /* not allowed here */ }
  return false;
}

// The key handed back in the address (?lmskey=... or #...token=...), or "" when there is none.
export function keyFromAddress(search, hash) {
  const fromSearch = new URLSearchParams(String(search || "")).get("lmskey") || "";
  const m = `${fromSearch} ${hash || ""}`.match(/token=([^&\s]+)/i);
  return m ? m[1] : "";
}

export const randomPassport = () => {
  const bytes = new Uint32Array(2);
  const c = typeof window !== "undefined" && window.crypto;
  if (c && c.getRandomValues) c.getRandomValues(bytes);
  else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 4294967296); });
  return `${bytes[0]}${bytes[1]}`;
};

// "Added 2 subjects, 5 assignments." (or "Everything is up to date.").
export function summarizeSync(result) {
  if (!result || result.error) return "";
  const bits = [];
  if (result.subjects) bits.push(`${result.subjects} ${result.subjects === 1 ? "subject" : "subjects"}`);
  if (result.assignments) bits.push(`${result.assignments} ${result.assignments === 1 ? "assignment" : "assignments"}`);
  if (result.quizzes) bits.push(`${result.quizzes} ${result.quizzes === 1 ? "quiz" : "quizzes"}`);
  if (result.moved) bits.push(`${result.moved} marked done`);
  return bits.length ? `Added ${bits.join(", ")}.` : "Everything is up to date.";
}
