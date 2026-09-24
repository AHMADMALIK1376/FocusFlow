// Rule-based parser for a university "registered courses" table — no AI.
// Accepts either OCR output from a screenshot or text copied from the portal
// (tab-separated cells, one row per line, or one cell per line) and returns
// subjects shaped for POST /api/subjects.
//
// Expected row shape (columns may be missing / wrapped):
//   SECTION  CODE  TITLE  CREDIT  INSTRUCTOR  DAY hh:mm hh:mm ROOM[, DAY hh:mm hh:mm ROOM]

const DAY_NAMES = {
  MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday",
  FRI: "Friday", SAT: "Saturday", SUN: "Sunday",
};
const DAY_RE = "(MON|TUE|WED|THU|FRI|SAT|SUN)[A-Z]*\\.?";
const TIME_RE = "(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\s*(AM|PM)?";
// Course code like CSC452, CMC381L, CS-201, MATH 101 L
const CODE_RE = /\b([A-Z]{2,5})\s?-?\s?(\d{3,4})\s?(L)?\b/;

// Small set of words that should stay upper-case when title-casing.
const ACRONYMS = new Set([
  "AI", "HCI", "IOT", "OOP", "DBMS", "SQL", "OS", "CS", "ML", "UI", "UX", "ICT",
  "DLD", "DSA", "PF", "II", "III", "IV", "VI", "IT", "SE", "NLP", "DIP", "TBA",
]);
const SMALL_WORDS = new Set(["and", "of", "in", "the", "to", "for", "on", "with", "&"]);
const HONORIFICS = { MR: "Mr", MRS: "Mrs", MS: "Ms", DR: "Dr", PROF: "Prof", ENGR: "Engr", SIR: "Sir", MISS: "Miss" };

export const SUBJECT_COLORS = [
  "#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED",
  "#DB2777", "#0891B2", "#65A30D", "#EA580C", "#4F46E5",
  "#0D9488", "#B45309",
];

