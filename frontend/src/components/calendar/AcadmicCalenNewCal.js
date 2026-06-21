import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const btn = "magic-btn px-8 py-3.5 rounded-token-lg font-bold transition-all duration-300 hover:-translate-y-1 active:scale-95";

export default function AcadmicCalenNewCal({ activeCalendar, onCreateNewCalendar, isEmpty = false }) {
  const navigate = useNavigate();
  const [showInput, setShowInput] = useState(false);
  const [newCalTitle, setNewCalTitle] = useState("");

  const handleCreate = () => {
    if (!newCalTitle.trim()) return alert("Please enter a title!");
    onCreateNewCalendar(newCalTitle.trim());
    setNewCalTitle("");
    setShowInput(false);
  };

  // ── Empty state: full centered create-calendar card ───────────────
  if (isEmpty) {
    return (
      <>
        <div className="w-full max-w-[560px] bg-surface p-10 rounded-token-xl shadow-neu border border-[rgb(var(--ink)/0.08)] text-center mt-4">
          <span className="text-5xl mb-5 block">📋</span>
          <h2 className="text-2xl font-black text-ink mb-2">Create a Calendar</h2>
          <p className="text-muted text-xs font-bold mb-8 uppercase tracking-widest">
            Name your timetable to get started
          </p>
          <input
            type="text"
            placeholder="e.g. Spring 2026 — CS Department"
            value={newCalTitle}
            onChange={(e) => setNewCalTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full p-5 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-bold text-ink placeholder:text-muted border-none mb-5 transition-all"
          />
          <button onClick={handleCreate} className={`w-full ${btn}`}>
            ✦ Create New Calendar
          </button>
        </div>
        <div className="mt-10">
          <button onClick={() => navigate("/dashboard")} className={btn}>
            🏠 Dashboard
          </button>
        </div>
      </>
    );
  }

  // ── Normal mode: header + inline new calendar toggle ─────────────
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✍️</span>
          <div>
            <h2 className="text-2xl font-black text-ink tracking-tight leading-none">
              Add Subject
            </h2>
            {activeCalendar && (
              <span className="text-xs font-bold text-brand opacity-70 uppercase tracking-widest">
                → {activeCalendar.title}
              </span>
            )}
          </div>
        </div>

        <button onClick={() => { setShowInput(p => !p); setNewCalTitle(""); }} className={btn}>
          {showInput ? "✕ Cancel" : "📋 New Calendar"}
        </button>
      </div>

      {showInput && (
        <div className="flex gap-3 mt-5 p-5 rounded-token-md bg-surface-2 shadow-neu-inset border border-[rgb(var(--ink)/0.08)]">
          <span className="text-lg self-center">📋</span>
          <input
            autoFocus
            type="text"
            placeholder="New calendar title..."
            value={newCalTitle}
            onChange={(e) => setNewCalTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 bg-transparent outline-none font-bold text-ink placeholder:text-muted"
          />
          <button onClick={handleCreate} className={btn}>
            ✦ Create
          </button>
        </div>
      )}
    </div>
  );
}
