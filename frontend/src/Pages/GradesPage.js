import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Award, BookOpen, GraduationCap } from "lucide-react";
import { Button, Badge, EmptyState, ProgressRing } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import { gradeAPI } from "../services/api";

export default function GradesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await gradeAPI.getGpa());
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load grades");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const subjects = data?.subjects || [];
  const graded = subjects.filter((s) => s.letter);
  const cgpa = data?.cgpa;
  const ringValue = cgpa != null ? Math.min(100, (cgpa / 4) * 100) : 0;
  const topGrade = graded.length ? graded.reduce((b, s) => (s.points > b.points ? s : b), graded[0]).letter : "—";

  return (
    <PageShell>
      <PageHeader title="Grades" subtitle="Your CGPA and grade breakdown across all subjects." />

      {loading ? (
        <Panel><p className="text-sm text-muted py-8 text-center">Loading…</p></Panel>
      ) : error ? (
        <Panel><div className="py-8 text-center"><p className="text-focus text-sm mb-3">{error}</p><Button variant="soft" onClick={load}>Retry</Button></div></Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <Panel className="flex flex-col items-center justify-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink self-start mb-2">CGPA</h3>
              <ProgressRing value={ringValue} size={160} stroke={16}>
                <div className="text-center">
                  <p className="text-4xl font-black text-ink">{cgpa != null ? cgpa.toFixed(2) : "—"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted">/ 4.0</p>
                </div>
              </ProgressRing>
              <p className="text-sm text-muted mt-4 font-medium text-center">{graded.length} of {subjects.length} subjects graded</p>
            </Panel>

            <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
              <StatTile primary icon={<Award size={18} />} label="CGPA" value={cgpa != null ? cgpa.toFixed(2) : "—"} sub="Cumulative" />
              <StatTile icon={<BookOpen size={18} />} label="Graded credits" value={data?.totalCredits || 0} sub="Counted toward CGPA" />
              <StatTile icon={<GraduationCap size={18} />} label="Subjects graded" value={graded.length} sub={`of ${subjects.length}`} />
              <StatTile icon={<Award size={18} />} label="Top grade" value={topGrade} sub="Best subject" />
            </div>
          </div>

          <Panel title="By subject" subtitle="Tap a subject to manage its grades">
            {subjects.length === 0 ? (
              <EmptyState icon="📊" title="No subjects yet" description="Add subjects and grade items to see your CGPA" />
            ) : (
              <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
                {subjects.map((s) => (
                  <li key={s.subjectId} onClick={() => navigate(`/subjects/${s.subjectId}`)} className="flex items-center gap-3 py-3 cursor-pointer hover:bg-surface-2 -mx-2 px-2 rounded-token-md transition-colors">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color || "rgb(var(--brand))" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {s.code && <Badge tone="muted">{s.code}</Badge>}
                        <span className="font-bold text-ink text-sm truncate">{s.name}</span>
                      </div>
                      <p className="text-xs text-muted">{s.creditHours || 0} cr · {s.itemCount} grade{s.itemCount === 1 ? "" : "s"}</p>
                    </div>
                    {s.letter ? (
                      <div className="text-right shrink-0">
                        <Badge tone={s.points >= 3 ? "success" : s.points >= 2 ? "info" : "focus"}>{s.letter}</Badge>
                        <p className="text-xs text-muted mt-1">{s.percent}% · {s.points.toFixed(1)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted shrink-0">No grades</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </PageShell>
  );
}
