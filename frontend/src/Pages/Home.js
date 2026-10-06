// src/Pages/Home.js — FocusFlow dashboard (editable, image profile card, live graphs)
import React, { useMemo, useState, useEffect, Suspense } from "react";
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Smile, Pencil, Plus, Flame, Play } from "lucide-react";
import { useUser } from "../components/auth/UserContext";
import { useApp } from "../components/context/AppContext";
import { usePreferences } from "../preferences/usePreferences";
import { ProgressRing, cx, MascotPicker, mascotSrc, mascotSheets, mascotName } from "../components/ui";
import Mascot from "../components/common/Mascot";
import ProgressCubeStack from "../components/charts/ProgressCubeStack";
import { WIDGET_BY_ID } from "../dashboard/registry";
import Clock from "../components/dashboard/Clock";
import StudentSnapshot from "../components/dashboard/StudentSnapshot";
import AttendanceHeatmap from "../components/dashboard/AttendanceHeatmap";
import BudgetSnapshotCard from "../components/dashboard/BudgetSnapshotCard";

const FEATURE_IDS = ["notes", "goalsx", "habits", "kanban", "timetrack", "finance"];

// Defensive task field readers (task shape varies across the app)
const taskTitle = (t) => t.text || t.task_text || t.title || t.activity || "Untitled task";
const taskDone = (t) => Boolean(t.completed || t.is_completed || t.isCompleted);
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
    streak,
    completedGoals,
    totalFocusSessions,
    attendanceSummary,
    progress,
    routineTodayTotal,
    routineTodayDone,
    loading: contextLoading,
  } = useApp();
  const { profile, activeDashboard, updateProfile, updateActiveDashboard } = usePreferences();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const tmr = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tmr);
  }, []);

  const displayName = profile?.displayName || userName || "there";
  const workspace = activeDashboard?.name || "My Workspace";
  const greeting = t(now.getHours() < 12 ? "dashboard.goodMorning" : now.getHours() < 18 ? "dashboard.goodAfternoon" : "dashboard.goodEvening");
  const avatarUrl = profile?.avatarUrl || null;
  const mascot = mascotSrc(profile?.mascot);
  const mascotSheet = mascotSheets(profile?.mascot);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Editable labels (per dashboard)
  const labels = activeDashboard?.labels || {};
  const lbl = (key, def) => labels[key] || def;
  const setLbl = (key, val) => updateActiveDashboard({ labels: { ...labels, [key]: val } });

  // ── Derived metrics (real data) ──
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(taskDone).length;
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : (progress || 0);
  // Today's routine items ticked off (same count as the navbar and the donut).
  const routinePct = routineTodayTotal ? Math.round(((routineTodayDone || 0) / routineTodayTotal) * 100) : 0;
  const attendancePct = Math.round(attendanceSummary?.overallPercentage ?? attendanceSummary?.percentage ?? 0);

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

  if (contextLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner message="Loading your dashboard…" />
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

          {/* Attendance heatmap — GitHub-contribution style */}
          <section className="rounded-token-lg bg-surface shadow-neu p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                <InlineEdit value={lbl("activity", "Attendance heatmap")} onSave={(v) => setLbl("activity", v)} />
              </h3>
            </div>
            <AttendanceHeatmap />
          </section>
        </div>

        {/* Right rail: profile + schedule */}
        <div className="lg:col-span-4 flex flex-col gap-5 min-w-0">
          {/* Profile card — full-cover image + overlay text */}
          <section className={cx(
            "group rounded-token-lg bg-grad-hero p-6 shadow-glass relative overflow-hidden min-h-[260px] lg:min-h-[460px] flex flex-col",
            avatarUrl ? "text-white" : "text-on-brand"
          )}>
            {avatarUrl && <img src={avatarUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />}
            {/* Coral (not black) fade under the text when a photo is set */}
            {avatarUrl && <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--brand)/0.9)] via-[rgb(var(--brand)/0.35)] to-transparent" />}

            <div className="flex items-center justify-end gap-3 relative z-10">
              <button onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                <Smile size={13} /> Change mascot
              </button>
            </div>

            <div className={cx("flex-1 flex flex-col relative z-10", avatarUrl ? "justify-end" : "items-center justify-center text-center")}>
              {!avatarUrl && mascot && (
                <div className="mb-3 drop-shadow-lg">
                  <Mascot directions={mascotSheet.directions} reactions={mascotSheet.reactions} size={240} label={mascotName(profile?.mascot)} />
                </div>
              )}
              {!avatarUrl && !mascot && (
                <button onClick={() => setPickerOpen(true)} title="Pick a mascot"
                  className="w-20 h-20 rounded-2xl bg-[rgb(var(--on-brand)/0.18)] backdrop-blur flex items-center justify-center text-3xl font-black mb-4 hover:bg-[rgb(var(--on-brand)/0.28)] transition-colors">
                  {displayName.slice(0, 1).toUpperCase()}
                </button>
              )}
              {!avatarUrl && !mascot && (
                <button onClick={() => setPickerOpen(true)} className="mb-3 text-xs font-bold underline underline-offset-2">
                  Pick a mascot
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
            <MascotPicker open={pickerOpen} onClose={() => setPickerOpen(false)} value={profile?.mascot}
              onPick={(id) => updateProfile({ mascot: id, avatarUrl: null })} />
          </section>

          {/* Budget — this month at a glance (today's classes are in the snapshot tile) */}
          <BudgetSnapshotCard />
        </div>

        {/* Lower main column: Focus/Streak + Progress side by side, then the Assignment board */}
        <div className="lg:col-span-8 flex flex-col gap-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Focus ring + Keep the streak, stacked */}
            <div className="flex flex-col gap-5">
              <section className="rounded-token-lg bg-grad-sage-card shadow-neu p-5 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                    <InlineEdit value={lbl("focus", "Focus today")} onSave={(v) => setLbl("focus", v)} />
                  </h3>
                  <button onClick={() => navigate("/focus-mode")} aria-label="Open focus mode" className="w-8 h-8 rounded-full bg-grad-hero text-on-brand flex items-center justify-center shadow-neu-sm hover:scale-105 transition-transform"><Play size={14} fill="currentColor" className="ml-0.5" /></button>
                </div>
                <ProgressRing value={focusRingPct} size={110} stroke={12}>
                  <div className="text-center">
                    <p className="text-2xl font-black text-ink">{focusToday}<span className="text-sm text-muted">/{focusGoal}</span></p>
                    <p className="text-[9px] uppercase tracking-widest text-muted">sessions</p>
                  </div>
                </ProgressRing>
                <p className="text-xs text-muted mt-3 font-medium text-center">{focusRingPct >= 100 ? "Daily goal reached — nice work!" : `${focusGoal - focusToday} more to hit today's goal`}</p>
              </section>

              <section className="rounded-token-lg bg-grad-hero text-on-brand p-5 shadow-glass relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute -bottom-8 -right-6 w-36 h-36 rounded-full bg-[rgb(var(--on-brand)/0.12)] blur-2xl" />
                <div className="relative z-10">
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Keep the streak</p>
                  <p className="text-4xl font-black mt-1 flex items-center gap-2">{streak || 0} <Flame size={30} strokeWidth={2} /></p>
                  <p className="text-sm opacity-85 mt-1">days in a row</p>
                </div>
                <button onClick={() => navigate("/focus-mode")} className="relative z-10 mt-4 w-full py-2.5 rounded-token-md bg-[rgb(var(--on-brand)/0.18)] hover:bg-[rgb(var(--on-brand)/0.28)] transition-colors text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2">
                  <Plus size={16} /> Start a focus session
                </button>
              </section>
            </div>

            {/* Progress overview — 3D extruded bars. A flex column so the chart
                can take the card's spare height (it spreads the cubes out). */}
            <section className="rounded-token-lg bg-surface shadow-neu p-5 flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink mb-1">
                <InlineEdit value={lbl("progress", "Progress overview")} onSave={(v) => setLbl("progress", v)} />
              </h3>
              <p className="text-xs text-muted mb-3">How you're tracking across everything</p>
              <ProgressCubeStack data={progressData} />
            </section>
          </div>

          {/* Assignment board */}
          <Suspense fallback={null}>
            {WIDGET_BY_ID.kanban?.component && enabledFeatures.includes("kanban")
              ? React.createElement(WIDGET_BY_ID.kanban.component)
              : null}
          </Suspense>
        </div>

        {/* Rail beside the board: today's tasks + study time */}
        <div className="lg:col-span-4 flex flex-col gap-5 min-w-0">
          <section className="tone-coral rounded-token-lg bg-grad-hero shadow-clay-brand p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink">
                <InlineEdit value={lbl("tasks", "Today's tasks")} onSave={(v) => setLbl("tasks", v)} />
              </h3>
              <span className="text-xs font-black text-brand">{doneTasks}/{totalTasks || 0}</span>
            </div>
            <div className="space-y-2.5">
              {todaysTasks.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">All clear — no pending tasks</p>
              ) : (
                todaysTasks.map((tk, i) => (
                  <div key={tk.id || i} className="flex items-center gap-3 p-2.5 rounded-token-md hover:bg-surface/60 transition-colors">
                    <span className="w-5 h-5 rounded-full bg-surface shadow-neu-inset flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-ink truncate">{taskTitle(tk)}</span>
                    {taskTime(tk) && <span className="text-[11px] font-bold text-muted">{taskTime(tk)}</span>}
                  </div>
                ))
              )}
            </div>
            <button onClick={() => navigate("/projects")} className="w-full mt-4 py-2.5 rounded-token-md bg-surface text-ink shadow-neu-sm text-xs font-black uppercase tracking-wider hover:-translate-y-0.5 transition-transform">
              Open assignment board
            </button>
          </section>

          <Suspense fallback={null}>
            {enabledFeatures.includes("timetrack") && WIDGET_BY_ID.timetrack?.component
              ? React.createElement(WIDGET_BY_ID.timetrack.component)
              : null}
          </Suspense>
        </div>

        {/* Under the board: remaining feature cards in an even grid, so each
            row lines up instead of one long column down the right side. */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          <Suspense fallback={null}>
            {["goalsx", "habits", "notes", "finance"].filter((id) => enabledFeatures.includes(id)).map((id) => {
              const W = WIDGET_BY_ID[id]?.component;
              return W ? <div key={id} className="min-w-0">{<W />}</div> : null;
            })}
          </Suspense>

        </div>

        {/* Customize — a slim bar under the grid (never an orphan tile) */}
        <button
          onClick={() => navigate("/settings")}
          className="lg:col-span-12 h-14 rounded-token-lg border-2 border-dashed border-[rgb(var(--ink)/0.2)] flex items-center justify-center gap-3 text-muted hover:border-[rgb(var(--brand)/0.6)] hover:text-brand transition-colors"
        >
          <span className="w-8 h-8 rounded-xl bg-surface shadow-neu-sm flex items-center justify-center"><Plus size={16} /></span>
          <span className="text-sm font-bold">Customize features</span>
          <span className="text-[11px] hidden sm:inline">· add or remove dashboard cards</span>
        </button>
      </div>
    </div>
  );
}
