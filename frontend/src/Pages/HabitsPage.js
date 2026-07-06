import React, { useMemo, useState } from "react";
import { Repeat, Flame, CalendarCheck, Percent, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button, Input, EmptyState } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useHabits } from "../features/habits/useHabits";
import { streakFor, weekGrid } from "../features/habits/habitsLogic";

const TODAY = new Date().toISOString().slice(0, 10);
const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const COLOR_CLASSES = { brand: "bg-brand", success: "bg-success", info: "bg-info", warn: "bg-warn", focus: "bg-focus" };

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export default function HabitsPage() {
  const { state, addHabit: apiAddHabit, renameHabit, removeHabit, toggleDay } = useHabits();
  const { activeDashboard } = usePreferences();
  const { brand } = chartColors(activeDashboard?.palette);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("brand");
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const { habits } = state;
  const weekStart = getWeekStart();

  const grids = useMemo(() => habits.map((h) => weekGrid(h, weekStart)), [habits, weekStart]);
  const doneToday = habits.filter((h) => h.log && h.log[TODAY]).length;
  const bestStreak = habits.length ? Math.max(0, ...habits.map((h) => streakFor(h, TODAY))) : 0;
  const weekChecks = grids.reduce((s, g) => s + g.filter(Boolean).length, 0);
  const weekPct = habits.length ? Math.round((weekChecks / (habits.length * 7)) * 100) : 0;

  const weekData = WEEK_DAYS.map((label, i) => ({ label, count: grids.reduce((s, g) => s + (g[i] ? 1 : 0), 0) }));

  function addHabit() {
    if (!newName.trim()) return;
    apiAddHabit(newName.trim(), newColor);
    setNewName("");
  }
  function commitRename(id) {
    if (renameVal.trim()) renameHabit(id, renameVal.trim());
    setRenaming(null);
  }

  return (
    <PageShell>
      <PageHeader title="Study streaks" subtitle="Build streaks and keep your daily habits on track." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<Repeat size={18} />} label="Habits" value={habits.length} sub="Being tracked" />
        <StatTile icon={<CalendarCheck size={18} />} label="Done today" value={`${doneToday}/${habits.length || 0}`} sub="Completed today" />
        <StatTile icon={<Flame size={18} />} label="Best streak" value={bestStreak} sub="Days in a row" />
        <StatTile icon={<Percent size={18} />} label="This week" value={`${weekPct}%`} sub="Completion rate" />
      </div>

      <Panel title="Weekly activity" subtitle="Habits completed each day this week" className="mb-6">
        <ChartBox height={175}>
          {(cw) => (
            <BarChart width={cw} height={175} data={weekData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="ffHabits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand} stopOpacity={1} />
                  <stop offset="100%" stopColor={brand} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={hexToRgba(brand, 0.1)} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} dy={4} tick={{ fontSize: 11, fontWeight: 700, fill: "#8A93A0" }} />
              <YAxis axisLine={false} tickLine={false} width={28} allowDecimals={false} tick={{ fontSize: 11, fill: "#8A93A0" }} />
              <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} />
              <Bar dataKey="count" name="Completed" radius={[6, 6, 0, 0]} fill="url(#ffHabits)" maxBarSize={34} />
            </BarChart>
          )}
        </ChartBox>
      </Panel>

      <Panel className="mb-5">
        <div className="flex flex-wrap gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New habit name…" onKeyDown={(e) => e.key === "Enter" && addHabit()} className="flex-1 min-w-[180px]" />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="rounded-token-md bg-surface text-ink shadow-neu-inset outline-none font-medium py-3 px-4 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-brand/60"
          >
            {Object.keys(COLOR_CLASSES).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="primary" onClick={addHabit} className="gap-1.5 shrink-0"><Plus size={16} /> Add habit</Button>
        </div>
      </Panel>

      {habits.length === 0 ? (
        <Panel><EmptyState icon="🔁" title="No habits tracked yet" description="Add a habit above to get started" /></Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((habit, idx) => {
            const grid = grids[idx];
            const streak = streakFor(habit, TODAY);
            const colorClass = COLOR_CLASSES[habit.color] || "bg-brand";
            return (
              <div key={habit.id} className="bg-surface rounded-token-lg shadow-neu p-5">
                <div className="flex items-center justify-between mb-3 gap-2">
                  {renaming === habit.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(habit.id); if (e.key === "Escape") setRenaming(null); }} autoFocus className="py-2 px-3" />
                      <Button size="sm" variant="primary" onClick={() => commitRename(habit.id)}>Save</Button>
                    </div>
                  ) : (
                    <h3 className="text-base font-black text-ink flex-1 min-w-0 truncate flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />{habit.name}
                    </h3>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-ink">🔥 {streak}</span>
                    <button onClick={() => { setRenaming(habit.id); setRenameVal(habit.name); }} className="text-muted hover:text-ink text-xs p-1">✏️</button>
                    <button onClick={() => removeHabit(habit.id)} className="text-muted hover:text-focus text-xs p-1">✕</button>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {WEEK_DAYS.map((day, i) => {
                    const d = new Date(weekStart);
                    d.setDate(d.getDate() + i);
                    const dayKey = d.toISOString().slice(0, 10);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleDay(habit.id, dayKey)}
                        title={dayKey}
                        className={`flex flex-col items-center gap-0.5 rounded-token-md p-1.5 w-10 transition-all ${grid[i] ? `${colorClass} shadow-neu-sm` : "bg-surface-2 hover:bg-[rgb(var(--ink)/0.08)]"}`}
                      >
                        <span className={`text-[10px] font-black ${grid[i] ? "text-on-brand" : "text-muted"}`}>{day}</span>
                        <span className={`text-xs ${grid[i] ? "text-on-brand" : "text-ink/40"}`}>{grid[i] ? "✓" : "·"}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <Button size="sm" variant={habit.log && habit.log[TODAY] ? "primary" : "neu"} onClick={() => toggleDay(habit.id, TODAY)}>
                    {habit.log && habit.log[TODAY] ? "✓ Done today" : "Mark today"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
