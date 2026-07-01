import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Select, Field, Modal, EmptyState, DeleteButton, Badge, Checkbox } from "../ui";
import { Panel } from "../dashboard/DashKit";
import { useExams } from "../../features/exams/useExams";
import { countdownLabel } from "../../features/exams/examsLogic";

const TYPES = ["Exam", "Quiz", "Deadline", "Submission", "Assignment"];
const EMPTY = { title: "", type: "Exam", date: "", time: "", location: "" };

export default function ExamsPanel({ subjectId }) {
  const { exams, loading, create, toggle, remove } = useExams(subjectId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const items = exams.filter((e) => !e.isDone).slice(0, 8);

  async function save() {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await create({ subjectId, title: form.title.trim(), type: form.type, date: form.date, time: form.time || null, location: form.location || null });
      setOpen(false);
      setForm(EMPTY);
    } finally {
      setSaving(false);
    }
  }
  async function onDelete(x) { if (window.confirm(`Delete "${x.title}"?`)) await remove(x.id); }

  return (
    <Panel
      title="Exams & Deadlines"
      className="mb-6"
      right={<Button size="sm" variant="primary" onClick={() => { setForm(EMPTY); setOpen(true); }} className="gap-1"><Plus size={14} /> Add</Button>}
    >
      {loading ? (
        <p className="text-sm text-muted py-4 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState icon="⏰" title="Nothing upcoming" description="Add an exam, quiz or deadline for this subject" />
      ) : (
        <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
          {items.map((x) => (
            <li key={x.id} className="flex items-center gap-3 py-2.5">
              <Checkbox checked={x.isDone} size={20} onChange={() => toggle(x.id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink text-sm truncate">{x.title}</span>
                  {x.type && <Badge tone="muted">{x.type}</Badge>}
                </div>
                <p className="text-xs text-muted">{x.date}{x.time ? ` · ${x.time}` : ""}{x.location ? ` · ${x.location}` : ""}</p>
              </div>
              <span className="text-xs font-bold text-ink shrink-0">{countdownLabel(x.date)}</span>
              <DeleteButton onClick={() => onDelete(x)} title="Delete" />
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add exam or deadline">
        <div className="space-y-4">
          <Field label="Title"><Input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="e.g. Final Exam" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={form.type} onChange={(e) => setF("type", e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time"><Input type="time" value={form.time} onChange={(e) => setF("time", e.target.value)} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setF("location", e.target.value)} placeholder="Hall A" /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving || !form.title.trim() || !form.date}>{saving ? "Saving…" : "Add"}</Button>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}
