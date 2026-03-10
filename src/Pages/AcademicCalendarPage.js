import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/AppContext";
import AcadmicCalenAddsection from "../components/AcadmicCalenAddsection";
import AcadmicCalenNewCal from "../components/AcadmicCalenNewCal";

export default function AcademicCalendarPage() {
  const navigate = useNavigate();
  const { calendar, setCalendar } = useApp();

  const [calendars, setCalendarsRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem("focus_cal_list") || "[]"); } catch { return []; }
  });
  const [activeCalendarId, setActiveCalendarIdRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem("focus_cal_active") || "null"); } catch { return null; }
  });

  const setCalendars = (val) => {
    const next = typeof val === "function" ? val(calendars) : val;
    localStorage.setItem("focus_cal_list", JSON.stringify(next));
    setCalendarsRaw(next);
  };

  const setActiveCalendarId = (val) => {
    localStorage.setItem("focus_cal_active", JSON.stringify(val));
    setActiveCalendarIdRaw(val);
  };

  const activeCalendar = calendars.find(c => c.id === activeCalendarId);

  // ── EMPTY STATE: delegated to AcadmicCalenNewCal ─────────────────
  if (calendars.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">
        <PageHeader />
        <AcadmicCalenNewCal
          isEmpty
          onCreateNewCalendar={(title) => {
            const id = Date.now();
            setCalendars(prev => [...prev, { id, title }]);
            setActiveCalendarId(id);
          }}
        />
      </div>
    );
  }

  // ── ACTIVE STATE ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">
      <PageHeader />

      {/* Add Subject Card */}
      <AcadmicCalenAddsection
        activeCalendar={activeCalendar}
        onAddEntry={({ subject, startTime, endTime, lrNo, days }) => {
          setCalendar(prev => [...prev, {
            id: Date.now(),
            calendarId: activeCalendarId,
            subject, startTime, endTime, lrNo, days,
          }]);
        }}
        onCreateNewCalendar={(title) => {
          const id = Date.now();
          setCalendars(prev => [...prev, { id, title }]);
          setActiveCalendarId(id);
        }}
      />

      {/* Footer */}
      <footer className="w-full flex justify-center gap-6 px-4 mt-4 flex-wrap">
        <button onClick={() => navigate("/academic/view")} className="magic-btn flex items-center gap-2">
          📅 View Calendars →
        </button>
        <button onClick={() => navigate("/dashboard")} className="magic-btn flex items-center gap-2">
          🏠 Dashboard
        </button>
      </footer>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="w-full max-w-[1100px] mb-12 text-center">
      <h1 className="text-4xl md:text-5xl font-black text-[#7C3AED] tracking-[0.2em] uppercase mb-3 drop-shadow-sm">
        Academic Time Table
      </h1>
      <div className="flex items-center justify-center gap-4">
        <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
        <p className="text-sm font-bold tracking-[0.3em] text-gray-400 uppercase">
          Spring <span className="text-[#7C3AED]">( 2026 )</span>
        </p>
        <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
      </div>
    </header>
  );
}