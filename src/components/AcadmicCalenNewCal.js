import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const btn = "magic-btn px-8 py-3.5 rounded-2xl bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] text-focusPurple font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(108,92,231,0.2)] active:scale-95 active:shadow-inner";

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
        <div className="w-full max-w-[560px] bg-[#F1F5F9] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] border border-white/50 text-center mt-4">
          <span className="text-5xl mb-5 block">📋</span>
          <h2 className="text-2xl font-black text-[#1E293B] mb-2">Create a Calendar</h2>
          <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">
            Name your timetable to get started
          </p>
          <input
            type="text"
            placeholder="e.g. Spring 2026 — CS Department"
            value={newCalTitle}
            onChange={(e) => setNewCalTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full p-5 rounded-2xl bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-500 placeholder:text-gray-300 border-none mb-5 transition-all"
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
            <h2 className="text-2xl font-black text-[#1E293B] tracking-tight leading-none">
              Add Subject
            </h2>
            {activeCalendar && (
              <span className="text-xs font-bold text-[#7C3AED] opacity-70 uppercase tracking-widest">
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
        <div className="flex gap-3 mt-5 p-5 rounded-2xl bg-[#F1F5F9] shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] border border-white/40">
          <span className="text-lg self-center">📋</span>
          <input
            autoFocus
            type="text"
            placeholder="New calendar title..."
            value={newCalTitle}
            onChange={(e) => setNewCalTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 bg-transparent outline-none font-bold text-gray-600 placeholder:text-gray-300"
          />
          <button onClick={handleCreate} className={btn}>
            ✦ Create
          </button>
        </div>
      )}
    </div>
  );
}