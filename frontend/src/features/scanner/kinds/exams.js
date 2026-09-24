import React from "react";
import { Input, Select } from "../../../components/ui";
import { examAPI } from "../../../services/api";
import { parseDateSheet } from "../parseDateSheet";
import { findSubject, sameText } from "../textParse";

const TYPES = ["Exam", "Quiz", "Test"]; // what a date sheet lists; deadlines are left alone
const isTimed = (x) => TYPES.some((t) => t.toLowerCase() === String(x.type || "").toLowerCase());
const subjectName = (ctx, id) => (ctx.subjects || []).find((s) => s.id === id)?.name || "";
const examTerm = (t) => (/\bmid/i.test(t) ? "mid" : /\bfinal/i.test(t) ? "final" : null);
const cls = "!py-2 !px-3 text-sm";

function ExamEditor({ data: d, set, ctx }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_6.5rem] gap-1.5">
        <Input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" className={`${cls} font-bold`} />
        <Select value={d.type} onChange={(e) => set("type", e.target.value)} className={cls}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_6rem_5.5rem] gap-1.5">
        <Select value={d.subjectId} onChange={(e) => set("subjectId", e.target.value)} className={`${cls} col-span-2 sm:col-span-1`}>
          <option value="">General</option>
          {(ctx.subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input type="date" value={d.date} onChange={(e) => set("date", e.target.value)} className={`${cls} min-w-0`} />
        <Input type="time" value={d.time} onChange={(e) => set("time", e.target.value)} className={`${cls} min-w-0`} />
        <Input type="number" min="1" step="5" value={d.duration} onChange={(e) => set("duration", e.target.value)} placeholder="Min" title="Length in minutes" className={`${cls} min-w-0`} />
      </div>
      <Input value={d.location} onChange={(e) => set("location", e.target.value)} placeholder="Location (e.g. Hall 2)" className={cls} />
    </div>
  );
}

// Exam date sheet → Exams & Deadlines.
export const examsScan = {
  title: "Scan date sheet",
  reviewTitle: "Review exams",
  decideTitle: "This looks like a new date sheet",
  intro: "Add your exams from the date sheet. Exams that are already here only change where the date, time or room is different. Nothing is sent to an AI: the text is read on your device.",
  pasteLabel: "Paste your date sheet",
  pasteHint: "Copy the table from the portal or the PDF and paste it here.",
  pastePlaceholder: "14-10-2026\tMonday\t09:00 - 12:00\tCSC452\tCompiler Construction\tHall 2",
  emptyError: "Couldn't find any exams. Make sure the dates and course names or codes are visible, or try pasting the text instead.",
  noun: ["exam", "exams"],
  reviewNote: "Screenshots can misread a digit, so check dates and times. Times are 24-hour.",
  replaceQuestion: "Replace your current exams with these?",
  replaceExplain: "Upcoming exams, quizzes and tests that aren't in this date sheet will be deleted. Ones you've marked done, and your other deadlines, stay.",
  removeHeading: (n) => `Deleting ${n} exam${n === 1 ? "" : "s"}`,
  removeButton: (n) => `Delete ${n}`,
  removedWord: "deleted",

  parse: (text, ctx) =>
    parseDateSheet(text).map((r) => {
      const s = findSubject(ctx.subjects, { code: r.code, name: r.name });
      const who = s?.name || r.name || r.code || "";
      return {
        subjectId: s?.id || "",
        title: r.label === "Exam" ? `${who} exam` : `${who} – ${r.label}`,
        type: r.type,
        date: r.date || "",
        time: r.time || "",
        duration: r.duration ?? "",
        location: r.location || "",
      };
    }),
  existing: (ctx) => (ctx.exams || []).filter(isTimed),

  match(s, e) {
    if (s.subjectId && e.subjectId && s.subjectId !== e.subjectId) return 0;
    if (sameText(s.title, e.title, 0.8)) return 1;
    const sameSubject = s.subjectId && s.subjectId === e.subjectId;
    if (sameSubject && s.date && s.date === e.date) return 0.9;
    if (sameSubject && examTerm(s.title) && examTerm(s.title) === examTerm(e.title)) return 0.7; // the mid moved
    return 0;
  },

  fields: (ctx) => [
    { key: "subjectId", label: "Subject", format: (id) => subjectName(ctx, id) || "General" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "duration", label: "Length (min)", same: (a, b) => Number(a) === Number(b) },
    { key: "location", label: "Location", same: (a, b) => sameText(a, b) },
  ],

  label: (e) => `${e.title} (${e.date})`,
  name: (d) => d.title || "Untitled exam",
  isValid: (d) => Boolean(d.title && d.title.trim() && d.date),
  invalidHint: (d) => (!d.date ? "Needs a date" : "Needs a title"),
  removable: (e) => !e.isDone,

  create: (d) =>
    examAPI.create({
      subjectId: d.subjectId || null,
      title: d.title.trim(),
      type: d.type,
      date: d.date,
      time: d.time || null,
      duration: Number(d.duration) || null,
      location: (d.location || "").trim() || null,
      notes: null,
    }),

  // The server replaces the whole item, so start from what's saved.
  update(e, d, changes) {
    const payload = {
      subjectId: e.subjectId || null, title: e.title, type: e.type, date: e.date,
      time: e.time || null, duration: e.duration ?? null, location: e.location || null, notes: e.notes || null,
    };
    for (const c of changes) payload[c.key] = c.key === "duration" ? Number(d.duration) || null : d[c.key] || null;
    return examAPI.update(e.id, payload);
  },

  remove: (e) => examAPI.remove(e.id),
  Editor: ExamEditor,
};
