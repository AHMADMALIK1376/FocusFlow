import { fmt12 } from "../../features/schedule/todayClasses";
import { isLabSubject } from "../../features/subjects/subjectStats";
import { subjectPalette } from "./subjectPalette";
import { DAY_SHORT, sortedSlots } from "./subjectInfo";
import { FACES, STICKER_SLOTS } from "./rubikModel";

// What is written on the stickers of the Subjects page cube, with no React in it. One face shows ONE subject:
// the centre sticker is its name tag, the eight around it are its facts, one per sticker, in reading order.

export const WARN_BELOW = 75; // attendance under this shows in the warning tone
export const CENTRE = 4; // the middle of the 3 x 3 reading order

// stickerId -> { face, index } where index is 0..8 in reading order on its home face
export const STICKER_INDEX = {};
for (const face of FACES) {
  STICKER_SLOTS.filter((s) => s.face === face).forEach((s, index) => { STICKER_INDEX[s.id] = { face, index }; });
}

// Small tiles (a block under about 80px across) use the short forms below; "11:10 AM" becomes "11:10a".
export const COMPACT_BELOW = 80;
export const isCompact = (tilePx) => tilePx > 0 && tilePx < COMPACT_BELOW;
const short12 = (hhmm) => fmt12(hhmm).replace(/ ([AP])M$/, (_, c) => c.toLowerCase());
const TITLES = /^(dr|ms|mr|mrs|miss|prof|engr|sir|madam)\.?$/i;
// "Ms. Seher Saeed" -> "Ms. Saeed", "Seher Saeed" -> "Saeed"
export function surname(name) {
  const t = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (t.length < 2) return t[0] || "";
  return TITLES.test(t[0]) ? `${t[0]} ${t[t.length - 1]}` : t[t.length - 1];
}

// The subject's attendance record out of either the whole map (id -> record) or the record itself.
function recordOf(subject, attendance) {
  if (!attendance) return null;
  if (attendance[subject.id] !== undefined) return attendance[subject.id];
  return "total" in attendance || "pct" in attendance ? attendance : null;
}

// The nine tiles of a subject's face, in sticker (reading) order. The centre is { title: true, code, value: name };
// the others are { key, label, value } plus big (the attendance number) and warn (under WARN_BELOW).
export function faceTiles(subject, attendance, compact = false) {
  const slotText = (x) => `${DAY_SHORT[x.day] || x.day} ${compact ? short12(x.start) : fmt12(x.start)}`.trim();
  const slots = sortedSlots(subject, null);
  const credits = Number(subject.creditHours) || 0;
  const rooms = [...new Set(slots.map((x) => String(x.room || "").trim()).filter(Boolean))];
  const teacher = String(subject.instructor || "").trim();
  const att = recordOf(subject, attendance);
  const has = !!att && att.total > 0 && att.pct != null;

  let second;
  if (slots.length >= 2) second = { key: "second", icon: "clock", label: "Class 2", value: slotText(slots[1]) };
  else if (slots.length === 1 && slots[0].end) second = { key: "second", icon: "clock", label: "Ends", value: compact ? `Ends ${short12(slots[0].end)}` : fmt12(slots[0].end) };
  else second = { key: "second", icon: "clock", label: "Weekly", value: slots.length === 1 ? (compact ? "1 a week" : "1 class a week") : (compact ? "None" : "No classes") };

  const info = [
    { key: "type", icon: isLabSubject(subject) ? "lab" : "theory", label: "Type", value: isLabSubject(subject) ? "Lab" : "Theory" },
    { key: "credits", icon: "credits", label: "Credit hours", value: credits ? (compact ? `${credits} cr` : `${credits} credit${credits === 1 ? "" : "s"}`) : (compact ? "--" : "Not set") },
    { key: "teacher", icon: "teacher", label: "Teacher", value: teacher ? (compact ? surname(teacher) : teacher) : "TBA" },
    { key: "room", icon: "room", label: "Room", value: rooms.length ? (compact ? `${rooms[0]}${rooms.length > 1 ? ` +${rooms.length - 1}` : ""}` : rooms.join(", ")) : "TBA" },
    { key: "first", icon: "clock", label: "Class 1", value: slots.length ? slotText(slots[0]) : (compact ? "No class" : "No class times") },
    second,
    has
      ? { key: "attendance", icon: "attendance", label: "Attendance", value: `${Math.round(att.pct)}%`, big: true, warn: att.pct < WARN_BELOW }
      : { key: "attendance", icon: "attendance", label: "Attendance", value: compact ? "None" : "No attendance" },
    { key: "attended", icon: "attended", label: "Classes", value: has ? (compact ? `${att.attended}/${att.total}` : `${att.attended} of ${att.total} attended`) : (compact ? "--" : "Nothing logged") },
  ];
  const title = { key: "title", title: true, code: String(subject.code || "").trim(), value: subject.name || "" };
  return [...info.slice(0, CENTRE), title, ...info.slice(CENTRE)];
}

// A light version of the subject's colour for sticker number `index`: 82 to 92 percent towards white, a little
// different on each sticker so the face looks lively but calm. The centre is the strongest.
const WHITE_MIX = [0.86, 0.9, 0.84, 0.92, 0.82, 0.88, 0.91, 0.85, 0.89];
export function stickerTint(hex, index) {
  const [r, g, b] = (subjectPalette(hex).mid.match(/\d+/g) || [232, 101, 98]).map(Number);
  const t = WHITE_MIX[((index % 9) + 9) % 9];
  const mix = (c) => Math.round(c + (255 - c) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// The six face places hold the first six subjects. Keeps the ones still in `ids` where they are, and fills the
// empty places with the next unused subjects (null when there are fewer than six).
export function reconcileAssign(assign, ids) {
  const out = FACES.map((_, i) => {
    const id = assign && assign[i];
    return id != null && ids.includes(id) ? id : null;
  });
  const seen = new Set();
  const dup = out.map((id) => { if (id == null || seen.has(id)) return null; seen.add(id); return id; });
  let next = 0;
  return dup.map((id) => {
    if (id != null) return id;
    while (next < ids.length && seen.has(ids[next])) next++;
    if (next >= ids.length) return null;
    seen.add(ids[next]);
    return ids[next];
  });
}
