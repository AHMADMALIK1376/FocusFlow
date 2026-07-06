import React, { useState, useEffect, useRef, useMemo } from "react";
import { Timer, Hourglass, ListChecks, Trophy, Play, Square } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { EmptyState } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useTimetrack } from "../features/timetrack/useTimetrack";
import { totalSeconds, totalsByLabel, formatHMS } from "../features/timetrack/timetrackLogic";

const TODAY = new Date().toISOString().slice(0, 10);
const hoursLabel = (secs) => `${(secs / 3600).toFixed(1)}h`;

export default function TimeTrackPage() {
  const { state, start, stop, removeEntry } = useTimetrack();
  const { activeDashboard } = usePreferences();
  const { brand } = chartColors(activeDashboard?.palette);

  const [label, setLabel] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (state.running) {
      const tick = () => {
        const startMs = new Date(state.running.startedAt).getTime();
        setElapsed(Math.max(0, Math.round((Date.now() - startMs) / 1000)));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [state.running]);

  const total = totalSeconds(state);
  const byLabel = totalsByLabel(state);
  const labelEntries = Object.entries(byLabel).sort((a, b) => b[1] - a[1]);
  const todaySecs = state.entries.filter((e) => e.date === TODAY).reduce((s, e) => s + (e.seconds || 0), 0);
  const topActivity = labelEntries[0] ? labelEntries[0][0] : "—";

  const chartData = useMemo(
    () => labelEntries.slice(0, 6).map(([name, secs]) => ({ name: name.length > 16 ? name.slice(0, 15) + "…" : name, hours: +(secs / 3600).toFixed(2) })),
    [labelEntries]
  );

  function startTimer() { if (label.trim()) start(label.trim()); }
  function stopTimer() { stop(new Date().toISOString()); setLabel(""); }

  return (
    <PageShell>
      <PageHeader title="Study hours" subtitle="Track where your hours go and stay focused." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<Hourglass size={18} />} label="Total tracked" value={hoursLabel(total)} sub="All time" />
        <StatTile icon={<Timer size={18} />} label="Today" value={hoursLabel(todaySecs)} sub="Tracked today" />
        <StatTile icon={<ListChecks size={18} />} label="Sessions" value={state.entries.length} sub="Logged" />
        <StatTile icon={<Trophy size={18} />} label="Top activity" value={topActivity} sub="Most time spent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Featured live timer */}
        <section className="rounded-token-lg bg-grad-hero text-on-brand p-6 shadow-glass relative overflow-hidden flex flex-col">
          <div className="absolute -bottom-10 -right-8 w-40 h-40 rounded-full bg-[rgb(var(--on-brand)/0.12)] blur-2xl" />
          <h3 className="text-sm font-black uppercase tracking-wider opacity-90 relative z-10">Time tracker</h3>
          {state.running ? (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center py-4">
              <p className="text-5xl font-black tracking-tight tabular-nums">{formatHMS(elapsed)}</p>
              <p className="opacity-85 text-sm mt-2 truncate max-w-full">{state.running.label}</p>
              <button onClick={stopTimer} className="mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-token-md bg-[rgb(var(--on-brand)/0.2)] hover:bg-[rgb(var(--on-brand)/0.3)] transition-colors text-sm font-black uppercase tracking-wider">
                <Square size={15} /> Stop
              </button>
            </div>
          ) : (
            <div className="relative z-10 flex-1 flex flex-col justify-center gap-3 py-2">
              <p className="text-4xl font-black tracking-tight tabular-nums opacity-90">0:00:00</p>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startTimer()}
                placeholder="What are you working on?"
                className="w-full rounded-token-md bg-[rgb(var(--on-brand)/0.15)] text-on-brand placeholder:text-[rgb(var(--on-brand)/0.6)] outline-none px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[rgb(var(--on-brand)/0.4)]"
              />
              <button onClick={startTimer} disabled={!label.trim()} className="inline-flex items-center justify-center gap-2 h-11 rounded-token-md bg-on-brand text-brand text-sm font-black uppercase tracking-wider disabled:opacity-50 hover:-translate-y-0.5 transition-transform">
                <Play size={15} /> Start timer
              </button>
            </div>
          )}
        </section>

        {/* Time by activity */}
        <Panel title="Time by activity" subtitle="Top activities by hours tracked" className="lg:col-span-2">
          {chartData.length === 0 ? (
            <div className="h-[210px] flex items-center justify-center text-sm text-muted">Track some time to see your breakdown.</div>
          ) : (
            <ChartBox height={Math.max(160, chartData.length * 42)}>
              {(cw) => (
                <BarChart width={cw} height={Math.max(160, chartData.length * 42)} layout="vertical" data={chartData} margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ffTime" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={brand} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={brand} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 12, fontWeight: 700, fill: "rgb(54 54 54)" }} />
                  <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} formatter={(v) => [`${v}h`, "Time"]} />
                  <Bar dataKey="hours" radius={[0, 8, 8, 0]} fill="url(#ffTime)" maxBarSize={22} background={{ fill: hexToRgba(brand, 0.07) }}>
                    <LabelList dataKey="hours" position="right" formatter={(v) => `${v}h`} style={{ fontSize: 12, fontWeight: 800, fill: "rgb(54 54 54)" }} />
                  </Bar>
                </BarChart>
              )}
            </ChartBox>
          )}
        </Panel>
      </div>

      <Panel title="History">
        {state.entries.length === 0 ? (
          <EmptyState icon="⏲️" title="No sessions yet" description="Start the timer above to log your first session" />
        ) : (
          <ul className="space-y-2 max-h-[460px] overflow-y-auto -mx-1 px-1">
            {state.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2.5">
                <span className="flex-1 text-sm text-ink font-bold truncate">{e.label}</span>
                <span className="text-muted text-xs shrink-0">{e.date}</span>
                <span className="text-brand text-sm font-black tabular-nums shrink-0">{formatHMS(e.seconds)}</span>
                <button onClick={() => removeEntry(e.id)} className="text-muted hover:text-focus text-xs shrink-0">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </PageShell>
  );
}
