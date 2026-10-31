// Pure helpers for the Moodle (university LMS) connection. No network, no database.
const crypto = require('crypto');

// ---- The student's key -------------------------------------------------------------------------
// Moodle's sign-in hands the phone app "moodlemobile://token=<base64 of siteid:::token[:::privatetoken]>".
// A student can paste that whole text, the base64 part, or the plain 32-character token.
const HEX32 = /^[0-9a-f]{32}$/i;

function parseLaunchText(raw) {
  let text = String(raw == null ? '' : raw).trim();
  if (!text || text.length > 2000) return null;
  try { text = decodeURIComponent(text); } catch (e) { /* keep as typed */ }
  const m = text.match(/token=([^&\s"'#]+)/i);
  if (m) text = m[1];
  if (HEX32.test(text)) return text.toLowerCase();
  try {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const token = decoded.split(':::')[1];
    if (token && HEX32.test(token)) return token.toLowerCase();
  } catch (e) { /* not base64 */ }
  return null;
}

// ---- Keeping the key safe at rest (AES-256-GCM) --------------------------------------------------
// LMS_TOKEN_KEY is 32 random bytes, base64. Without it the feature stays switched off.
function keyFromEnv(env = process.env) {
  try {
    const key = Buffer.from(String(env.LMS_TOKEN_KEY || ''), 'base64');
    return key.length === 32 ? key : null;
  } catch (e) {
    return null;
  }
}
function encryptToken(plain, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join(':');
}
function decryptToken(blob, key) {
  const [v, iv, tag, body] = String(blob || '').split(':');
  if (v !== 'v1' || !iv || !tag || !body) throw new Error('bad key format');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(body, 'base64')), d.final()]).toString('utf8');
}

// ---- Reading a course name ----------------------------------------------------------------------
// "ADVANCE DATABASE MANAGEMENT SYSTEMS - IUIC_COURSE_FALL26_576 (FRI 01:15 03:20 LR26)"
const DAYS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };
const ACRONYMS = new Set(['AI', 'HCI', 'IOT', 'OOP', 'DBMS', 'SQL', 'OS', 'CS', 'ML', 'UI', 'UX', 'ICT', 'DLD', 'DSA', 'PF', 'IT', 'SE', 'NLP', 'II', 'III', 'IV']);
const SMALL = new Set(['and', 'of', 'in', 'the', 'to', 'for', 'on', 'with', '&']);

function titleCase(s) {
  return String(s).toLowerCase().split(/\s+/).filter(Boolean).map((w, i) => {
    if (ACRONYMS.has(w.toUpperCase())) return w.toUpperCase();
    if (i > 0 && SMALL.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// University portals leave out AM/PM: 1 to 7 is the afternoon (same rule as the timetable scanner).
function to24h(h, m) {
  let hour = Number(h);
  if (hour >= 1 && hour <= 7) hour += 12;
  if (hour > 23 || Number(m) > 59) return null;
  return `${String(hour).padStart(2, '0')}:${m}`;
}

// The LMS sends names HTML-escaped ("HCI &amp; Graphics"): show them as the words they are.
function decodeEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d{1,5});/g, (m, n) => { const c = Number(n); return c > 0 && c < 65536 ? String.fromCharCode(c) : m; })
    .replace(/&amp;/g, '&');
}

// A short code for a subject from its name: "HCI & Computer Graphics Lab" -> "HCICGL".
function acronym(name) {
  const words = decodeEntities(name).split(/[^A-Za-z0-9]+/).filter((w) => w && !SMALL.has(w.toLowerCase()));
  const code = words.map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w[0].toUpperCase())).join('');
  return code.slice(0, 6);
}

