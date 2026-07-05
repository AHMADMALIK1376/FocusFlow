import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Award, CalendarClock, Layers, Wallet } from "lucide-react";
import { gradeAPI, examAPI, flashcardAPI, budgetAPI } from "../../services/api";
import { countdownLabel } from "../../features/exams/examsLogic";

const CURRENCIES = { PKR: "₨", USD: "$", EUR: "€", GBP: "£", INR: "₹" };
const TODAY = new Date().toISOString().slice(0, 10);

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
        remaining = {
          value: (budget.settings.monthlyAllowance || 0) - spent,
          cur: CURRENCIES[budget.settings.currency] || "",
        };
      }
      setData({ cgpa: gpa ? gpa.cgpa : null, exam: upcoming[0] || null, due, budget: remaining });
    })();
    return () => { alive = false; };
  }, []);

  const cards = [
    { key: "cgpa", icon: <Award size={18} />, label: "CGPA", value: data.cgpa != null ? data.cgpa.toFixed(2) : "—", sub: "Grade average", to: "/grades" },
    { key: "exam", icon: <CalendarClock size={18} />, label: "Next exam", value: data.exam ? countdownLabel(data.exam.date) : "None", sub: data.exam ? data.exam.title : "You're all clear", to: "/exams" },
    { key: "due", icon: <Layers size={18} />, label: "Cards due", value: data.due, sub: "To review", to: "/flashcards" },
    { key: "budget", icon: <Wallet size={18} />, label: "Budget left", value: data.budget ? `${data.budget.cur}${Math.round(data.budget.value).toLocaleString()}` : "—", sub: "This month", to: "/budget" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((c) => (
        <button
          key={c.key}
          onClick={() => navigate(c.to)}
          className="text-left bg-surface rounded-token-lg shadow-neu p-5 hover:-translate-y-0.5 transition-transform"
        >
          <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">{c.icon}</span>
          <p className="text-2xl font-black text-ink mt-3 truncate">{c.value}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-muted mt-0.5">{c.label}</p>
          <p className="text-[11px] text-muted mt-0.5 truncate">{c.sub}</p>
        </button>
      ))}
    </div>
  );
}
