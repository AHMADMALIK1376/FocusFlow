import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Select, Field } from "../../../components/ui";
import { subjectAPI } from "../../../services/api";
import { parseTimetable, assignColors } from "../../subjects/parseTimetable";
import { subjectPayload } from "../../subjects/useSubjects";
import { sameText, normCode, similarity } from "../textParse";
import { fmtRange } from "../../schedule/todayClasses";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

const validSlots = (list) => (list || []).filter((s) => s.day && s.start);

// A scanned slot equals a saved one when day and start agree, and its end and
// room either agree or weren't read at all.
const sameSlot = (scanned, saved) =>
  scanned.day === saved.day && scanned.start === saved.start &&
  (!scanned.end || scanned.end === saved.end) &&
  (!scanned.room || normCode(scanned.room) === normCode(saved.room));

export function sameSchedule(saved, scanned) {
  const A = validSlots(saved);
  const B = validSlots(scanned);
  if (A.length !== B.length) return false;
  const used = new Set();
  return B.every((s) => {
    const j = A.findIndex((t, idx) => !used.has(idx) && sameSlot(s, t));
    if (j < 0) return false;
    used.add(j);
    return true;
  });
}

const scheduleText = (list) =>
  validSlots(list).map((s) => `${DAY_SHORT[s.day] || s.day} ${fmtRange(s.start, s.end)}${s.room ? ` ${s.room}` : ""}`).join(", ") || "none";

// Keep an end time / room the scan missed but the saved slot already had.
const fillFromSaved = (scanned, saved) =>
  scanned.map((s) => {
    const t = (saved || []).find((x) => x.day === s.day && x.start === s.start);
    return { day: s.day, start: s.start, end: s.end || t?.end || "", room: s.room || t?.room || "" };
  });

const oneCharOff = (a, b) => a.length === b.length && [...a].filter((ch, i) => ch !== b[i]).length === 1;

