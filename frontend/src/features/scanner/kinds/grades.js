import React from "react";
import { Input, Select, Field } from "../../../components/ui";
import { gradeAPI } from "../../../services/api";
import { scanMarks } from "../parseMarks";
import { findSubject, sameText } from "../textParse";

const CATEGORIES = ["Quiz", "Assignment", "Midterm", "Final", "Project", "Other"];
const subjectName = (ctx, id) => (ctx.subjects || []).find((s) => s.id === id)?.name || "";
const sameNumber = (a, b) => a != null && a !== "" && Number(a) === Number(b);
const cls = "!py-2 !px-3 text-sm";

function SubjectOptions({ ctx }) {
  return (ctx.subjects || []).map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ""}{s.name}</option>);
}

function GradeEditor({ data: d, set, ctx }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_7.5rem] gap-1.5">
        <Input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Title (e.g. Quiz 1)" className={`${cls} font-bold`} />
        <Select value={d.category} onChange={(e) => set("category", e.target.value)} className={cls}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-[1fr_4.25rem_4.25rem_4.25rem] gap-1.5">
        <Select value={d.subjectId} onChange={(e) => set("subjectId", e.target.value)} className={`${cls} col-span-3 sm:col-span-1`}>
          <option value="">Pick a subject…</option>
          <SubjectOptions ctx={ctx} />
        </Select>
        <Input type="number" min="0" step="0.5" value={d.score ?? ""} onChange={(e) => set("score", e.target.value)} placeholder="Score" title="Score" className="!py-2 !px-2 text-sm" />
        <Input type="number" min="0" step="0.5" value={d.maxScore ?? ""} onChange={(e) => set("maxScore", e.target.value)} placeholder="Out of" title="Out of" className="!py-2 !px-2 text-sm" />
        <Input type="number" min="0" value={d.weight ?? ""} onChange={(e) => set("weight", e.target.value)} placeholder="Wt %" title="Weight (%)" className="!py-2 !px-2 text-sm" />
      </div>
    </div>
  );
}

// Marks page → grade items on each subject (counted in the CGPA).
export const gradesScan = {
  title: "Scan marks",
  reviewTitle: "Review marks",
  decideTitle: "These marks look different",
  intro: "Add quiz, assignment and exam marks from your portal. Marks that are already here only change where the scan shows something different. Nothing is sent to an AI: the text is read on your device.",
  pasteLabel: "Paste your marks table",
  pasteHint: "Select the marks table on the portal, copy it, and paste it here.",
  pastePlaceholder: "Quiz 1\t8/10\t5%\nMid Term\t22/30\t25%",
  emptyError: "Couldn't find any marks. Make sure each row shows a name and marks like 8/10, or try pasting the text instead.",
  noun: ["mark", "marks"],
  reviewNote: "Screenshots can misread a digit, so check each score.",
  replaceQuestion: "Replace the marks you have for these subjects?",
  replaceExplain: "Marks you've saved for these subjects that aren't in this scan will be deleted. Other subjects aren't touched.",
  removeHeading: (n) => `Deleting ${n} old mark${n === 1 ? "" : "s"}`,
  removeButton: (n) => `Delete ${n}`,
  removedWord: "deleted",
  defaultOptions: { subjectId: "" },

  parse(text, ctx, opts) {
    const { rows, unread } = scanMarks(text);
    return Object.assign(rows.map((r) => {
      const found = r.code || r.course ? findSubject(ctx.subjects, { code: r.code, name: r.course }) : null;
      return {
        subjectId: opts.subjectId || found?.id || "", // a subject picked before scanning wins
        title: r.title,
        category: r.category,
        score: r.score,
        maxScore: r.maxScore,
        weight: r.weight ?? "",
      };
    }), { unread });
  },
  // Only compare with the subjects this scan is about.
  existing(ctx, datas) {
    const ids = new Set(datas.map((d) => d.subjectId).filter(Boolean));
    return (ctx.grades || []).filter((g) => ids.has(g.subjectId));
  },

  match: (s, e) => (s.subjectId && s.subjectId === e.subjectId && sameText(s.title, e.title) ? 1 : 0),

  fields: () => [
    { key: "score", label: "Score", same: sameNumber },
    { key: "maxScore", label: "Out of", same: sameNumber },
    { key: "weight", label: "Weight %", same: sameNumber },
  ],

  label: (e, ctx) => `${subjectName(ctx, e.subjectId) || "Subject"}: ${e.title}`,
  name: (d, ctx) => (d.subjectId ? `${d.title} · ${subjectName(ctx, d.subjectId)}` : d.title || "Untitled"),
  isValid: (d) => Boolean(d.subjectId && d.title && d.title.trim() && d.score !== "" && d.score != null && Number(d.maxScore) > 0),
  invalidHint: (d) => (!d.subjectId ? "Pick a subject for this mark" : "Needs a score and a total"),

  create: (d) =>
    gradeAPI.create({
      subjectId: d.subjectId,
      title: d.title.trim(),
      category: d.category,
      score: Number(d.score),
      maxScore: Number(d.maxScore),
      weight: d.weight === "" || d.weight == null ? 0 : Number(d.weight),
      gradedDate: null,
    }),

  // The server replaces the whole grade, so start from what's saved.
  update(e, d, changes) {
    const payload = { title: e.title, category: e.category, score: e.score, maxScore: e.maxScore, weight: e.weight, gradedDate: e.gradedDate || null };
    for (const c of changes) payload[c.key] = Number(d[c.key]);
    return gradeAPI.update(e.id, payload);
  },

  remove: (e) => gradeAPI.remove(e.id),
  Editor: GradeEditor,

  InputExtras: ({ opts, setOpts, ctx }) => (
    <Field label="Which subject are these marks for?" hint="Leave it on 'detect' if the screenshot shows course codes or names.">
      <Select value={opts.subjectId} onChange={(e) => setOpts({ ...opts, subjectId: e.target.value })} className="!py-2.5 !px-4 text-sm">
        <option value="">Detect from the screenshot</option>
        <SubjectOptions ctx={ctx} />
      </Select>
    </Field>
  ),
  ReviewExtras({ datas, updateAll, ctx }) {
    const missing = datas.filter((d) => !d.subjectId).length;
    if (!missing) return null;
    return (
      <Field label={`Subject for the ${missing} mark${missing === 1 ? "" : "s"} without one`}>
        <Select
          value=""
          onChange={(e) => { const id = e.target.value; if (id) updateAll((d) => (d.subjectId ? d : { ...d, subjectId: id })); }}
          className="!py-2.5 !px-4 text-sm"
        >
          <option value="">Pick a subject…</option>
          <SubjectOptions ctx={ctx} />
        </Select>
      </Field>
    );
  },
};
