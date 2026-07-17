// src/Pages/Home.js — FocusFlow dashboard (editable, image profile card, live graphs)
import React, { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Pencil, Plus } from "lucide-react";
import {
  ComposedChart, Bar, Line, Area, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LabelList,
} from "recharts";
import { useUser } from "../components/auth/UserContext";
import { useApp } from "../components/context/AppContext";
import { usePreferences } from "../preferences/usePreferences";
import { ProgressRing, cx } from "../components/ui";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { WIDGET_BY_ID } from "../dashboard/registry";
import Clock from "../components/dashboard/Clock";
import StudentSnapshot from "../components/dashboard/StudentSnapshot";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FEATURE_IDS = ["notes", "goalsx", "habits", "kanban", "timetrack", "finance"];

// Defensive task field readers (task shape varies across the app)
const taskTitle = (t) => t.text || t.task_text || t.title || t.activity || "Untitled task";
const taskDone = (t) => Boolean(t.completed || t.is_completed || t.isCompleted);
const taskDate = (t) => t.date || t.task_date || t.taskDate || t.dueDate || null;
const taskTime = (t) => t.time || t.task_time || t.taskTime || "";

// ── Inline-editable text ─────────────────────────────────────────────────────
function InlineEdit({ value, onSave, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); const v = draft.trim(); if (v && v !== value) onSave(v); else setDraft(value); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={cx("bg-transparent outline-none border-b-2 border-current/40 min-w-0 max-w-full", className)}
        style={{ font: "inherit", letterSpacing: "inherit", textTransform: "inherit", color: "inherit" }}
      />
    );
  }
  return (
    <span
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
      className={cx("group/edit cursor-text inline-flex items-center gap-1.5", className)}
    >
      {value}
      <Pencil size={12} className="opacity-0 group-hover/edit:opacity-40 transition-opacity shrink-0" />
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userName } = useUser();
  const {
    tasks = [],
    timetable = [],
    streak,
    completedGoals,
    totalFocusSessions,
    todaysClasses = [],
    attendanceSummary,
    progress,
    pendingRoutineCount,
    pendingRoutine,
    loading: contextLoading,
  } = useApp();
  const { profile, activeDashboard, updateProfile, updateActiveDashboard } = usePreferences();

  const fileRef = useRef(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const tmr = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tmr);
  }, []);

  const displayName = profile?.displayName || userName || "there";
  const workspace = activeDashboard?.name || "My Workspace";
  const greeting = t(now.getHours() < 12 ? "dashboard.goodMorning" : now.getHours() < 18 ? "dashboard.goodAfternoon" : "dashboard.goodEvening");
  const avatarUrl = profile?.avatarUrl || null;

  // Editable labels (per dashboard)
  const labels = activeDashboard?.labels || {};
  const lbl = (key, def) => labels[key] || def;
  const setLbl = (key, val) => updateActiveDashboard({ labels: { ...labels, [key]: val } });

  // Chart colours derived from the active palette
  const { brand: chartBrand, accent: chartAccent } = chartColors(activeDashboard?.palette);

  // ── Derived metrics (real data) ──
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(taskDone).length;
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : (progress || 0);
  const routinePctBase = timetable.length || 0;
  const routineDone = Math.max(0, routinePctBase - (pendingRoutine ?? pendingRoutineCount ?? 0));
  const routinePct = routinePctBase ? Math.round((routineDone / routinePctBase) * 100) : 0;
  const attendancePct = Math.round(attendanceSummary?.overallPercentage ?? attendanceSummary?.percentage ?? 0);

  const weekData = useMemo(() => {
    const map = DAYS.map((label) => ({ label, total: 0, done: 0 }));
    tasks.forEach((tk) => {
      const ds = taskDate(tk);
      if (!ds) return;
      const d = new Date(ds);
      if (Number.isNaN(d.getTime())) return;
      const idx = (d.getDay() + 6) % 7; // Mon=0
      map[idx].total += 1;
      if (taskDone(tk)) map[idx].done += 1;
    });
    return map;
  }, [tasks]);

  const todaysTasks = useMemo(() => tasks.filter((tk) => !taskDone(tk)).slice(0, 5), [tasks]);

  const focusGoal = 4;
  const focusToday = Math.min(totalFocusSessions || 0, focusGoal);
  const focusRingPct = Math.round((focusToday / focusGoal) * 100);

  const progressData = [
    { label: "Tasks", value: taskPct },
    { label: "Routine", value: routinePct },
    { label: "Attendance", value: attendancePct },
    { label: "Focus", value: focusRingPct },
  ];

  const enabledMap = activeDashboard?.widgets?.enabled || {};
  const enabledFeatures = FEATURE_IDS.filter((id) => enabledMap[id] && WIDGET_BY_ID[id]);

  function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProfile({ avatarUrl: reader.result });
    reader.readAsDataURL(file);
  }

  if (contextLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-5 md:px-6 pb-10 pt-8 md:pt-10">
      {/* ── BENTO GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main column: hero header, snapshot+clock, then activity */}
        <div className="lg:col-span-8 flex flex-col gap-5 min-w-0">
          {/* ── HERO ROW ─────────────────────────────────────── */}
          <header className="animate-[fadeInUp_0.6s_ease-out]">
            <p className="text-xs font-bold uppercase tracking-[3px] text-brand mb-2">{workspace}</p>
            <h1 className="text-4xl md:text-5xl font-black text-ink tracking-tight leading-none">
              {greeting},{" "}
              <span className="bg-grad-hero bg-clip-text text-transparent">{displayName}.</span>
            </h1>
            <p className="text-muted text-base mt-3 font-medium">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · You've completed{" "}
              <b className="text-ink">{completedGoals || 0}</b> goals so far.
            </p>
          </header>

          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex-1 min-w-0"><StudentSnapshot /></div>
            <div className="shrink-0"><Clock /></div>
          </div>

          {/* Weekly activity — recharts */}
          <section className="rounded-token-lg bg-surface shadow-neu p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                  <InlineEdit value={lbl("activity", "Activity this week")} onSave={(v) => setLbl("activity", v)} />
                </h3>
                <p className="text-xs text-muted mt-0.5">Tasks completed per day</p>
              </div>
            </div>
            <ChartBox height={215}>
              {(cw) => (
              <ComposedChart width={cw} height={215} data={weekData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="ffBarDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartBrand} stopOpacity={1} />
                    <stop offset="100%" stopColor={chartBrand} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="ffTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartAccent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={chartAccent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={hexToRgba(chartBrand, 0.1)} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} dy={4} tick={{ fontSize: 11, fontWeight: 700, fill: "#8A93A0" }} />
                <YAxis axisLine={false} tickLine={false} width={28} allowDecimals={false} tick={{ fontSize: 11, fill: "#8A93A0" }} />
                <Tooltip cursor={{ fill: hexToRgba(chartBrand, 0.05) }} contentStyle={CHART_TOOLTIP} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
                <Area type="monotone" dataKey="done" name="Trend" legendType="none" stroke="none" fill="url(#ffTrend)" />
                <Bar dataKey="total" name="Planned" radius={[6, 6, 0, 0]} fill={hexToRgba(chartBrand, 0.14)} maxBarSize={26} />
                <Bar dataKey="done" name="Completed" radius={[6, 6, 0, 0]} fill="url(#ffBarDone)" maxBarSize={26} />
                <Line type="monotone" dataKey="done" name="Trend" stroke={chartAccent} strokeWidth={2.5} dot={{ r: 3, fill: chartAccent, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
              )}
            </ChartBox>
          </section>
        </div>

        {/* Right rail: profile + schedule */}
        <div className="lg:col-span-4 flex flex-col gap-5 min-w-0">
          {/* Profile card — full-cover image + overlay text */}
          <section className={cx(
            "group rounded-token-lg bg-grad-hero p-6 shadow-glass relative overflow-hidden min-h-[460px] flex flex-col",
            avatarUrl ? "text-white" : "text-on-brand"
          )}>
            {avatarUrl && <img src={avatarUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />}
            {avatarUrl
              ? <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              : <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[rgb(var(--brand-soft)/0.25)] blur-2xl" />}

            <div className="flex items-center justify-end relative z-10">
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={13} /> {avatarUrl ? "Change" : "Add photo"}
              </button>
            </div>

            <div className={cx("flex-1 flex flex-col relative z-10", avatarUrl ? "justify-end" : "items-center justify-center text-center")}>
              {!avatarUrl && (
                <button onClick={() => fileRef.current?.click()} title="Add a photo"
                  className="w-20 h-20 rounded-2xl bg-[rgb(var(--on-brand)/0.18)] backdrop-blur flex items-center justify-center text-3xl font-black mb-4 hover:bg-[rgb(var(--on-brand)/0.28)] transition-colors">
                  {displayName.slice(0, 1).toUpperCase()}
                </button>
              )}
              <span className="inline-block w-fit px-3 py-1 rounded-full bg-white/16 backdrop-blur text-xs font-bold">
                {profile?.segment && profile.segment !== "Unknown" ? profile.segment : "FocusFlow Member"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 relative z-10 pt-4 mt-4 border-t border-white/20">
              <div className="text-center"><p className="text-lg font-black">{streak || 0}</p><p className="text-[9px] uppercase tracking-wider opacity-75">Streak</p></div>
              <div className="text-center"><p className="text-lg font-black">{doneTasks}</p><p className="text-[9px] uppercase tracking-wider opacity-75">Done</p></div>
              <div className="text-center"><p className="text-lg font-black">{totalFocusSessions || 0}</p><p className="text-[9px] uppercase tracking-wider opacity-75">Focus</p></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
          </section>

          {/* Schedule + attendance */}
          <section className="rounded-token-lg bg-surface shadow-neu p-6 flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink mb-4">
              <InlineEdit value={lbl("schedule", "Today's schedule")} onSave={(v) => setLbl("schedule", v)} />
            </h3>
            <div className="flex-1 space-y-3">
              {todaysClasses.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">No classes scheduled today</p>
              ) : (
                todaysClasses.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-grad-hero" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{c.subject || c.subject_name || c.name || "Class"}</p>
                      <p className="text-[11px] text-muted">{c.startTime || c.start_time || ""}{c.room ? ` · ${c.room}` : ""}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-[rgb(var(--ink)/0.08)] flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Attendance</p>
                <p className="text-2xl font-black text-ink">{attendancePct}%</p>
              </div>
              <ProgressRing value={attendancePct} size={56} stroke={7}>
                <span className="text-[10px] font-black text-ink">{attendancePct}%</span>
              </ProgressRing>
            </div>
          </section>
        </div>

        {/* Lower main column: Focus/Streak + Progress side by side, then the Assignment board */}
        <div className="lg:col-span-8 flex flex-col gap-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Focus ring + Keep the streak, stacked */}
            <div className="flex flex-col gap-5">
              <section className="rounded-token-lg bg-surface shadow-neu p-5 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                    <InlineEdit value={lbl("focus", "Focus today")} onSave={(v) => setLbl("focus", v)} />
                  </h3>
                  <button onClick={() => navigate("/focus-mode")} aria-label="Open focus mode" className="w-8 h-8 rounded-full bg-grad-hero text-on-brand flex items-center justify-center shadow-neu-sm hover:scale-105 transition-transform">▶</button>
                </div>
                <ProgressRing value={focusRingPct} size={110} stroke={12}>
                  <div className="text-center">
                    <p className="text-2xl font-black text-ink">{focusToday}<span className="text-sm text-muted">/{focusGoal}</span></p>
                    <p className="text-[9px] uppercase tracking-widest text-muted">sessions</p>
                  </div>
                </ProgressRing>
                <p className="text-xs text-muted mt-3 font-medium text-center">{focusRingPct >= 100 ? "Daily goal reached 🎉" : `${focusGoal - focusToday} more to hit today's goal`}</p>
              </section>

              <section className="rounded-token-lg bg-grad-hero text-on-brand p-5 shadow-glass relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute -bottom-8 -right-6 w-36 h-36 rounded-full bg-[rgb(var(--on-brand)/0.12)] blur-2xl" />
                <div className="relative z-10">
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Keep the streak</p>
                  <p className="text-4xl font-black mt-1">{streak || 0} 🔥</p>
                  <p className="text-sm opacity-85 mt-1">days in a row</p>
                </div>
                <button onClick={() => navigate("/focus-mode")} className="relative z-10 mt-4 w-full py-2.5 rounded-token-md bg-[rgb(var(--on-brand)/0.18)] hover:bg-[rgb(var(--on-brand)/0.28)] transition-colors text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2">
                  <Plus size={16} /> Start a focus session
                </button>
              </section>
            </div>

            {/* Progress overview — recharts horizontal bars */}
            <section className="rounded-token-lg bg-surface shadow-neu p-5">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink mb-1">
                <InlineEdit value={lbl("progress", "Progress overview")} onSave={(v) => setLbl("progress", v)} />
              </h3>
              <p className="text-xs text-muted mb-3">How you're tracking across everything</p>
              <ChartBox height={280}>
                {(cw) => (
                <BarChart width={cw} height={280} layout="vertical" data={progressData} margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ffProgress" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={chartBrand} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={chartBrand} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={84} tick={{ fontSize: 12, fontWeight: 700, fill: "rgb(54 54 54)" }} />
                  <Tooltip cursor={{ fill: hexToRgba(chartBrand, 0.05) }} contentStyle={CHART_TOOLTIP} formatter={(v) => [`${v}%`, "Progress"]} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="url(#ffProgress)" maxBarSize={20} background={{ fill: hexToRgba(chartBrand, 0.07) }}>
                    <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fontWeight: 800, fill: "rgb(54 54 54)" }} />
                  </Bar>
                </BarChart>
                )}
              </ChartBox>
            </section>
          </div>

          {/* Assignment board */}
          <Suspense fallback={null}>
            {WIDGET_BY_ID.kanban?.component && enabledFeatures.includes("kanban")
              ? React.createElement(WIDGET_BY_ID.kanban.component)
              : null}
          </Suspense>
        </div>

        {/* Rail: Today's tasks + all remaining feature widgets + customize, stacked */}
        <div className="lg:col-span-4 flex flex-col gap-5 min-w-0">
          <section className="rounded-token-lg bg-surface shadow-neu p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                <InlineEdit value={lbl("tasks", "Today's tasks")} onSave={(v) => setLbl("tasks", v)} />
              </h3>
              <span className="text-xs font-black text-brand">{doneTasks}/{totalTasks || 0}</span>
            </div>
            <div className="space-y-2.5">
              {todaysTasks.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">All clear — no pending tasks ✨</p>
              ) : (
                todaysTasks.map((tk, i) => (
                  <div key={tk.id || i} className="flex items-center gap-3 p-2.5 rounded-token-md hover:bg-surface-2 transition-colors">
                    <span className="w-5 h-5 rounded-full border-2 border-[rgb(var(--brand)/0.4)] flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-ink truncate">{taskTitle(tk)}</span>
                    {taskTime(tk) && <span className="text-[11px] font-bold text-muted">{taskTime(tk)}</span>}
                  </div>
                ))
              )}
            </div>
            <button onClick={() => navigate("/tasks")} className="w-full mt-4 py-2.5 rounded-token-md bg-surface-2 text-ink text-xs font-black uppercase tracking-wider hover:bg-[rgb(var(--ink)/0.06)] transition-colors">
              Open task planner
            </button>
          </section>

          <Suspense fallback={null}>
            {["notes", "timetrack", "goalsx", "habits", "finance"].filter((id) => enabledFeatures.includes(id)).map((id) => {
              const W = WIDGET_BY_ID[id]?.component;
              return W ? <div key={id} className="min-w-0">{<W />}</div> : null;
            })}
          </Suspense>

          {/* Customize tile — manage which feature cards appear */}
          <button
            onClick={() => navigate("/settings")}
            className="min-h-[120px] rounded-token-lg border-2 border-dashed border-[rgb(var(--ink)/0.16)] flex flex-col items-center justify-center gap-1.5 text-muted hover:border-[rgb(var(--brand)/0.5)] hover:text-brand transition-colors"
          >
            <span className="w-10 h-10 rounded-xl bg-[rgb(var(--ink)/0.05)] flex items-center justify-center"><Plus size={20} /></span>
            <span className="text-sm font-bold">Customize features</span>
            <span className="text-[11px]">Add or remove dashboard cards</span>
          </button>
        </div>
      </div>
    </div>
  );
}