export function titleCase(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const bare = w.replace(/[^a-z]/g, "").toUpperCase();
      if (ACRONYMS.has(bare)) return w.toUpperCase();
      if (HONORIFICS[bare] && w.endsWith(".")) return HONORIFICS[bare] + ".";
      if (i > 0 && SMALL_WORDS.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// University portals often omit AM/PM. Classes run roughly 8am–8pm, so
// 8–11 → morning, 12 and 1–7 → afternoon. Explicit AM/PM always wins.
function to24h(h, m, meridiem) {
  let hour = Number(h);
  if (meridiem === "AM") hour = hour === 12 ? 0 : hour;
  else if (meridiem === "PM") hour = hour === 12 ? 12 : hour + 12;
  else if (hour >= 1 && hour <= 7) hour += 12;
  if (hour > 23 || Number(m) > 59) return null;
  return `${String(hour).padStart(2, "0")}:${m}`;
}

// Fix common OCR confusions inside digit runs: O→0, l/I/|→1, S→5.
function fixOcrDigits(text) {
  return text.replace(/[0-9OolIS|]{1,2}\s*[:.]\s*[0-9OolIS|]{2}/g, (t) =>
    t.replace(/[Oo]/g, "0").replace(/[lI|]/g, "1").replace(/S/g, "5")
  );
}

function parseSlots(text) {
  const slotRe = new RegExp(`\\b${DAY_RE}\\s+${TIME_RE}\\s*(?:-|–|to)?\\s*${TIME_RE}`, "gi");
  const matches = [...text.matchAll(slotRe)];
  return matches.map((m, i) => {
    const after = m.index + m[0].length;
    const nextStart = i + 1 < matches.length ? matches[i + 1].index : text.length;
    // Room ends at the next cell/line break (footer text lands after a tab).
    const room = text
      .slice(after, nextStart)
      .replace(/^\s+/, "")
      .split("\t")[0]
      .replace(/[,;|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 3)
      .join(" ");
    const start = to24h(m[2], m[3], m[4] && m[4].toUpperCase());
    let end = to24h(m[5], m[6], m[7] && m[7].toUpperCase());
    // A class can't end before it starts — push the end into the afternoon.
    if (start && end && end <= start && Number(end.slice(0, 2)) < 12) {
      end = `${Number(end.slice(0, 2)) + 12}${end.slice(2)}`;
    }
    return { day: DAY_NAMES[m[1].toUpperCase()], start: start || "", end: end || "", room };
  });
}

// "COMPILER CONSTRUCTION 2 MR. BASHARAT KAYANI" → title / credits / instructor.
function parseMiddle(middle) {
  const cells = middle.split(/\t+/).map((c) => c.trim()).filter(Boolean);
  let title = "";
  let credits = null;
  let instructor = "";
  const creditIdx = cells.findIndex((c) => /^\d{1,2}(\.\d)?$/.test(c));
  if (cells.length > 1 && creditIdx > 0) {
    title = cells.slice(0, creditIdx).join(" ");
    credits = Number(cells[creditIdx]);
    instructor = cells.slice(creditIdx + 1).join(" ");
  } else {
    // Space-separated (OCR): the LAST standalone small number is the credit
    // count; instructor names never contain digits.
    const flat = middle.replace(/\s+/g, " ").trim();
    const m = flat.match(/^(.*)\s(\d{1,2}(?:\.\d)?)(?:\s+(.*))?$/);
    if (m && Number(m[2]) <= 12) {
      title = m[1];
      credits = Number(m[2]);
      instructor = m[3] || "";
    } else {
      title = flat;
    }
  }
  // Drop OCR specks (~, |, _, stray symbols) that table borders leave behind.
  const clean = (s) => s.replace(/[^A-Za-z0-9 .&'()\-/,]/g, " ").replace(/\s+/g, " ").trim();
  title = clean(title);
  instructor = clean(instructor);
  if (/^(TBA|TBD|N\/?A|-)?$/i.test(instructor)) instructor = "";
  return {
    name: titleCase(title),
    creditHours: credits,
    instructor: instructor ? titleCase(instructor) : "",
  };
}

/**
 * @param {string} raw  OCR or pasted text
 * @returns {Array<{code,name,creditHours,instructor,schedule:Array<{day,start,end,room}>}>}
 */
export function parseTimetable(raw) {
  if (!raw) return [];
  const lines = fixOcrDigits(String(raw))
    .replace(/\r/g, "")
    // OCR reads a capital I next to capitals as lower-case l ("HCl" → "HCI").
    .replace(/([A-Z])l\b/g, "$1I")
    .split("\n")
    .map((l) => l.replace(/ {2,}/g, "\t").trim())
    .filter(Boolean);

  // Group lines into one chunk per course: a line whose first course code
  // appears before any day token starts a new course; anything else is a
  // continuation (wrapped schedule, one-cell-per-line paste, …).
  const chunks = [];
  const dayAnywhere = new RegExp(`\\b${DAY_RE}\\s+\\d`, "i");
  for (const line of lines) {
    const upper = line.toUpperCase();
    const codeMatch = upper.match(CODE_RE);
    const dayMatch = upper.match(dayAnywhere);
    const startsCourse = codeMatch && (!dayMatch || codeMatch.index < dayMatch.index);
    if (startsCourse) {
      chunks.push({ code: `${codeMatch[1]}${codeMatch[2]}${codeMatch[3] || ""}`, rest: upper.slice(codeMatch.index + codeMatch[0].length) });
    } else if (chunks.length) {
      chunks[chunks.length - 1].rest += "\t" + upper;
    }
  }

  return chunks
    .map(({ code, rest }) => {
      // Drop stray section numbers (long digit runs) that belong to the next row.
      const text = rest.replace(/\b\d{6,}\b/g, " ");
      const firstSlot = text.search(new RegExp(`\\b${DAY_RE}\\s+\\d`, "i"));
      const middle = firstSlot >= 0 ? text.slice(0, firstSlot) : text;
      const schedule = firstSlot >= 0 ? parseSlots(text.slice(firstSlot)) : [];
      return { code, ...parseMiddle(middle), schedule };
    })
    .filter((c) => c.name || c.schedule.length);
}

// Give each course a colour; a lab shares its theory course's colour.
export function assignColors(courses, offset = 0) {
  const byBase = {};
  let next = offset;
  return courses.map((c) => {
    const base = c.code ? c.code.replace(/L$/, "") : c.name;
    if (!byBase[base]) byBase[base] = SUBJECT_COLORS[next++ % SUBJECT_COLORS.length];
    return { ...c, color: byBase[base] };
  });
}
