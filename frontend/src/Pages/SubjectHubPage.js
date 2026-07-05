import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { Button, Badge, EmptyState, DeleteButton } from "../components/ui";
import { PageShell, Panel } from "../components/dashboard/DashKit";
import { subjectAPI } from "../services/api";
import GradesPanel from "../components/subjects/GradesPanel";
import ExamsPanel from "../components/subjects/ExamsPanel";
import FlashcardsPanel from "../components/subjects/FlashcardsPanel";

const DAY_ORDER = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
const COMING = [
  { key: "attendance", icon: "✅", title: "Attendance", note: "Per-class attendance and percentage — arriving soon." },
  { key: "assignments", icon: "📝", title: "Assignments", note: "Assignments and deadlines for this subject — arriving soon." },
  { key: "notes", icon: "🗒️", title: "Notes", note: "Subject notes — arriving soon." },
];

export default function SubjectHubPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubject(await subjectAPI.get(id));
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load subject");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function onDelete() {
    if (!subject || !window.confirm(`Delete "${subject.name}"?`)) return;
    await subjectAPI.remove(id);
    navigate("/subjects");
  }

  const schedule = (subject?.schedule || []).slice().sort(
    (a, b) => (DAY_ORDER[a.day] || 9) - (DAY_ORDER[b.day] || 9) || String(a.start).localeCompare(String(b.start))
  );

  return (
    <PageShell>
      <button onClick={() => navigate("/subjects")} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-brand mb-4 transition-colors">
        <ArrowLeft size={16} /> Subjects
      </button>

      {loading ? (
        <Panel><p className="text-sm text-muted py-8 text-center">Loading…</p></Panel>
      ) : error ? (
        <Panel><div className="py-8 text-center"><p className="text-focus text-sm mb-3">{error}</p><Button variant="soft" onClick={load}>Retry</Button></div></Panel>
      ) : !subject ? (
        <Panel><EmptyState icon="📚" title="Subject not found" description="It may have been deleted." /></Panel>
      ) : (
        <>
          <div className="bg-surface rounded-token-lg shadow-neu overflow-hidden flex mb-6">
            <div className="w-2 shrink-0" style={{ background: subject.color || "rgb(var(--brand))" }} />
            <div className="p-6 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {subject.code && <Badge tone="brand">{subject.code}</Badge>}
                    {subject.targetGrade && <Badge tone="success">Target {subject.targetGrade}</Badge>}
                  </div>
                  <h1 className="text-3xl font-black text-ink tracking-tight truncate">{subject.name}</h1>
                  <p className="text-muted mt-1 text-sm">
                    {[subject.instructor, subject.term, `${subject.creditHours || 0} credit hours`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <DeleteButton onClick={onDelete} title="Delete subject" />
              </div>
            </div>
          </div>

          <Panel title="Class schedule" className="mb-6">
            {schedule.length === 0 ? (
              <EmptyState icon="🕒" title="No class times set" description="Add times by editing this subject on the Subjects page." />
            ) : (
              <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
                {schedule.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><Clock size={16} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink text-sm">{s.day}</p>
                      <p className="text-xs text-muted">{[s.start && s.end ? `${s.start} – ${s.end}` : s.start || "", s.room].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <GradesPanel subjectId={id} />

          <ExamsPanel subjectId={id} />

          <FlashcardsPanel subjectId={id} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMING.map((c) => (
              <Panel key={c.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{c.icon}</span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-ink">{c.title}</h3>
                </div>
                <p className="text-xs text-muted">{c.note}</p>
                <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider text-muted bg-[rgb(var(--ink)/0.06)] px-2 py-1 rounded-full">Coming soon</span>
              </Panel>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
