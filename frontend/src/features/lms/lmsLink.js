// Pure helpers for the "Connect my LMS" flow.

// The university's own sign-in address (Microsoft 365 is handled by the LMS). When it finishes, Moodle sends the
// browser to "<urlscheme>://token=<key>"; giving it our settings address plus "#" makes that land back here, with the key
// in the part of the address after "#" (which is never sent to any server).
export function buildLaunchUrl(site, origin, passport) {
  const back = `${origin}/settings?open=lms#`;
  return `${String(site).replace(/\/+$/, "")}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${encodeURIComponent(passport)}&urlscheme=${encodeURIComponent(back)}`;
}

// The key Moodle left in the address after "#", or "" when there is none.
export function keyFromHash(hash) {
  const m = String(hash || "").match(/token=([^&\s]+)/i);
  return m ? m[1] : "";
}

// A number that is different every time (the LMS only echoes it back); it is not a secret.
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
  if (result.moved) bits.push(`${result.moved} marked done`);
  return bits.length ? `Added ${bits.join(", ")}.` : "Everything is up to date.";
}
