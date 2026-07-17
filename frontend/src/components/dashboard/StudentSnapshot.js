import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Layers } from "lucide-react";
import { gradeAPI, examAPI, flashcardAPI, budgetAPI } from "../../services/api";
import { countdownLabel } from "../../features/exams/examsLogic";
import { ProgressRing, GaugeArc } from "../ui";

const CURRENCIES = { PKR: "₨", USD: "$", EUR: "€", GBP: "£", INR: "₹" };
const TODAY = new Date().toISOString().slice(0, 10);
const MONTH_YEAR = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

// A student-focused snapshot strip: CGPA, next exam, flashcards due, budget left.
// Each fetch is independent (allSettled) so one failure never blanks the row.
export default function StudentSnapshot() {
  const navigate = useNavigate();
  const [data, setData] = useState({ cgpa: null, exam: null, due: 0, budget: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      const results = await Promise.allSettled([
        gradeAPI.getGpa(),
        examAPI.getAll(),
        flashcardAPI.getDecks(),
        budgetAPI.get(),
      ]);
      if (!alive) return;
      const [gpa, exams, decks, budget] = results.map((r) => (r.status === "fulfilled" ? r.value : null));
      const upcoming = (exams || [])
        .filter((e) => !e.isDone && e.date >= TODAY)
        .sort((a, b) => a.date.localeCompare(b.date));
      const due = (decks || []).reduce((s, d) => s + (d.dueCount || 0), 0);
      let remaining = null;
      if (budget && budget.settings) {
        const month = TODAY.slice(0, 7);
        const spent = (budget.entries || [])
          .filter((e) => e.type === "expense" && (e.date || "").slice(0, 7) === month)
          .reduce((s, e) => s + e.amount, 0);
        const allowance = budget.settings.monthlyAllowance || 0;
        const value = allowance - spent;
        remaining = {
          value,
          spent,
          allowance,
          cur: CURRENCIES[budget.settings.currency] || "",
          pct: allowance ? Math.round((value / allowance) * 100) : 0,
        };
      }
      setData({ cgpa: gpa ? gpa.cgpa : null, exam: upcoming[0] || null, due, budget: remaining });
    })();
    return () => { alive = false; };
  }, []);

  const gpaPct = data.cgpa != null ? Math.round((data.cgpa / 4) * 100) : 0;
  const b = data.budget;
  const money = (n) => `${b?.cur || ""}${Math.round(n || 0).toLocaleString()}`;

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
          className={`text-left bg-surface rounded-token-lg shadow-neu p-5 hover:-translate-y-0.5 transition-transform ${c.gauge ? "flex items-center gap-3" : ""}`}
        >
          {c.gauge ? (
            <>
              <ProgressRing value={c.pct} size={64} stroke={7} className="shrink-0">
                <span className="text-[10px] font-black text-ink leading-none px-1 text-center">{c.value}</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted truncate">{c.label}</p>
                <p className="text-[11px] text-muted mt-0.5 truncate">{c.sub}</p>
              </div>
            </>
          ) : (
            <>
              <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">{c.icon}</span>
              <p className="text-2xl font-black text-ink mt-3 truncate">{c.value}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted mt-0.5">{c.label}</p>
              <p className="text-[11px] text-muted mt-0.5 truncate">{c.sub}</p>
            </>
          )}
        </button>
      ))}

      {/* Budget — big centered gauge with a hover breakdown */}
      <button
        onClick={() => navigate("/budget")}
        className="group relative text-left bg-surface rounded-token-lg shadow-neu p-5 hover:-translate-y-0.5 transition-transform overflow-hidden flex flex-col"
      >
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Budget</p>
          <p className="text-[10px] text-muted mt-0.5">{MONTH_YEAR}</p>
        </div>
        <div className="relative flex-1 flex items-center justify-center mt-1 min-h-[120px]">
          <GaugeArc value={b?.pct ?? 0} size={140} stroke={16}>
            <p className="text-base font-black text-ink leading-tight">{b ? money(b.value) : "—"}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted mt-0.5">Remaining</p>
          </GaugeArc>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface/95 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-token-lg">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wide text-muted font-bold">Total</p>
              <p className="text-sm font-black text-ink">{b ? money(b.allowance) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wide text-muted font-bold">Remaining</p>
              <p className="text-sm font-black text-ink">{b ? money(b.value) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wide text-muted font-bold">Spent</p>
              <p className="text-sm font-black text-ink">{b ? money(b.spent) : "—"}</p>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
