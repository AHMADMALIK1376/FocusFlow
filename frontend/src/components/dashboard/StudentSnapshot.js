import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Layers } from "lucide-react";
import { gradeAPI, examAPI, flashcardAPI, budgetAPI } from "../../services/api";
import { countdownLabel } from "../../features/exams/examsLogic";
import { ProgressRing } from "../ui";
import BudgetGauge from "./BudgetGauge";

const CURRENCIES = { PKR: "Rs ", USD: "$", EUR: "€", GBP: "£", INR: "₹" };
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
          className={`text-left bg-surface rounded-token-lg shadow-neu p-5 hover:-translate-y-0.5 transition-transform ${c.gauge ? "flex items-center gap-3 min-h-[157px]" : ""}`}
        >
          {c.gauge ? (
            <>
              <ProgressRing value={c.pct} size={96} stroke={10} className="shrink-0">
                <span className="text-sm font-black text-ink leading-none px-1 text-center">{c.value}</span>
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

      {/* Budget — 3 tri-state indicator boxes (Total / Spent / Remaining) + text */}
      <button
        onClick={() => navigate("/budget")}
        className="text-left bg-surface rounded-token-lg shadow-neu p-5 hover:-translate-y-0.5 transition-transform flex items-center gap-3 min-h-[157px]"
      >
        <BudgetGauge allowance={b?.allowance ?? 0} remaining={b?.value ?? 0} spent={b?.spent ?? 0} cur={b?.cur ?? ""} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted truncate">Budget</p>
          <p className="text-[11px] text-muted mt-0.5 truncate">{MONTH_YEAR}</p>
          <p className="text-sm font-black text-ink mt-0.5 truncate">{b ? `${b.cur}${Math.round(b.value).toLocaleString()}` : "—"}</p>
        </div>
      </button>
    </div>
  );
}
