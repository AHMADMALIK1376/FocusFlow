import { fmtRange } from "../../features/schedule/todayClasses";

// Small plain helpers shared by the Subjects page's cube, caption and detail card.

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
export const todayName = (d = new Date()) => DAYS[(d.getDay() + 6) % 7];

const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

// The short text on a sticker: the course code, or the initials of the name.
export const subjectSymbol = (s) => (s.code || (s.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 4)).toUpperCase();

// Every class of a subject: today's first, then the rest in week order (each by start time).
export function sortedSlots(sub, today) {
  const slots = (sub.schedule || []).filter((x) => x.day);
  const byTime = (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || String(a.start || "").localeCompare(String(b.start || ""));
  return [
    ...slots.filter((x) => x.day === today).sort(byTime).map((x) => ({ ...x, isToday: true })),
    ...slots.filter((x) => x.day !== today).sort(byTime).map((x) => ({ ...x, isToday: false })),
  ];
}

// The next class that starts after `now` (a class that already started today counts for next week); null with none.
export function nextClass(sub, now = new Date()) {
  const todayIdx = (now.getDay() + 6) % 7;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best = null;
  for (const x of sub.schedule || []) {
    const start = toMin(x.start);
    const dayIdx = DAYS.indexOf(x.day);
    if (start == null || dayIdx < 0) continue;
    let wait = ((dayIdx - todayIdx + 7) % 7) * 1440 + start - nowMin;
    if (wait <= 0) wait += 7 * 1440;
    if (!best || wait < best.wait) best = { wait, slot: x, isToday: wait < 1440 && dayIdx === todayIdx };
  }
  return best ? { ...best.slot, isToday: best.isToday } : null;
}

// "Today 11:10 AM – 12:40 PM, LR29" for the caption under the cube.
export function nextClassText(sub, now = new Date()) {
  const c = nextClass(sub, now);
  if (!c) return "No class times set";
  return `${c.isToday ? "Today" : DAY_SHORT[c.day] || c.day} ${fmtRange(c.start, c.end)}${c.room ? `, ${c.room}` : ""}`;
}
