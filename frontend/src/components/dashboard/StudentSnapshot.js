import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Layers, School } from "lucide-react";
import { gradeAPI, examAPI, flashcardAPI } from "../../services/api";
import { countdownLabel } from "../../features/exams/examsLogic";
import { dayProgress, fmt12 } from "../../features/schedule/todayClasses";
import { useApp } from "../context/AppContext";
import { ProgressRing } from "../ui";

// A little colour on the snapshot: the CGPA tile is coral.
const TINT = { cgpa: "tone-coral bg-grad-hero !shadow-clay-brand" };

const TODAY = new Date().toISOString().slice(0, 10);
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// Today's classes: how many, then each remaining class in turn (on now / next
// / later) with its start–end time, switching every 10 seconds; the day's
// total once they're all over.
function TodayClassesTile() {
  const navigate = useNavigate();
  const { todaysClasses = [] } = useApp();
  const [mins, setMins] = useState(nowMinutes);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => { setMins(nowMinutes()); setTick((n) => n + 1); }, 10000);
    return () => clearInterval(t);
  }, []);
  const p = dayProgress(todaysClasses, mins);
  const idx = p.upcoming.length ? tick % p.upcoming.length : 0;
  const show = p.upcoming[idx];
  const label = show === p.current ? "On now" : show === p.next ? "Next" : "Later";

  return (
    <button
      onClick={() => navigate("/subjects")}
      className="text-left bg-grad-sage-card rounded-token-lg shadow-neu p-4 hover:-translate-y-0.5 transition-transform flex flex-col min-h-[157px]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="w-10 h-10 rounded-2xl shadow-neu-sm flex items-center justify-center bg-surface text-on-sage shrink-0">
          <School size={18} />
        </span>
        {p.total > 0 && !p.allDone && <span className="text-[11px] font-bold text-muted mt-1">{p.done}/{p.total} done</span>}
      </div>
      <p className="text-2xl font-black text-ink mt-2 leading-none">
        {p.total} <span className="text-sm font-bold text-muted">class{p.total === 1 ? "" : "es"} today</span>
      </p>
      {p.total === 0 ? (
        <p className="text-[11px] text-muted mt-1.5">No classes — free day</p>
      ) : p.allDone ? (
        <p className="text-[11px] font-bold text-success mt-1.5">All {p.total} done for today</p>
      ) : (
        <div key={idx} className="mt-1.5 min-w-0 animate-[fadeIn_0.4s_ease-in-out]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-brand">{label}</p>
            {p.upcoming.length > 1 && (
              <span className="flex gap-1" aria-label={`${idx + 1} of ${p.upcoming.length}`}>
                {p.upcoming.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-brand" : "bg-surface"}`} />
                ))}
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-ink truncate">{show.subject}</p>
          <p className="text-[11px] text-muted truncate">
            {fmt12(show.startTime)}
            {show.endTime ? `–${fmt12(show.endTime)}` : ""}
            {show.room ? ` · ${show.room}` : ""}
          </p>
        </div>
      )}
    </button>
  );
}

// A student-focused snapshot strip: CGPA, next exam, flashcards due, today's classes.
// Each fetch is independent (allSettled) so one failure never blanks the row.
export default function StudentSnapshot() {
  const navigate = useNavigate();
  const [data, setData] = useState({ cgpa: null, exam: null, due: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      const results = await Promise.allSettled([gradeAPI.getGpa(), examAPI.getAll(), flashcardAPI.getDecks()]);
      if (!alive) return;
      const [gpa, exams, decks] = results.map((r) => (r.status === "fulfilled" ? r.value : null));
      const upcoming = (exams || [])
        .filter((e) => !e.isDone && e.date >= TODAY)
        .sort((a, b) => a.date.localeCompare(b.date));
      const due = (decks || []).reduce((s, d) => s + (d.dueCount || 0), 0);
      setData({ cgpa: gpa ? gpa.cgpa : null, exam: upcoming[0] || null, due });
    })();
    return () => { alive = false; };
  }, []);

  const gpaPct = data.cgpa != null ? Math.round((data.cgpa / 4) * 100) : 0;

  const cards = [
    { key: "cgpa", gauge: true, label: "CGPA", value: data.cgpa != null ? data.cgpa.toFixed(2) : "—", pct: gpaPct, sub: "Grade average", to: "/grades" },
    { key: "exam", icon: <CalendarClock size={18} />, label: "Next exam", value: data.exam ? countdownLabel(data.exam.date) : "None", sub: data.exam ? data.exam.title : "You're all clear", to: "/exams" },
    { key: "due", icon: <Layers size={18} />, label: "Cards due", value: data.due, sub: "To review", to: "/flashcards" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      {cards.map((c) => (
        <button
          key={c.key}
          onClick={() => navigate(c.to)}
          className={`text-left ${TINT[c.key] || "bg-surface"} rounded-token-lg shadow-neu p-5 hover:-translate-y-0.5 transition-transform ${c.gauge ? "flex flex-col items-center justify-center text-center gap-2 min-h-[157px]" : ""}`}
        >
          {c.gauge ? (
            <>
              <span className="rounded-full bg-surface shadow-neu-sm p-1.5">
                <ProgressRing value={c.pct} size={88} stroke={8} className="shrink-0">
                  <span className="text-sm font-black text-ink leading-none px-1 text-center">{c.value}</span>
                </ProgressRing>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{c.label}</p>
                <p className="text-[11px] text-muted mt-0.5">{c.sub}</p>
              </div>
            </>
          ) : (
            <>
              <span className={`w-10 h-10 rounded-2xl shadow-neu-sm flex items-center justify-center ${TINT[c.key] ? "bg-surface text-brand" : "bg-grad-sage text-on-sage"}`}>{c.icon}</span>
              <p className="text-2xl font-black text-ink mt-3 truncate">{c.value}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted mt-0.5">{c.label}</p>
              <p className="text-[11px] text-muted mt-0.5 truncate">{c.sub}</p>
            </>
          )}
        </button>
      ))}

      <TodayClassesTile />
    </div>
  );
}
