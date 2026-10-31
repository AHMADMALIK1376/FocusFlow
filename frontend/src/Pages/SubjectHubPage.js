import React, { useState, useEffect, useCallback } from "react";
import { renderIcon } from "../components/ui/renderIcon";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, StickyNote, GraduationCap, Pencil } from "lucide-react";
import { Button, Badge, EmptyState, DeleteButton } from "../components/ui";
import { PageShell, Panel } from "../components/dashboard/DashKit";
import { PageLoading } from "../components/common/LoadingSpinner";
import { subjectAPI } from "../services/api";
import { fmtRange } from "../features/schedule/todayClasses";
import GradesPanel from "../components/subjects/GradesPanel";
import ExamsPanel from "../components/subjects/ExamsPanel";
import FlashcardsPanel from "../components/subjects/FlashcardsPanel";
import AttendancePanel from "../components/subjects/AttendancePanel";
import AssignmentsPanel from "../components/subjects/AssignmentsPanel";

const DAY_ORDER = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
// A light fill from the subject's own colour (a #RRGGBB the student picked), or the app's coral when there is none.
export const subjectTint = (hex) => (/^#[0-9a-f]{6}$/i.test(String(hex || "")) ? `${hex}22` : "rgb(var(--brand) / 0.10)");
const HOVER_ONLY = "opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity";

const COMING = [
  { key: "notes", icon: StickyNote, title: "Notes", note: "Subject notes — arriving soon." },
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

  function onEdit() {
    navigate(`/subjects?edit=${encodeURIComponent(id)}`);
  }

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
        <PageLoading message="Loading subject…" />
      ) : error ? (
        <Panel><div className="py-8 text-center"><p className="text-focus text-sm mb-3">{error}</p><Button variant="soft" onClick={load}>Retry</Button></div></Panel>
      ) : !subject ? (
        <Panel><EmptyState icon={GraduationCap} title="Subject not found" description="It may have been deleted." /></Panel>
      ) : (
        <>
          {/* A slim header filled with a light tint of the subject's colour; edit and delete show when the card is pointed at (always on touch screens). */}
          <div data-testid="subject-header" className="group rounded-token-lg shadow-neu mb-4 px-4 py-3 flex items-center gap-3" style={{ background: subjectTint(subject.color) }}>
            <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: subject.color || "rgb(var(--brand))" }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {subject.code && <Badge tone="brand">{subject.code}</Badge>}
                {subject.targetGrade && <Badge tone="success">Target {subject.targetGrade}</Badge>}
              </div>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-black text-ink tracking-tight truncate" title={subject.name}>{subject.name}</h1>
              <p className="text-xs text-muted truncate">
                {[subject.instructor || "TBA", subject.term, `${subject.creditHours || 0} credit hours`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div data-testid="subject-actions" className={`flex items-center gap-2 shrink-0 ${HOVER_ONLY}`}>
              <button type="button" onClick={onEdit} aria-label="Edit subject" title="Edit subject" className="w-9 h-9 rounded-full bg-surface text-muted hover:text-brand shadow-neu-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                <Pencil size={15} aria-hidden="true" />
              </button>
              <DeleteButton onClick={onDelete} title="Delete subject" />
            </div>
          </div>

          {/* The sections sit in two columns on a laptop so most of them fit on the screen, one column on a phone. */}
          <div className="lg:columns-2 lg:gap-4">
            <div className="break-inside-avoid mb-4">
              <Panel title="Class schedule" tone="info" compact>
                {schedule.length === 0 ? (
                  <EmptyState compact icon={Clock} title="No class times set" description="Add times with the pencil above." />
                ) : (
                  <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
                    {schedule.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-2">
                        <span className="w-8 h-8 rounded-xl bg-surface text-brand flex items-center justify-center shrink-0"><Clock size={15} /></span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-ink text-sm">{s.day}</p>
                          <p className="text-xs text-muted truncate">{[fmtRange(s.start, s.end), s.room].filter(Boolean).join(" · ") || "—"}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
            <div className="break-inside-avoid mb-4"><AssignmentsPanel subjectId={id} /></div>
            <div className="break-inside-avoid mb-4"><AttendancePanel subjectId={id} /></div>
            <div className="break-inside-avoid mb-4"><GradesPanel subjectId={id} /></div>
            <div className="break-inside-avoid mb-4"><ExamsPanel subjectId={id} /></div>
            <div className="break-inside-avoid mb-4"><FlashcardsPanel subjectId={id} /></div>
            {COMING.map((c) => (
              <div key={c.key} className="break-inside-avoid mb-4">
                <Panel tone="blush" compact>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-brand">{renderIcon(c.icon, { size: 18 })}</span>
                    <h3 className="text-sm font-black uppercase tracking-wider text-ink">{c.title}</h3>
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted bg-[rgb(var(--ink)/0.06)] px-2 py-1 rounded-full">Coming soon</span>
                  </div>
                  <p className="text-xs text-muted">{c.note}</p>
                </Panel>
              </div>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
