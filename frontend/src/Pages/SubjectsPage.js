import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, GraduationCap, Clock, BookOpen, CalendarDays, Trash2 } from "lucide-react";
import { Button, Input, Select, Field, Modal, EmptyState, DeleteButton, Badge } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import { useSubjects } from "../features/subjects/useSubjects";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const EMPTY_FORM = { name: "", code: "", color: "#2D4759", instructor: "", creditHours: 3, term: "", targetGrade: "", schedule: [] };

function scheduleSummary(schedule) {
  if (!schedule || !schedule.length) return "No class times set";
  return schedule.map((s) => `${DAY_SHORT[s.day] || s.day}${s.start ? " " + s.start : ""}`).join(" · ");
}
function mostCommon(arr) {
  if (!arr.length) return null;
  const counts = {};
  let best = arr[0];
  for (const x of arr) {
    counts[x] = (counts[x] || 0) + 1;
    if (counts[x] > (counts[best] || 0)) best = x;
  }
  return best;
}

export default function SubjectsPage() {
  const navigate = useNavigate();
  const { subjects, loading, error, refresh, create, update, remove } = useSubjects();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const totalCredits = subjects.reduce((s, x) => s + (Number(x.creditHours) || 0), 0);
  const totalSlots = subjects.reduce((s, x) => s + (x.schedule?.length || 0), 0);
  const term = mostCommon(subjects.map((s) => s.term).filter(Boolean));

  function openAdd() { setEditId(null); setForm(EMPTY_FORM); setOpen(true); }
  function openEdit(s) {
    setEditId(s.id);
    setForm({
      name: s.name || "", code: s.code || "", color: s.color || "#2D4759",
      instructor: s.instructor || "", creditHours: s.creditHours ?? 3,
      term: s.term || "", targetGrade: s.targetGrade || "",
      schedule: (s.schedule || []).map((x) => ({ day: x.day || "Monday", start: x.start || "", end: x.end || "", room: x.room || "" })),
    });
    setOpen(true);
  }
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addSlot = () => setForm((f) => ({ ...f, schedule: [...f.schedule, { day: "Monday", start: "", end: "", room: "" }] }));
  const setSlot = (i, k, v) => setForm((f) => ({ ...f, schedule: f.schedule.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) }));
  const removeSlot = (i) => setForm((f) => ({ ...f, schedule: f.schedule.filter((_, idx) => idx !== i) }));

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), code: form.code.trim() || null, color: form.color,
        instructor: form.instructor.trim() || null, creditHours: Number(form.creditHours) || 0,
        term: form.term.trim() || null, targetGrade: form.targetGrade.trim() || null,
        schedule: form.schedule.filter((s) => s.day),
      };
      if (editId) await update(editId, payload); else await create(payload);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(s) {
    if (!window.confirm(`Delete "${s.name}"? This removes its schedule too.`)) return;
    await remove(s.id);
  }

  return (
    <PageShell>
      <PageHeader title="Subjects" subtitle="Your courses this term — schedule, grades, attendance and more in one place.">
        <Button variant="primary" onClick={openAdd} className="gap-1.5"><Plus size={16} /> Add subject</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile primary icon={<GraduationCap size={18} />} label="Subjects" value={subjects.length} sub="This term" />
        <StatTile icon={<BookOpen size={18} />} label="Credit hours" value={totalCredits} sub="Total load" />
        <StatTile icon={<Clock size={18} />} label="Classes / week" value={totalSlots} sub="Scheduled slots" />
        <StatTile icon={<CalendarDays size={18} />} label="Term" value={term || "—"} sub="Active" />
      </div>

      {loading ? (
        <Panel><p className="text-sm text-muted py-8 text-center">Loading subjects…</p></Panel>
      ) : error ? (
        <Panel><div className="py-8 text-center"><p className="text-focus text-sm mb-3">{error}</p><Button variant="soft" onClick={refresh}>Retry</Button></div></Panel>
      ) : subjects.length === 0 ? (
        <Panel><EmptyState icon="📚" title="No subjects yet" description="Add your first course to get started" /></Panel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <div key={s.id} className="bg-surface rounded-token-lg shadow-neu overflow-hidden flex">
              <div className="w-1.5 shrink-0" style={{ background: s.color || "rgb(var(--brand))" }} />
              <div className="p-5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => navigate(`/subjects/${s.id}`)} className="min-w-0 text-left">
                    {s.code && <Badge tone="brand">{s.code}</Badge>}
                    <h3 className="font-black text-ink text-lg mt-1.5 truncate">{s.name}</h3>
                    {s.instructor && <p className="text-xs text-muted truncate">{s.instructor}</p>}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand/10 transition-colors" title="Edit subject"><Pencil size={15} /></button>
                    <DeleteButton onClick={() => onDelete(s)} title="Delete subject" />
                  </div>
                </div>
                <p className="text-xs text-muted mt-3 truncate">{scheduleSummary(s.schedule)}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgb(var(--ink)/0.07)]">
                  <span className="text-xs font-bold text-muted">{s.creditHours || 0} cr</span>
                  {s.targetGrade ? <span className="text-xs text-muted">Target {s.targetGrade}</span> : s.term ? <span className="text-xs text-muted">{s.term}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit subject" : "Add subject"}>
        <div className="space-y-4">
          <Field label="Subject name">
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Data Structures" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><Input value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="CS201" /></Field>
            <Field label="Credit hours"><Input type="number" min="0" step="0.5" value={form.creditHours} onChange={(e) => setField("creditHours", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Instructor"><Input value={form.instructor} onChange={(e) => setField("instructor", e.target.value)} placeholder="Dr. Khan" /></Field>
            <Field label="Term"><Input value={form.term} onChange={(e) => setField("term", e.target.value)} placeholder="Fall 2026" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target grade"><Input value={form.targetGrade} onChange={(e) => setField("targetGrade", e.target.value)} placeholder="A" /></Field>
            <Field label="Colour">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setField("color", e.target.value)} className="w-12 h-11 rounded-token-md border-0 bg-transparent cursor-pointer" />
                <span className="text-xs text-muted font-mono">{form.color}</span>
              </div>
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-ink">Class schedule</span>
              <Button variant="soft" size="sm" onClick={addSlot} className="gap-1"><Plus size={14} /> Add slot</Button>
            </div>
            {form.schedule.length === 0 ? (
              <p className="text-xs text-muted">No class times yet. Add a slot for each weekly session.</p>
            ) : (
              <div className="space-y-2">
                {form.schedule.map((slot, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_1fr_auto] gap-2 items-center">
                    <Select value={slot.day} onChange={(e) => setSlot(i, "day", e.target.value)} className="!py-2 !px-3 text-sm">
                      {DAYS.map((d) => <option key={d} value={d}>{DAY_SHORT[d]}</option>)}
                    </Select>
                    <Input type="time" value={slot.start} onChange={(e) => setSlot(i, "start", e.target.value)} className="!py-2 !px-2 text-sm" />
                    <Input type="time" value={slot.end} onChange={(e) => setSlot(i, "end", e.target.value)} className="!py-2 !px-2 text-sm" />
                    <Input value={slot.room} onChange={(e) => setSlot(i, "room", e.target.value)} placeholder="Room" className="!py-2 !px-3 text-sm" />
                    <button onClick={() => removeSlot(i)} className="p-1.5 text-muted hover:text-focus" title="Remove slot"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : editId ? "Save changes" : "Add subject"}</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