function SubjectEditor({ data: r, set, update }) {
  const setSlot = (j, k, v) => update((d) => ({ ...d, schedule: d.schedule.map((s, sj) => (sj === j ? { ...s, [k]: v } : s)) }));
  const addSlot = () => update((d) => ({ ...d, schedule: [...d.schedule, { day: "Monday", start: "", end: "", room: "" }] }));
  const removeSlot = (j) => update((d) => ({ ...d, schedule: d.schedule.filter((_, sj) => sj !== j) }));
  return (
    <div className="space-y-2">
      {/* phone: name on its own row, then code + credits; wider: code · name · credits */}
      <div className="grid grid-cols-[1fr_4rem] sm:grid-cols-[6.5rem_1fr_4rem] gap-2">
        <Input value={r.name} onChange={(e) => set("name", e.target.value)} placeholder="Course name" className="!py-2 !px-3 text-sm col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1" />
        <Input value={r.code} onChange={(e) => set("code", e.target.value)} placeholder="Code" className="!py-2 !px-3 text-sm font-bold sm:col-start-1 sm:row-start-1" />
        <Input type="number" min="0" step="0.5" value={r.creditHours ?? ""} onChange={(e) => set("creditHours", e.target.value)} title="Credit hours" className="!py-2 !px-2 text-sm" />
      </div>
      <Input value={r.instructor} onChange={(e) => set("instructor", e.target.value)} placeholder="Instructor (TBA)" className="!py-2 !px-3 text-sm" />
      {r.schedule.map((s, j) => (
        // phone: day · room, then start · end; wider: day · start · end · room
        <div key={j} className="grid grid-cols-2 sm:grid-cols-[4.5rem_1fr_1fr_1fr_auto] gap-1.5 items-center">
          <Select value={s.day} onChange={(e) => setSlot(j, "day", e.target.value)} className="!py-1.5 !px-2 text-sm order-1 sm:order-none">
            {DAYS.map((d) => <option key={d} value={d}>{DAY_SHORT[d]}</option>)}
          </Select>
          <Input type="time" value={s.start} onChange={(e) => setSlot(j, "start", e.target.value)} className="!py-1.5 !px-2 text-sm min-w-0 order-3 sm:order-none" />
          <Input type="time" value={s.end} onChange={(e) => setSlot(j, "end", e.target.value)} className="!py-1.5 !px-2 text-sm min-w-0 order-4 sm:order-none" />
          <div className="sm:col-span-2 flex items-center gap-1.5 min-w-0 order-2 sm:order-none">
            <Input value={s.room} onChange={(e) => setSlot(j, "room", e.target.value)} placeholder="Room" className="!py-1.5 !px-2 text-sm flex-1 min-w-0" />
            <button type="button" onClick={() => removeSlot(j)} className="p-1.5 text-muted hover:text-focus" title="Remove slot"><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addSlot} className="text-xs font-bold text-muted hover:text-ink inline-flex items-center gap-1">
        <Plus size={13} /> Add class time
      </button>
    </div>
  );
}

// Timetable → subjects (Subjects page and Daily Routine).
export const subjectsScan = {
  title: "Import timetable",
  reviewTitle: "Review courses",
  decideTitle: "This looks like a new timetable",
  intro: "Add your courses from your university portal. If you've already added subjects, the scan is compared with them and only new courses and real differences are saved. Nothing is sent to an AI: the text is read on your device.",
  pasteLabel: "Paste your registered-courses table",
  pasteHint: "On the portal, select the whole table, copy it, and paste it here. This is the most accurate option.",
  pastePlaceholder: "032610354\tCSC452\tCOMPILER CONSTRUCTION\t2\tMR. ...\tTUE 01:15 03:20 LR26",
  emptyError: "Couldn't find any courses. Make sure the course codes (e.g. CSC452) and class times are visible, or try pasting the text instead.",
  noun: ["course", "courses"],
  reviewNote: "Screenshots can misread a letter or two, so check names, times and rooms. Portal times without AM/PM were read as 8–11 morning, 12–7 afternoon (so 01:15 is 1:15 PM). A missing teacher is saved as TBA.",
  replaceQuestion: "Replace your current subjects with these?",
  replaceExplain: "Your current subjects move to Past terms on the Subjects page. Their grades and attendance are kept and still count toward your CGPA.",
  removeHeading: (n) => `Moving ${n} subject${n === 1 ? "" : "s"} to Past terms`,
  removeButton: (n) => `Move ${n} to past terms`,
  removedWord: "moved to past terms",
  defaultOptions: { term: "" },

  parse: (text, ctx) => assignColors(parseTimetable(text), (ctx.subjects || []).length),
  existing: (ctx) => ctx.subjects || [],

  match(s, e) {
    const a = normCode(s.code);
    const b = normCode(e.code);
    if (a && b && a === b) return 1;
    // Codes differ or are missing — OCR often misreads one ("CSSC332L"), so the
    // name decides. A lab never matches its theory course (see sameText).
    if (!sameText(s.name, e.name)) return 0;
    return a && b && oneCharOff(a, b) ? 0.9 : 0.8;
  },

  fields: () => [
    // a code a letter off the saved one is a misread, not a renumbering
    { key: "code", label: "Code", same: (a, b) => normCode(a) === normCode(b) || similarity(normCode(a), normCode(b)) >= 0.85 },
    // already matched by code, so a looser name check — OCR noise isn't a rename
    { key: "name", label: "Name", same: (a, b) => sameText(a, b, 0.75) },
    { key: "creditHours", label: "Credits", same: (a, b) => Number(a) === Number(b) },
    // "TBA" means the table named nobody — it never overwrites a real name
    { key: "instructor", label: "Instructor", same: (a, b) => sameText(a, b), blank: (v) => !v || /^\s*(tba|tbd)\s*$/i.test(v) },
    { key: "schedule", label: "Class times", same: sameSchedule, blank: (v) => !validSlots(v).length, format: scheduleText },
  ],

  label: (e) => [e.code, e.name].filter(Boolean).join(" "),
  name: (d) => [d.code, d.name].filter(Boolean).join(" ") || "Untitled course",
  isValid: (d) => Boolean(d.name && d.name.trim()),
  invalidHint: () => "Needs a course name",

  create: (d, ctx, opts) =>
    subjectAPI.create({
      name: d.name.trim(),
      code: (d.code || "").trim() || null,
      color: d.color,
      instructor: (d.instructor || "").trim() || null,
      creditHours: Number(d.creditHours) || 0,
      term: (opts.term || "").trim() || null,
      targetGrade: null,
      schedule: validSlots(d.schedule),
    }),

  // Only the fields that differ are changed; colour, term, target, reminders stay.
  update(e, d, changes) {
    const payload = subjectPayload(e);
    for (const c of changes) {
      if (c.key === "schedule") payload.schedule = fillFromSaved(validSlots(d.schedule), e.schedule);
      else if (c.key === "creditHours") payload.creditHours = Number(d.creditHours) || 0;
      else payload[c.key] = String(d[c.key]).trim();
    }
    return subjectAPI.update(e.id, payload);
  },

  remove: (e) => subjectAPI.update(e.id, { ...subjectPayload(e), isArchived: true }),

  Editor: SubjectEditor,
  ReviewExtras: ({ opts, setOpts }) => (
    <Field label="Term for new subjects">
      <Input value={opts.term} onChange={(e) => setOpts({ ...opts, term: e.target.value })} placeholder="e.g. Fall 2026" className="!py-2.5 !px-4 text-sm" />
    </Field>
  ),
};
