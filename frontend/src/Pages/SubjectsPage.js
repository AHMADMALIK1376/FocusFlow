import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, GraduationCap, Trash2, ScanText, RotateCcw, ChevronDown } from "lucide-react";
import { Button, Input, Select, Field, Modal, EmptyState, DeleteButton, useToast } from "../components/ui";
import { PageShell, PageHeader, Panel } from "../components/dashboard/DashKit";
import { useSubjects } from "../features/subjects/useSubjects";
import TimetableImportModal from "../features/subjects/TimetableImportModal";
import SubjectTable from "../components/subjects/SubjectTable";
import WeekBeads from "../components/subjects/WeekBeads";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const EMPTY_FORM = { name: "", code: "", color: "#E86562", instructor: "", creditHours: 3, term: "", targetGrade: "", remindBefore: "", attendanceAfter: "", schedule: [] };

// Per-subject reminder times ("" = use the default from Settings → Reminders).
const REMIND_BEFORE = [["", "Default (Settings)"], [0, "When it starts"], [5, "5 min before"], [10, "10 min before"], [15, "15 min before"], [30, "30 min before"], [45, "45 min before"], [60, "1 hour before"], [90, "1½ hours before"], [120, "2 hours before"]];
const ASK_AFTER = [["", "Default (Settings)"], [0, "When it ends"], [5, "5 min after"], [10, "10 min after"], [15, "15 min after"], [30, "30 min after"], [60, "1 hour after"]];
const fieldCls = "!py-2 !px-3.5 text-sm";

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
  const { subjects, archived, loading, error, refresh, create, update, remove, setArchived } = useSubjects();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const term = mostCommon(subjects.map((s) => s.term).filter(Boolean));

  function openAdd() { setEditId(null); setForm(EMPTY_FORM); setOpen(true); }
  function openEdit(s) {
    setEditId(s.id);
    setForm({
      name: s.name || "", code: s.code || "", color: s.color || "#E86562",
      instructor: s.instructor || "", creditHours: s.creditHours ?? 3,
      term: s.term || "", targetGrade: s.targetGrade || "",
      remindBefore: s.remindBefore ?? "", attendanceAfter: s.attendanceAfter ?? "",
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
        remindBefore: form.remindBefore === "" ? null : Number(form.remindBefore),
        attendanceAfter: form.attendanceAfter === "" ? null : Number(form.attendanceAfter),
        schedule: form.schedule.filter((s) => s.day),
      };
      if (editId) await update(editId, payload); else await create(payload);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(s) {
    if (!window.confirm(`Delete "${s.name}" for good? Its class times, grades and attendance are deleted too.`)) return;
    await remove(s.id);
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <PageHeader title="Subjects" subtitle={`Your courses this term${term ? ` (${term})` : ""} — schedule, grades, attendance and more in one place.`}>
            <Button variant="primary" onClick={() => setImportOpen(true)} className="gap-1.5"><ScanText size={16} /> Import timetable</Button>
            <Button variant="primary" onClick={openAdd} className="gap-1.5"><Plus size={16} /> Add subject</Button>
          </PageHeader>
        </div>
        {!loading && !error && <WeekBeads subjects={subjects} />}
      </div>

      {loading ? (
        <Panel><p className="text-sm text-muted py-8 text-center">Loading subjects…</p></Panel>
      ) : error ? (
        <Panel><div className="py-8 text-center"><p className="text-focus text-sm mb-3">{error}</p><Button variant="soft" onClick={refresh}>Retry</Button></div></Panel>
      ) : subjects.length === 0 ? (
        <Panel>
          <EmptyState icon={GraduationCap} title="No subjects yet" description="Import your timetable from a screenshot, or add courses one by one" />
          <div className="flex justify-center pb-6">
            <Button variant="primary" onClick={() => setImportOpen(true)} className="gap-1.5"><ScanText size={16} /> Import timetable</Button>
          </div>
        </Panel>
      ) : (
        <SubjectTable subjects={subjects} onOpen={(x) => navigate(`/subjects/${x.id}`)} onEdit={openEdit} onDelete={onDelete} />
      )}

      {archived.length > 0 && (
        <Panel className="mt-6">
          <button type="button" onClick={() => setShowPast((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">Past terms ({archived.length})</h3>
              <p className="text-xs text-muted mt-0.5">Subjects from earlier timetables. Their grades and attendance are kept and still count toward your CGPA.</p>
            </div>
            <ChevronDown size={18} className={`text-muted shrink-0 transition-transform ${showPast ? "rotate-180" : ""}`} />
          </button>
          {showPast && (
            <ul className="divide-y divide-[rgb(var(--ink)/0.07)] mt-3">
              {archived.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color || "#E86562" }} />
                  <button type="button" onClick={() => navigate(`/subjects/${s.id}`)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-ink truncate">{s.code ? `${s.code} · ` : ""}{s.name}</p>
                    <p className="text-xs text-muted truncate">{[s.term, s.instructor].filter(Boolean).join(" · ") || "No term set"}</p>
                  </button>
                  <Button size="sm" variant="soft" onClick={() => setArchived(s, false)} title="Restore to this term" className="gap-1 shrink-0">
                    <RotateCcw size={14} /> <span className="hidden sm:inline">Restore</span>
                  </Button>
                  <DeleteButton onClick={() => onDelete(s)} title="Delete for good" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit subject" : "Add subject"}
        maxWidthClassName="max-w-2xl"
        noScrollbar
        showClose
        className="p-5"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_7rem_auto] gap-3">
            <Field label="Subject name">
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Data Structures" autoFocus className={fieldCls} />
            </Field>
            <Field label="Code"><Input value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="CS201" className={fieldCls} /></Field>
            <Field label="Colour">
              <input type="color" value={form.color} onChange={(e) => setField("color", e.target.value)} className="w-11 h-[38px] rounded-token-md border-0 bg-transparent cursor-pointer" title={form.color} />
            </Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-[2fr_1.3fr_1fr_1fr] gap-3">
            <Field label="Instructor"><Input value={form.instructor} onChange={(e) => setField("instructor", e.target.value)} placeholder="Dr. Khan" className={fieldCls} /></Field>
            <Field label="Term"><Input value={form.term} onChange={(e) => setField("term", e.target.value)} placeholder="Fall 2026" className={fieldCls} /></Field>
            <Field label="Credits"><Input type="number" min="0" step="0.5" value={form.creditHours} onChange={(e) => setField("creditHours", e.target.value)} className={fieldCls} /></Field>
            <Field label="Target"><Input value={form.targetGrade} onChange={(e) => setField("targetGrade", e.target.value)} placeholder="A" className={fieldCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Remind me">
              <Select value={form.remindBefore} onChange={(e) => setField("remindBefore", e.target.value)} className={fieldCls}>
                {REMIND_BEFORE.map(([v, l]) => <option key={l} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Ask “Did you attend?”">
              <Select value={form.attendanceAfter} onChange={(e) => setField("attendanceAfter", e.target.value)} className={fieldCls}>
                {ASK_AFTER.map(([v, l]) => <option key={l} value={v}>{l}</option>)}
              </Select>
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
                  <div key={i} className="grid grid-cols-[4.5rem_1fr_1fr_1fr_auto] gap-1.5 items-center">
                    <Select value={slot.day} onChange={(e) => setSlot(i, "day", e.target.value)} className="!py-2 !px-2.5 text-sm">
                      {DAYS.map((d) => <option key={d} value={d}>{DAY_SHORT[d]}</option>)}
                    </Select>
                    <Input type="time" value={slot.start} onChange={(e) => setSlot(i, "start", e.target.value)} className="!py-2 !px-2 text-sm" />
                    <Input type="time" value={slot.end} onChange={(e) => setSlot(i, "end", e.target.value)} className="!py-2 !px-2 text-sm" />
                    <Input value={slot.room} onChange={(e) => setSlot(i, "room", e.target.value)} placeholder="Room" className="!py-2 !px-2.5 text-sm" />
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

      <TimetableImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existing={subjects}
        onImported={async (summary) => { await refresh(); if (summary) toast(summary, { tone: "success" }); }}
      />
    </PageShell>
  );
}