function parseCourseName(fullname) {
  const full = decodeEntities(fullname).trim();
  const m = full.match(/^(.+?)\s+-\s+([A-Z0-9]+(?:_[A-Z0-9]+)+)\s*(?:\((.*)\))?\s*$/i);
  const rawName = m ? m[1] : full.replace(/\s*\(.*$/, '');
  const code = m ? m[2].slice(0, 50) : null;
  const meetings = [];
  const re = /\b(MON|TUE|WED|THU|FRI|SAT|SUN)[A-Z]*\s+(\d{1,2}):(\d{2})\s+(\d{1,2}):(\d{2})(?:\s+([A-Z0-9][A-Z0-9-]*))?/gi;
  let t;
  while (m && m[3] && (t = re.exec(m[3])) !== null) {
    const start = to24h(t[2], t[3]);
    const end = to24h(t[4], t[5]);
    if (start && end) meetings.push({ day: DAYS[t[1].toUpperCase()], start, end, room: t[6] || null });
  }
  const termMatch = full.match(/(FALL|SPRING|SUMMER)(\d{2})(?!\d)/i);
  return {
    name: titleCase(rawName).slice(0, 200),
    code: acronym(titleCase(rawName)) || code,
    section: code,
    isLab: /\blab\b/i.test(rawName),
    term: termMatch ? `${termMatch[1][0].toUpperCase()}${termMatch[1].slice(1).toLowerCase()} 20${termMatch[2]}` : null,
    meetings,
  };
}

// For matching an LMS course to a subject the student already has: ignore case, spaces and symbols.
const normalizeName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// ---- Dates ----------------------------------------------------------------------------------------
const TIMEZONE = () => process.env.LMS_TIMEZONE || 'Asia/Karachi';
function localDate(unixSeconds, tz = TIMEZONE()) {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(n * 1000));
}

function localTime(unixSeconds, tz = TIMEZONE()) {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(n * 1000));
}

// The teacher's text for an assignment arrives as HTML: keep the words, drop the markup.
function htmlToText(html, max = 900) {
  const text = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Where a file lives on the LMS: only the path, and only on the LMS's own address (so a made-up address is never fetched).
function relativeFilePath(fileurl, base) {
  try {
    const u = new URL(String(fileurl));
    if (u.origin !== new URL(base).origin) return null;
    return /^\/(webservice\/)?pluginfile\.php\/[^?#]+$/.test(u.pathname) ? u.pathname : null;
  } catch (e) {
    return null;
  }
}

// ---- What changed? ----------------------------------------------------------------------------------
// State kept per assignment between syncs: "<submitted 0/1>|<due unix>|<title>".
const assignmentState = (submitted, due, title) => `${submitted ? 1 : 0}|${Number(due) || 0}|${title}`;
function parseAssignmentState(state) {
  const [s, d, ...rest] = String(state || '').split('|');
  return { submitted: s === '1', due: Number(d) || 0, title: rest.join('|') };
}

// existing / wanted: [{ id, subjectId, date }]. Returns what to add, change and remove.
function diffSessions(existing, wanted) {
  const have = new Map(existing.map((e) => [String(e.id), e]));
  const want = new Map(wanted.map((w) => [String(w.id), w]));
  const add = [], update = [], remove = [];
  for (const [id, w] of want) {
    const e = have.get(id);
    if (!e) add.push(w);
    else if (e.date !== w.date || e.subjectId !== w.subjectId) update.push(w);
  }
  for (const [id, e] of have) if (!want.has(id)) remove.push(e);
  return { add, update, remove };
}

// Which of the student's LMS courses are current (not finished more than a month ago)?
function isCurrentCourse(course, nowSeconds = Date.now() / 1000) {
  const end = Number(course && course.enddate) || 0;
  return !end || end > nowSeconds - 30 * 86400;
}

module.exports = {
  parseLaunchText, keyFromEnv, encryptToken, decryptToken,
  parseCourseName, titleCase, to24h, normalizeName,
  decodeEntities, acronym, htmlToText, relativeFilePath, localDate, localTime, assignmentState, parseAssignmentState, diffSessions, isCurrentCourse,
};
