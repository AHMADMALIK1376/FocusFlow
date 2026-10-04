import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, GraduationCap, Clock, BookOpen, CalendarDays, Trash2, ScanText } from "lucide-react";
import { Button, Input, Select, Field, Modal, EmptyState, CardDeleteButton } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import { useSubjects } from "../features/subjects/useSubjects";
import TimetableImportModal from "../features/subjects/TimetableImportModal";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const EMPTY_FORM = { name: "", code: "", color: "#2D4759", instructor: "", creditHours: 3, term: "", targetGrade: "", schedule: [] };

// Every subject already carries its own custom `color` (set via the picker in
// the edit form) — cards use a light pastel TINT of that same color as their
// full background, and a darker SHADE for text/badge, rather than introducing
// a separate auto-assigned palette. Different subjects already have different
// stored colors (see the screenshot's left-border strips), so tinting them
// keeps "each card a different colour" without fighting the existing picker.
function hexToRgb(hex) {
  const h = String(hex || "#2D4759").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16) || 0x2d4759;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixWhite = (rgb, t) => rgb.map((c) => Math.round(c + (255 - c) * t));
const mixBlack = (rgb, t) => rgb.map((c) => Math.round(c * (1 - t)));
const rgbCss = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
function subjectPalette(hex) {
  const rgb = hexToRgb(hex);
  return {
    cardBg: rgbCss(mixWhite(rgb, 0.86)),
    badgeBg: rgbCss(mixWhite(rgb, 0.7)),
    deep: rgbCss(mixBlack(rgb, 0.25)),
  };
}

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
  const [importOpen, setImportOpen] = useState(false);

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
        <Button variant="soft" onClick={() => setImportOpen(true)} className="gap-1.5"><ScanText size={16} /> Import timetable</Button>
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
        <Panel>
          <EmptyState icon="📚" title="No subjects yet" description="Import your timetable from a screenshot, or add courses one by one" />
          <div className="flex justify-center pb-6">
            <Button variant="primary" onClick={() => setImportOpen(true)} className="gap-1.5"><ScanText size={16} /> Import timetable</Button>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {subjects.map((s) => {
            const pal = subjectPalette(s.color);
            return (
              <div
                key={s.id}
                className="relative rounded-token-lg shadow-neu p-4 pb-9 transition-transform hover:-translate-y-0.5"
                style={{ background: pal.cardBg }}
              >
                <button type="button" onClick={() => navigate(`/subjects/${s.id}`)} className="min-w-0 text-left block w-full pr-8">
                  {s.code && (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                      style={{ background: pal.badgeBg, color: pal.deep }}
                    >
                      {s.code}
                    </span>
                  )}
                  <h3 className="font-black text-ink text-base mt-1.5 truncate">{s.name}</h3>
                  {s.instructor && <p className="text-xs text-ink/60 truncate">{s.instructor}</p>}
                  <p className="text-xs text-ink/70 mt-2.5 truncate">{scheduleSummary(s.schedule)}</p>
                  {s.targetGrade && <p className="text-xs font-bold mt-1" style={{ color: pal.deep }}>Target {s.targetGrade}</p>}
                </button>

                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-black/10">
                  <span className="text-xs font-bold text-ink/70">{s.creditHours || 0} cr</span>
                  {s.term && <span className="text-xs text-ink/60">{s.term}</span>}
                </div>

                <button
                  onClick={() => openEdit(s)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-black/10 transition-colors"
                  title="Edit subject"
                >
                  <Pencil size={15} />
                </button>
                <CardDeleteButton onClick={() => onDelete(s)} ghost className="absolute bottom-2.5 right-2.5" />
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit subject" : "Add subject"}
        maxWidthClassName="max-w-md"
        noScrollbar
        showClose
        className="p-5"
      >
        <div className="space-y-3">
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
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-ink">Class schedule</span>
              <Button variant="soft" size="sm" onClick={addSlot} className="gap-1"><Plus size={14} /> Add slot</Button>
            </div>
            {form.schedule.length === 0 ? (
              <p className="text-xs text-muted">No class times yet. Add a slot for each weekly session.</p>
            ) : (
              <div className="space-y-1.5">
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

      <TimetableImportModal open={importOpen} onClose={() => setImportOpen(false)} existing={subjects} onImported={refresh} />
    </PageShell>
  );
}
