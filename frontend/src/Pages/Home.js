// src/Pages/Home.js — Professional "Azure" dashboard (Crextio-inspired)
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/auth/UserContext";
import { useApp } from "../components/context/AppContext";
import { usePreferences } from "../preferences/usePreferences";
import { ProgressRing } from "../components/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function greetingFor(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Defensive task field readers (task shape varies across the app)
const taskTitle = (t) => t.text || t.task_text || t.title || t.activity || "Untitled task";
const taskDone = (t) => Boolean(t.completed || t.is_completed || t.isCompleted);
const taskDate = (t) => t.date || t.task_date || t.taskDate || t.dueDate || null;
const taskTime = (t) => t.time || t.task_time || t.taskTime || "";

// ── Mini horizontal metric bar ──────────────────────────────────────────────
function MetricBar({ label, value, tone = "brand" }) {
  const toneBar = { brand: "bg-brand", info: "bg-info", success: "bg-success", warn: "bg-warn" }[tone] || "bg-brand";
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
        <span className="text-[11px] font-black text-ink">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[rgb(var(--ink)/0.08)] overflow-hidden">
        <div className={`h-full rounded-full ${toneBar} transition-all duration-700 ease-spring`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

// ── Big headline stat ────────────────────────────────────────────────────────
function BigStat({ value, label, icon }) {
  return (
    <div className="text-center px-2">
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-3xl md:text-4xl font-black text-ink tracking-tight">{value}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-0.5">{label}</p>
    </div>
  );
}

// ── Weekly activity bar chart (inline SVG, token colors) ─────────────────────
function WeeklyBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="flex items-end justify-between gap-2 h-40 mt-2">
      {data.map((d, i) => {
        const totalH = (d.total / max) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full flex-1 flex items-end justify-center">
              <div
                className="w-full max-w-[26px] rounded-t-lg bg-[rgb(var(--brand)/0.12)] relative overflow-hidden transition-all"
                style={{ height: `${Math.max(totalH, 6)}%` }}
              >
                <div
                  className="absolute bottom-0 inset-x-0 rounded-t-lg bg-grad-hero transition-all duration-700 ease-spring"
                  style={{ height: `${d.total ? (d.done / d.total) * 100 : 0}%`, animationDelay: `${i * 60}ms` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-bold text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
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
  const { profile, activeDashboard } = usePreferences();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const tmr = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tmr);
  }, []);

  const displayName = profile?.displayName || userName || "there";
  const role = profile?.role || profile?.segment || "Member";
  const workspace = activeDashboard?.name || "My Workspace";
  const greeting = greetingFor(now.getHours());

  // ── Derived metrics (real data) ──
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(taskDone).length;
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : (progress || 0);
  const routinePctBase = timetable.length || 0;
  const routineDone = Math.max(0, routinePctBase - (pendingRoutine ?? pendingRoutineCount ?? 0));
  const routinePct = routinePctBase ? Math.round((routineDone / routinePctBase) * 100) : 0;
  const attendancePct = Math.round(
    attendanceSummary?.overallPercentage ?? attendanceSummary?.percentage ?? 0
  );

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

  const todaysTasks = useMemo(
    () => tasks.filter((tk) => !taskDone(tk)).slice(0, 5),
    [tasks]
  );

  const focusGoal = 4; // sessions/day target
  const focusToday = Math.min(totalFocusSessions || 0, focusGoal);
  const focusRingPct = Math.round((focusToday / focusGoal) * 100);

  if (contextLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-10 pt-2 max-w-[1240px] mx-auto w-full">
        {/* ── HERO ROW ───────────────────────────────────────────── */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8 animate-[fadeInUp_0.6s_ease-out]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[3px] text-brand mb-2">{workspace}</p>
            <h1 className="text-4xl md:text-5xl font-black text-ink tracking-tight leading-none">
              {greeting},{" "}
              <span className="bg-grad-hero bg-clip-text text-transparent">{displayName}.</span>
            </h1>
            <p className="text-muted text-base mt-3 font-medium">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · You've completed{" "}
              <b className="text-ink">{completedGoals || 0}</b> goals so far.
            </p>
          </div>

          {/* Metric strip */}
          <div className="flex items-center gap-5 bg-surface rounded-token-lg shadow-neu px-5 py-4">
            <div className="hidden sm:flex flex-col gap-3 pr-5 border-r border-[rgb(var(--ink)/0.08)]">
              <MetricBar label="Tasks" value={taskPct} tone="brand" />
              <MetricBar label="Routine" value={routinePct} tone="info" />
            </div>
            <BigStat value={streak || 0} label="Streak" icon="🔥" />
            <BigStat value={totalFocusSessions || 0} label="Focus" />
            <BigStat value={completedGoals || 0} label="Goals" />
          </div>
        </header>

        {/* ── BENTO GRID ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 auto-rows-min">
          {/* Profile card (navy) */}
          <section className="lg:col-span-4 lg:row-span-2 rounded-token-lg bg-grad-hero text-on-brand p-6 shadow-glass relative overflow-hidden min-h-[300px] flex flex-col">
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[rgb(var(--brand-soft)/0.25)] blur-2xl" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">Profile</span>
              <button onClick={() => navigate("/settings")} className="text-[11px] font-bold opacity-80 hover:opacity-100 transition-opacity">Edit →</button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 py-4">
              <div className="w-20 h-20 rounded-2xl bg-[rgb(var(--on-brand)/0.18)] backdrop-blur flex items-center justify-center text-3xl font-black mb-4">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <h3 className="text-xl font-black">{displayName}</h3>
              <p className="text-sm opacity-80 capitalize">{role}</p>
              <span className="mt-3 px-3 py-1 rounded-full bg-[rgb(var(--on-brand)/0.16)] text-xs font-bold">
                {profile?.segment && profile.segment !== "Unknown" ? profile.segment : "FocusFlow Member"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 relative z-10 pt-4 border-t border-[rgb(var(--on-brand)/0.18)]">
              <div className="text-center"><p className="text-lg font-black">{streak || 0}</p><p className="text-[9px] uppercase tracking-wider opacity-70">Streak</p></div>
              <div className="text-center"><p className="text-lg font-black">{doneTasks}</p><p className="text-[9px] uppercase tracking-wider opacity-70">Done</p></div>
              <div className="text-center"><p className="text-lg font-black">{totalFocusSessions || 0}</p><p className="text-[9px] uppercase tracking-wider opacity-70">Focus</p></div>
            </div>
          </section>

          {/* Weekly activity chart */}
          <section className="lg:col-span-8 rounded-token-lg bg-surface shadow-neu p-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">Activity this week</h3>
                <p className="text-xs text-muted mt-0.5">Tasks completed per day</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-muted"><span className="w-2.5 h-2.5 rounded-sm bg-grad-hero" /> Done</span>
                <span className="flex items-center gap-1.5 text-muted"><span className="w-2.5 h-2.5 rounded-sm bg-[rgb(var(--brand)/0.12)]" /> Total</span>
              </div>
            </div>
            <WeeklyBars data={weekData} />
          </section>

          {/* Focus ring */}
          <section className="lg:col-span-4 rounded-token-lg bg-surface shadow-neu p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">Focus today</h3>
              <button onClick={() => navigate("/focus-mode")} aria-label="Open focus mode" className="w-8 h-8 rounded-full bg-grad-hero text-on-brand flex items-center justify-center shadow-neu-sm hover:scale-105 transition-transform">▶</button>
            </div>
            <ProgressRing value={focusRingPct} size={140} stroke={14}>
              <div className="text-center">
                <p className="text-3xl font-black text-ink">{focusToday}<span className="text-base text-muted">/{focusGoal}</span></p>
                <p className="text-[10px] uppercase tracking-widest text-muted">sessions</p>
              </div>
            </ProgressRing>
            <p className="text-xs text-muted mt-3 font-medium text-center">{focusRingPct >= 100 ? "Daily goal reached 🎉" : `${focusGoal - focusToday} more to hit today's goal`}</p>
          </section>

          {/* Today's tasks checklist */}
          <section className="lg:col-span-4 rounded-token-lg bg-surface shadow-neu p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">Today's tasks</h3>
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

          {/* Schedule + attendance */}
          <section className="lg:col-span-4 rounded-token-lg bg-surface shadow-neu p-6 flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink mb-4">Today's schedule</h3>
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
      </div>
  );
}
