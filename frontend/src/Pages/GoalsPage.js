import React, { useState } from "react";
import { Target, CheckCircle2, Loader, TrendingUp, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Button, Input, EmptyState, ProgressRing, Checkbox, DeleteButton } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useGoals } from "../features/goalsx/useGoals";
import { goalProgress, overallProgress } from "../features/goalsx/goalsLogic";

export default function GoalsPage() {
  const { goals, createGoal, removeGoal, createMilestone, toggleMilestone, removeMilestone } = useGoals();
  const { activeDashboard } = usePreferences();
  const { brand } = chartColors(activeDashboard?.palette);

  const [selectedId, setSelectedId] = useState(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newMilestone, setNewMilestone] = useState("");

  const selected = goals.find((g) => g.id === selectedId) || null;
  const overall = overallProgress({ goals });
  const completed = goals.filter((g) => goalProgress(g) === 100).length;
  const inProgress = goals.filter((g) => { const p = goalProgress(g); return p > 0 && p < 100; }).length;

  const chartData = goals.map((g) => ({ name: g.title.length > 16 ? g.title.slice(0, 15) + "…" : g.title, value: goalProgress(g) }));

  async function addGoal() {
    if (!newGoalTitle.trim()) return;
    await createGoal(newGoalTitle.trim());
    setNewGoalTitle("");
  }
  async function addMilestone() {
    if (!newMilestone.trim() || !selectedId) return;
    await createMilestone(selectedId, newMilestone.trim());
    setNewMilestone("");
  }

  return (
    <PageShell>
      <PageHeader title="Goals" subtitle="Set goals, break them into milestones and watch them progress." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<Target size={18} />} label="Total goals" value={goals.length} sub="Being tracked" />
        <StatTile icon={<CheckCircle2 size={18} />} label="Completed" value={completed} sub="100% done" />
        <StatTile icon={<Loader size={18} />} label="In progress" value={inProgress} sub="Underway" />
        <StatTile icon={<TrendingUp size={18} />} label="Overall" value={`${overall}%`} sub="Average progress" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Panel title="Progress by goal" subtitle="How close each goal is" className="lg:col-span-2">
          {chartData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted">Add a goal to see progress here.</div>
          ) : (
            <ChartBox height={Math.max(150, chartData.length * 46)}>
              {(cw) => (
                <BarChart width={cw} height={Math.max(150, chartData.length * 46)} layout="vertical" data={chartData} margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ffGoals" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={brand} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={brand} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 12, fontWeight: 700, fill: "rgb(54 54 54)" }} />
                  <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} formatter={(v) => [`${v}%`, "Progress"]} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="url(#ffGoals)" maxBarSize={22} background={{ fill: hexToRgba(brand, 0.07) }}>
                    <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fontWeight: 800, fill: "rgb(54 54 54)" }} />
                  </Bar>
                </BarChart>
              )}
            </ChartBox>
          )}
        </Panel>

        <Panel className="flex flex-col items-center justify-center">
          <h3 className="text-sm font-black uppercase tracking-wider text-ink self-start mb-2">Overall</h3>
          <ProgressRing value={overall} size={150} stroke={15}>
            <div className="text-center">
              <p className="text-3xl font-black text-ink">{overall}%</p>
              <p className="text-[10px] uppercase tracking-widest text-muted">complete</p>
            </div>
          </ProgressRing>
          <p className="text-sm text-muted mt-4 font-medium text-center">{completed} of {goals.length || 0} goals reached</p>
        </Panel>
      </div>

      <Panel className="mb-5">
        <div className="flex gap-2">
          <Input value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} placeholder="New goal title…" onKeyDown={(e) => e.key === "Enter" && addGoal()} />
          <Button variant="primary" onClick={addGoal} className="gap-1.5 shrink-0"><Plus size={16} /> Add</Button>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        <Panel title="Your goals">
          {goals.length === 0 ? (
            <EmptyState icon="🎯" title="No goals yet" description="Add one above to get started" />
          ) : (
            <ul className="space-y-2 max-h-[460px] overflow-y-auto -mx-1 px-1">
              {goals.map((goal) => {
                const pct = goalProgress(goal);
                const active = selectedId === goal.id;
                return (
                  <li key={goal.id} onClick={() => setSelectedId(goal.id)}
                    className={`rounded-token-md px-3 py-3 cursor-pointer transition-colors ${active ? "bg-grad-hero text-on-brand shadow-neu-sm" : "hover:bg-surface-2"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-bold text-sm truncate ${active ? "text-on-brand" : "text-ink"}`}>{goal.title}</span>
                      <span className={`text-xs font-black ${active ? "text-on-brand/80" : "text-muted"}`}>{pct}%</span>
                    </div>
                    <div className={`rounded-full h-1.5 ${active ? "bg-[rgb(var(--on-brand)/0.25)]" : "bg-[rgb(var(--ink)/0.1)]"}`}>
                      <div className={`h-1.5 rounded-full ${active ? "bg-on-brand" : "bg-brand"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          {!selected ? (
            <EmptyState icon="📌" title="Select a goal" description="View and manage its milestones" />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-ink truncate">{selected.title}</h2>
                  <span className="text-sm text-muted">{goalProgress(selected)}% complete</span>
                </div>
                <DeleteButton onClick={() => { removeGoal(selected.id); setSelectedId(null); }} title="Delete goal" />
              </div>

              <div className="flex gap-2 mb-4">
                <Input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="Add milestone…" onKeyDown={(e) => e.key === "Enter" && addMilestone()} />
                <Button variant="primary" size="sm" onClick={addMilestone} className="shrink-0">Add</Button>
              </div>

              {selected.milestones.length === 0 ? (
                <EmptyState icon="📌" title="No milestones yet" description="Break this goal into steps" />
              ) : (
                <ul className="space-y-2">
                  {selected.milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2.5">
                      <Checkbox checked={m.done} size={22} onChange={() => toggleMilestone(m.id)} />
                      <span className={`flex-1 text-sm ${m.done ? "line-through text-muted" : "text-ink"}`}>{m.title}</span>
                      <button onClick={() => removeMilestone(m.id)} className="text-muted hover:text-focus text-xs">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
