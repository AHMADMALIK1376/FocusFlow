import React from "react";
import { Input, Select, Checkbox } from "../../../components/ui";
import { assignmentAPI } from "../../../services/api";
import { parseAssignments } from "../parseAssignments";
import { findSubject, sameText } from "../textParse";

const subjectName = (ctx, id) => (ctx.subjects || []).find((s) => s.id === id)?.name || "";
const cls = "!py-2 !px-3 text-sm";

function AssignmentEditor({ data: d, set, ctx, status }) {
  return (
    <div className="space-y-1.5">
      <Input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" className={`${cls} font-bold`} />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_9.5rem] gap-1.5 items-center">
        <Select value={d.subjectId} onChange={(e) => set("subjectId", e.target.value)} className={cls}>
          <option value="">No subject</option>
          {(ctx.subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input type="date" value={d.dueDate} onChange={(e) => set("dueDate", e.target.value)} title="Due date" className={cls} />
      </div>
      {status === "new" && (
        <label className="inline-flex items-center gap-2 text-xs font-bold text-muted cursor-pointer">
          <Checkbox checked={d.done} onChange={(v) => set("done", v)} size={18} label="Already done" /> Already done (goes in the Done column)
        </label>
      )}
    </div>
  );
}

// Assignment list (Classroom / Moodle / portal) → the Assignments board.
export const assignmentsScan = {
  title: "Scan assignments",
  reviewTitle: "Review assignments",
  decideTitle: "This looks like a new assignment list",
  intro: "Add assignments from Google Classroom, Moodle or your portal. Ones already on your board only change where the due date or subject is different. Nothing is sent to an AI: the text is read on your device.",
  pasteLabel: "Paste your assignment list",
  pasteHint: "Copy the list with titles and due dates and paste it here.",
  pastePlaceholder: "Assignment 1: Linked Lists\nDue Oct 12, 2026",
  emptyError: "Couldn't find any assignments. Make sure the titles are visible, or try pasting the text instead.",
  noun: ["assignment", "assignments"],
  reviewNote: "Screenshots can misread a letter or digit, so check titles and due dates.",
  replaceQuestion: "Replace the assignments on your board with these?",
  replaceExplain: "Assignments that aren't in this list will be deleted, except the ones in your Done column.",
  removeHeading: (n) => `Deleting ${n} assignment${n === 1 ? "" : "s"}`,
  removeButton: (n) => `Delete ${n}`,
  removedWord: "deleted",

  parse: (text, ctx) =>
    parseAssignments(text).map((r) => ({
      subjectId: (r.code && findSubject(ctx.subjects, { code: r.code })?.id) || "",
      title: r.title,
      dueDate: r.dueDate || "",
      done: r.done,
    })),
  existing: (ctx) => ctx.cards || [],

  match(s, e) {
    if (s.subjectId && e.subjectId && s.subjectId !== e.subjectId) return 0;
    return sameText(s.title, e.title) ? 1 : 0;
  },

  fields: (ctx) => [
    { key: "dueDate", label: "Due" },
    { key: "subjectId", label: "Subject", format: (id) => subjectName(ctx, id) || "None" },
  ],

  label: (e) => (e.dueDate ? `${e.title} (due ${e.dueDate})` : e.title),
  name: (d) => d.title || "Untitled assignment",
  isValid: (d) => Boolean(d.title && d.title.trim()),
  invalidHint: () => "Needs a title",
  removable: (e) => e.columnId !== "col-done",

  create: (d) =>
    assignmentAPI.create({
      columnId: d.done ? "col-done" : "col-todo",
      title: d.title.trim(),
      subjectId: d.subjectId || null,
      dueDate: d.dueDate || null,
    }),

  // The server keeps any field it isn't sent, so send only what changed.
  update(e, d, changes) {
    const patch = {};
    for (const c of changes) patch[c.key] = d[c.key];
    return assignmentAPI.update(e.id, patch);
  },

  remove: (e) => assignmentAPI.remove(e.id),
  Editor: AssignmentEditor,
};
