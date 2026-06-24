import React, { useMemo, useState } from "react";
import { Smile, Gauge, CalendarHeart, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button, Textarea, EmptyState } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useMood } from "../features/mood/useMood";
import { last7, average } from "../features/mood/moodLogic";

const TODAY = new Date().toISOString().slice(0, 10);
const SCORE_EMOJIS = { 1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "😄" };
const SCORE_LABELS = { 1: "Terrible", 2: "Bad", 3: "Okay", 4: "Good", 5: "Great" };

export default function MoodPage() {
  const { state, dispatch } = useMood();
  const { activeDashboard } = usePreferences();
  const { brand, accent } = chartColors(activeDashboard?.palette);

  const [selectedScore, setSelectedScore] = useState(3);
  const [note, setNote] = useState("");
  const [selectedDay, setSelectedDay] = useState(TODAY);

  const week = last7(state, TODAY);
  const avg = average(state);
  const todayLog = state.logs.find((l) => l.day === TODAY);

  const weekScores = week.filter(Boolean).map((l) => l.score);
  const weekAvg = weekScores.length ? Math.round((weekScores.reduce((a, b) => a + b, 0) / weekScores.length) * 10) / 10 : 0;

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    return week.map((log, i) => ({ label: days[i].toLocaleDateString(undefined, { weekday: "short" }), score: log ? log.score : null }));
  }, [week]);

  function logMood() {
    dispatch({ type: "SET_MOOD", payload: { day: selectedDay, score: selectedScore, note } });
    setNote("");
  }

  return (
    <PageShell>
      <PageHeader title="Mood" subtitle="Check in with yourself and spot the patterns." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<CalendarHeart size={18} />} label="Check-ins" value={state.logs.length} sub="Days logged" />
        <StatTile icon={<Gauge size={18} />} label="Average" value={avg > 0 ? avg.toFixed(1) : "—"} sub="All-time / 5" />
        <StatTile icon={<Sparkles size={18} />} label="This week" value={weekAvg > 0 ? weekAvg.toFixed(1) : "—"} sub="7-day average" />
        <StatTile icon={<Smile size={18} />} label="Today" value={todayLog ? SCORE_EMOJIS[todayLog.score] : "—"} sub={todayLog ? SCORE_LABELS[todayLog.score] : "Not logged"} />
      </div>

      <Panel title="Mood this week" subtitle="Your daily score over the last 7 days" className="mb-6">
        <ChartBox height={200}>
          {(cw) => (
            <AreaChart width={cw} height={200} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ffMood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={hexToRgba(brand, 0.1)} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} dy={4} tick={{ fontSize: 11, fontWeight: 700, fill: "#8A93A0" }} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} width={28} tick={{ fontSize: 11, fill: "#8A93A0" }} />
              <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v) => [`${v}/5 ${SCORE_EMOJIS[v] || ""}`, "Mood"]} />
              <Area type="monotone" dataKey="score" name="Mood" stroke={brand} strokeWidth={2.5} fill="url(#ffMood)" connectNulls={false} dot={{ r: 4, fill: brand, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </AreaChart>
          )}
        </ChartBox>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="How are you feeling?">
          <label className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5 block">Date</label>
          <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}
            className="w-full rounded-token-md bg-surface text-ink shadow-neu-inset outline-none font-medium py-2.5 px-4 text-sm mb-4 focus:ring-2 focus:ring-brand/60" />

          <div className="flex justify-between gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map((score) => (
              <button key={score} onClick={() => setSelectedScore(score)} title={SCORE_LABELS[score]}
                className={`flex-1 flex flex-col items-center gap-1 rounded-token-md py-3 transition-all ${selectedScore === score ? "bg-grad-hero shadow-neu-sm scale-105" : "bg-surface-2 hover:bg-[rgb(var(--ink)/0.06)]"}`}>
                <span className="text-2xl">{SCORE_EMOJIS[score]}</span>
                <span className={`text-[10px] font-bold ${selectedScore === score ? "text-on-brand" : "text-muted"}`}>{SCORE_LABELS[score]}</span>
              </button>
            ))}
          </div>

          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note — what happened today?" rows={3} />
          <Button variant="primary" onClick={logMood} className="mt-3 w-full">Log mood</Button>
        </Panel>

        <Panel title="History">
          {state.logs.length === 0 ? (
            <EmptyState icon="🌤️" title="No mood logs yet" description="Log how you feel above" />
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto -mx-1 px-1">
              {[...state.logs].sort((a, b) => b.day.localeCompare(a.day)).map((log) => (
                <li key={log.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2.5">
                  <span className="text-2xl">{SCORE_EMOJIS[log.score]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{log.day}</p>
                    {log.note && <p className="text-xs text-muted truncate">{log.note}</p>}
                  </div>
                  <span className="text-brand font-black text-sm shrink-0">{log.score}/5</span>
                  <button onClick={() => dispatch({ type: "REMOVE", payload: { day: log.day } })} className="text-muted hover:text-focus text-xs shrink-0">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
