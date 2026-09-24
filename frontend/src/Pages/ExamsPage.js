import React, { useMemo, useState } from "react";
import { Plus, Pencil, AlarmClock, CalendarClock, CalendarX, CheckCircle2, ScanText } from "lucide-react";
import { Button, Input, Textarea, Select, Field, Modal, EmptyState, DeleteButton, Badge, Checkbox, useToast } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import { useExams } from "../features/exams/useExams";
import { useSubjects } from "../features/subjects/useSubjects";
import { groupExams, countdownLabel } from "../features/exams/examsLogic";
import DeadlineSkyline from "../components/charts/DeadlineSkyline";
import ScanImportModal from "../features/scanner/ScanImportModal";
import { examsScan } from "../features/scanner/kinds/exams";

const TYPES = ["Exam", "Quiz", "Test", "Assignment", "Project", "Submission", "Deadline"];
const TIMED = ["Exam", "Quiz", "Test"]; // things you sit → have a length; marks asked afterwards
const EMPTY = { title: "", type: "Exam", subjectId: "", date: "", time: "", duration: "", location: "", notes: "" };
const fieldCls = "!py-2.5 !px-4 text-sm";
const SECTIONS = [
  { key: "overdue", label: "Overdue", tone: "focus" },
  { key: "today", label: "Today", tone: "brand" },
  { key: "week", label: "This week", tone: "info" },
  { key: "later", label: "Later", tone: "muted" },
  { key: "done", label: "Done", tone: "success" },
];

export default function ExamsPage() {
  const { exams, loading, refresh, create, update, toggle, remove } = useExams();
  const { subjects } = useSubjects();
  const { toast } = useToast();
  const [scanOpen, setScanOpen] = useState(false);
  const scanCtx = useMemo(() => ({ subjects, exams }), [subjects, exams]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const g = groupExams(exams);
  const upcomingCount = g.overdue.length + g.today.length + g.week.length + g.later.length;
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() { setEditId(null); setForm(EMPTY); setOpen(true); }
  function openEdit(x) {
    setEditId(x.id);
    setForm({ title: x.title || "", type: x.type || "Exam", subjectId: x.subjectId || "", date: x.date || "", time: x.time || "", duration: x.duration ?? "", location: x.location || "", notes: x.notes || "" });
    setOpen(true);
  }
  async function save() {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        subjectId: form.subjectId || null, title: form.title.trim(), type: form.type, date: form.date, time: form.time || null,
        duration: TIMED.includes(form.type) && Number(form.duration) > 0 ? Number(form.duration) : null,
        location: form.location || null, notes: form.notes || null,
      };
      if (editId) await update(editId, payload); else await create(payload);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  async function onDelete(x) { if (window.confirm(`Delete "${x.title}"?`)) await remove(x.id); }

  return (
    <PageShell>
      <PageHeader title="Exams & Deadlines" subtitle="Everything with a due date — sorted by what's next.">
        <Button variant="primary" onClick={() => setScanOpen(true)} className="gap-1.5"><ScanText size={16} /> Scan date sheet</Button>
        <Button variant="primary" onClick={openAdd} className="gap-1.5"><Plus size={16} /> Add</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile tone="coral" icon={<CalendarClock size={18} />} label="Upcoming" value={upcomingCount} sub="Not done" />
        <StatTile tone="plain" icon={<AlarmClock size={18} />} label="This week" value={g.today.length + g.week.length} sub="Next 7 days" />
        <StatTile tone="sage" icon={<CalendarX size={18} />} label="Overdue" value={g.overdue.length} sub="Past due" />
        <StatTile tone="plain" icon={<CheckCircle2 size={18} />} label="Done" value={g.done.length} sub="Completed" />
      </div>

      {exams.length > 0 && (
        <Panel className="mb-6">
          <h2 className="text-base font-black text-ink uppercase tracking-wider mb-1">What's coming up</h2>
          <p className="text-xs text-muted mb-2">Each tower is a day; every block is an exam, quiz, test, project or submission.</p>
          <DeadlineSkyline items={exams} />
        </Panel>
      )}

      {loading ? (
        <Panel><p className="text-sm text-muted py-8 text-center">Loading…</p></Panel>
      ) : exams.length === 0 ? (
        <Panel><EmptyState icon="⏰" title="Nothing scheduled" description="Add an exam, quiz or deadline to get started" /></Panel>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((sec) => (g[sec.key].length === 0 ? null : (
            <div key={sec.key}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-sm font-black uppercase tracking-wider ${sec.key === "overdue" ? "text-focus" : "text-ink"}`}>{sec.label}</h3>
                <Badge tone={sec.tone}>{g[sec.key].length}</Badge>
              </div>
              <Panel className="!p-0 overflow-hidden">
                <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
                  {g[sec.key].map((x) => (
                    <li key={x.id} className="flex items-center gap-3 px-4 py-3">
                      <Checkbox checked={x.isDone} size={22} onChange={() => toggle(x.id)} />
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: x.subjectColor || "rgb(var(--ink) / 0.25)" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm truncate ${x.isDone ? "line-through text-muted" : "text-ink"}`}>{x.title}</span>
                          {x.type && <Badge tone="muted">{x.type}</Badge>}
                        </div>
                        <p className="text-xs text-muted truncate">{x.subjectName || "General"}{x.location ? ` · ${x.location}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${sec.key === "overdue" ? "text-focus" : "text-ink"}`}>{x.isDone ? "Done" : countdownLabel(x.date)}</p>
                        <p className="text-[11px] text-muted">{x.date}{x.time ? ` · ${x.time}` : ""}</p>
                      </div>
                      <button onClick={() => openEdit(x)} className="p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand/10 transition-colors" title="Edit"><Pencil size={15} /></button>
                      <DeleteButton onClick={() => onDelete(x)} title="Delete" />
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit item" : "Add exam or deadline"} showClose noScrollbar className="p-5">
        <div className="space-y-2.5">
          <Field label="Title"><Input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="e.g. AI Quiz 1" autoFocus className={fieldCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={form.type} onChange={(e) => setF("type", e.target.value)} className={fieldCls}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
            <Field label="Subject"><Select value={form.subjectId} onChange={(e) => setF("subjectId", e.target.value)} className={fieldCls}><option value="">General</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          </div>
          <div className={`grid gap-3 ${TIMED.includes(form.type) ? "grid-cols-3" : "grid-cols-2"}`}>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)} className={fieldCls} /></Field>
            <Field label={TIMED.includes(form.type) ? "Starts" : "Due time"}><Input type="time" value={form.time} onChange={(e) => setF("time", e.target.value)} className={fieldCls} /></Field>
            {TIMED.includes(form.type) && (
              <Field label="Length (min)"><Input type="number" min="1" step="5" value={form.duration} onChange={(e) => setF("duration", e.target.value)} placeholder="60" className={fieldCls} /></Field>
            )}
          </div>
          <Field label="Location"><Input value={form.location} onChange={(e) => setF("location", e.target.value)} placeholder="e.g. Hall A" className={fieldCls} /></Field>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Optional" className="!py-2.5 !px-4 text-sm" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving || !form.title.trim() || !form.date}>{saving ? "Saving…" : editId ? "Save" : "Add"}</Button>
          </div>
        </div>
      </Modal>

      <ScanImportModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        kind={examsScan}
        ctx={scanCtx}
        onDone={async (summary) => { await refresh(); if (summary) toast(summary, { tone: "success" }); }}
      />
    </PageShell>
  );
}
