import React, { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button, Input, Select, Field, Modal, EmptyState, DeleteButton, Badge } from "../ui";
import { Panel } from "../dashboard/DashKit";
import { useGrades } from "../../features/grades/useGrades";
import { subjectGrade } from "../../features/grades/gpa";

const CATEGORIES = ["Quiz", "Assignment", "Midterm", "Final", "Project", "Other"];
const EMPTY = { title: "", category: "Quiz", score: "", maxScore: "", weight: "", gradedDate: "" };

export default function GradesPanel({ subjectId }) {
  const { grades, loading, create, update, remove } = useGrades(subjectId);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const g = subjectGrade(grades);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() { setEditId(null); setForm(EMPTY); setOpen(true); }
  function openEdit(x) {
    setEditId(x.id);
    setForm({ title: x.title || "", category: x.category || "Other", score: x.score ?? "", maxScore: x.maxScore ?? "", weight: x.weight ?? "", gradedDate: x.gradedDate || "" });
    setOpen(true);
  }
  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        subjectId,
        title: form.title.trim(),
        category: form.category,
        score: form.score === "" ? null : Number(form.score),
        maxScore: form.maxScore === "" ? null : Number(form.maxScore),
        weight: form.weight === "" ? 0 : Number(form.weight),
        gradedDate: form.gradedDate || null,
      };
      if (editId) await update(editId, payload); else await create(payload);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  async function onDelete(x) {
    if (!window.confirm(`Delete "${x.title}"?`)) return;
    await remove(x.id);
  }

  return (
    <Panel
      title="Grades"
      className="mb-6"
      right={
        <div className="flex items-center gap-2">
          {g ? (
            <Badge tone={g.points >= 3 ? "success" : g.points >= 2 ? "info" : "focus"}>{g.percent}% · {g.letter}</Badge>
          ) : (
            <Badge tone="muted">—</Badge>
          )}
          <Button size="sm" variant="primary" onClick={openAdd} className="gap-1"><Plus size={14} /> Add</Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted py-4 text-center">Loading grades…</p>
      ) : grades.length === 0 ? (
        <EmptyState icon="📊" title="No grades yet" description="Add a quiz, assignment or exam score" />
      ) : (
        <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
          {grades.map((x) => {
            const pct = x.maxScore > 0 ? Math.round((x.score / x.maxScore) * 1000) / 10 : null;
            return (
              <li key={x.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-sm truncate">{x.title}</span>
                    {x.category && <Badge tone="muted">{x.category}</Badge>}
                  </div>
                  <p className="text-xs text-muted">
                    {x.score ?? "—"}/{x.maxScore ?? "—"}{pct != null ? ` · ${pct}%` : ""}{x.weight ? ` · wt ${x.weight}%` : ""}
                  </p>
                </div>
                <button onClick={() => openEdit(x)} className="p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand/10 transition-colors" title="Edit grade"><Pencil size={15} /></button>
                <DeleteButton onClick={() => onDelete(x)} title="Delete grade" />
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit grade" : "Add grade"}>
        <div className="space-y-4">
          <Field label="Title"><Input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="e.g. Quiz 1" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setF("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Weight (%)"><Input type="number" min="0" value={form.weight} onChange={(e) => setF("weight", e.target.value)} placeholder="20" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Score"><Input type="number" min="0" step="0.5" value={form.score} onChange={(e) => setF("score", e.target.value)} placeholder="18" /></Field>
            <Field label="Out of"><Input type="number" min="0" step="0.5" value={form.maxScore} onChange={(e) => setF("maxScore", e.target.value)} placeholder="20" /></Field>
          </div>
          <Field label="Date"><Input type="date" value={form.gradedDate} onChange={(e) => setF("gradedDate", e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving || !form.title.trim()}>{saving ? "Saving…" : editId ? "Save" : "Add grade"}</Button>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}
