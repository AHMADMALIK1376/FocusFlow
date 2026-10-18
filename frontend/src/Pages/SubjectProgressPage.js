import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button, EmptyState } from "../components/ui";
import { PageShell, PageHeader, Panel } from "../components/dashboard/DashKit";
import { PageLoading, PanelLoading, useFirstLoad } from "../components/common/LoadingSpinner";
import { useSubjects } from "../features/subjects/useSubjects";
import { useSubjectStats } from "../features/subjects/useSubjectStats";
import AtomChart from "../components/subjects/AtomChart";

// The chart's view and metric are remembered on this device only; the page works without them.
const MODE_KEY = "ff_subjects_atom_mode";
const METRIC_KEY = "ff_subjects_atom_metric";
function remembered(key, allowed, fallback) {
  try {
    const v = window.localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch { return fallback; }
}
function remember(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: fine */ }
}

export default function SubjectProgressPage() {
  const navigate = useNavigate();
  const { subjects, loading, error, refresh } = useSubjects();
  const firstLoad = useFirstLoad(loading);
  const { stats, loading: statsLoading, error: statsError } = useSubjectStats(subjects);
  const statsFirstLoad = useFirstLoad(statsLoading);
  const [mode, setMode] = useState(() => remembered(MODE_KEY, ["one", "all", "overall"], "all"));
  const [metric, setMetric] = useState(() => remembered(METRIC_KEY, ["attendance", "grade"], "attendance"));
  const [pickedId, setPickedId] = useState(null);
  // falls back to the first subject if the picked one is gone
  const selectedId = subjects.some((x) => x.id === pickedId) ? pickedId : subjects[0]?.id ?? null;
  const changeMode = (m) => { setMode(m); remember(MODE_KEY, m); };
  const changeMetric = (m) => { setMetric(m); remember(METRIC_KEY, m); };
  const back = (
    <Button variant="soft" onClick={() => navigate("/subjects")} className="gap-1.5"><ArrowLeft size={16} /> Subjects</Button>
  );

  return (
    <PageShell>
      <PageHeader title="Subject progress" subtitle="The middle is your overall number; each ring is a subject.">
        {back}
      </PageHeader>

      {firstLoad ? (
        <PageLoading message="Loading subjects…" />
      ) : error ? (
        <Panel><div className="py-8 text-center"><p className="text-focus text-sm mb-3">{error}</p><Button variant="soft" onClick={refresh}>Retry</Button></div></Panel>
      ) : subjects.length === 0 ? (
        <Panel>
          <EmptyState icon={GraduationCap} title="No subjects yet" description="Add your subjects first, then come back to see how each one is going" />
          <div className="flex justify-center pb-6">{back}</div>
        </Panel>
      ) : (
        <div className="w-full max-w-[34rem] mx-auto min-w-0">
          {statsError && <p className="text-xs text-muted mb-2">Some figures could not be loaded, so the chart may be incomplete.</p>}
          {statsFirstLoad ? (
            <PanelLoading message="Loading chart…" />
          ) : (
            <AtomChart
              stats={stats}
              mode={mode}
              metric={metric}
              selectedId={selectedId}
              onSelect={setPickedId}
              onModeChange={changeMode}
              onMetricChange={changeMetric}
            />
          )}
        </div>
      )}
    </PageShell>
  );
}
