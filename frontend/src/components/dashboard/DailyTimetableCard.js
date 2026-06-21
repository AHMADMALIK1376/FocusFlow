// src/components/dashboard/DailyTimetableCard.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Card, Button } from "../ui";

export default function DailyTimetableCard() {
  const navigate = useNavigate();
  const { timetable } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);

  const today = new Date();
  const todayNameShort = today.toLocaleDateString('en-US', { weekday: 'short' });
  const todayNameFull = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const todayRoutines = timetable.filter(activity =>
    activity.repeatOn?.includes(todayNameShort)
  );

  const pending = todayRoutines.filter(r => !r.completedDays?.includes(todayNameShort)).length;
  const completed = todayRoutines.filter(r => r.completedDays?.includes(todayNameShort)).length;

  return (
    <Card className={`min-w-[320px] max-w-[450px] transition-all duration-500 overflow-hidden text-center hover:-translate-y-2 relative ${isExpanded ? "min-h-[320px]" : "min-h-[280px]"}`}>
      {/* Front Face */}
      <div className={`transition-all duration-500 ${isExpanded ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        <div className="flex flex-col items-center mb-4">
          <span className="text-[2.2rem] mb-2 drop-shadow-md">🕒</span>
          <h3 className="text-xl font-black text-ink">{todayNameFull} Routine</h3>
        </div>
        <div className="text-8xl font-black text-brand drop-shadow-lg mb-2">
          {pending}
        </div>
        <p className="text-muted font-bold mb-6">Remaining Tasks</p>
        <Button variant="primary" onClick={() => navigate("/routine")}>
          📅 Manage Schedule
        </Button>
      </div>

      {/* Back Face */}
      <div className={`absolute inset-0 bg-surface-2 flex flex-col items-center justify-center transition-all duration-700 ease-spring z-10
        ${isExpanded ? "[clip-path:circle(150%_at_50%_90%)] pointer-events-auto" : "[clip-path:circle(0%_at_50%_90%)] pointer-events-none"}`}>
        <div className="flex flex-col items-center">
          <span className="text-[2.2rem] mb-2">🏅</span>
          <h3 className="text-xl font-black text-ink">Total Completed</h3>
        </div>
        <div className="text-8xl font-black text-brand drop-shadow-lg my-2">
          {completed}
        </div>
        <div className="mt-5">
          <p className="font-bold text-lg text-ink leading-none">{todayNameFull}</p>
          <p className="text-muted font-medium">{dateStr}</p>
        </div>
      </div>

      <button
        className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-brand text-on-brand text-xl flex items-center justify-center z-20 shadow-neu-sm hover:scale-110 hover:rotate-12 transition-transform"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Switch View"
      >
        {isExpanded ? "↩" : "📊"}
      </button>
    </Card>
  );
}
