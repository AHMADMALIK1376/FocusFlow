// src/Pages/DailyRoutine.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { routineAPI, getToken } from "../services/api";

// Use SHORT day names for backend compatibility
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DailyRoutine() {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState("");
  const [time, setTime] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRoutines = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const routines = await routineAPI.getAll();
        setSchedule(routines);
      } catch (error) {
        console.error('Failed to fetch routines:', error);
        setError(error.message || 'Failed to load routines');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutines();
  }, []);

  const handleDayToggle = (day) => {
    if (day === "All Days") {
      setSelectedDays(prev => prev.includes("All Days") ? [] : ["All Days"]);
    } else {
      setSelectedDays((prev) => {
        const filtered = prev.filter(d => d !== "All Days");
        return filtered.includes(day) ? filtered.filter(d => d !== day) : [...filtered, day];
      });
    }
  };

  const addSlot = async (e) => {
    e.preventDefault();
    if (!activity || !time) {
      alert("Please enter activity name and time");
      return;
    }

    let newDays;
    if (selectedDays.includes("All Days")) {
      newDays = [...daysOfWeek];
    } else if (selectedDays.length > 0) {
      newDays = selectedDays;
    } else {
      alert("Please select at least one day");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Adding routine:', { activity, time, repeatOn: newDays });
      const newRoutine = await routineAPI.create({ activity, time, repeatOn: newDays });
      console.log('Routine added:', newRoutine);
      setSchedule([...schedule, newRoutine.routine].sort((a, b) => a.time.localeCompare(b.time)));
      setActivity("");
      setTime("");
      setSelectedDays([]);
    } catch (error) {
      console.error('Failed to add routine:', error);
      alert(error.message || 'Failed to add routine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRoutine = async () => {
    if (!window.confirm("Are you sure you want to clear your entire weekly routine?")) return;
    try {
      await routineAPI.deleteAll();
      setSchedule([]);
    } catch (error) {
      console.error('Failed to reset routine:', error);
      alert('Failed to reset routine.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="bg-focus/10 border border-focus/30 rounded-token-lg p-6 text-center max-w-md">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-xl font-black text-focus mb-2">Error Loading Routines</h2>
          <p className="text-muted mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="magic-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-10 px-4 flex flex-col items-center">

      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-brand">Create Your Routine</h1>
        <p className="text-muted text-sm mt-2">Add activities for each day of the week</p>
      </div>

      {/* ADD FORM */}
      <div className="w-full max-w-2xl bg-surface p-8 rounded-token-xl shadow-neu mb-8">
        <h3 className="text-xl font-black text-ink mb-6">✍️ Add New Activity</h3>

        <div className="mb-5">
          <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Select Days:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDayToggle("All Days")}
              className={`px-4 py-2 rounded-token-sm font-bold text-xs transition-all
                ${selectedDays.includes("All Days") ? "bg-grad-hero text-on-brand shadow-neu-sm" : "bg-surface-2 text-muted hover:bg-[rgb(var(--ink)/0.06)]"}`}
            >
              All Days
            </button>
            {daysOfWeek.map(day => (
              <button
                key={day}
                disabled={selectedDays.includes("All Days")}
                onClick={() => handleDayToggle(day)}
                className={`px-4 py-2 rounded-token-sm font-bold text-xs transition-all
                  ${selectedDays.includes("All Days") ? "opacity-40 cursor-not-allowed" :
                    selectedDays.includes(day) ? "bg-grad-hero text-on-brand shadow-neu-sm" : "bg-surface-2 text-muted hover:bg-[rgb(var(--ink)/0.06)]"}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={addSlot} className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="e.g. Morning Gym"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="flex-1 min-w-[180px] p-4 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm"
            required
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="p-4 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm"
            required
          />
          <button type="submit" className="magic-btn" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to Routine"}
          </button>
        </form>
      </div>

      {/* NAVIGATION */}
      <div className="text-center space-y-3">
        <button onClick={() => navigate("/routine/view")} className="magic-btn text-sm">
          👁️ View Timeline →
        </button>
        <p className="text-[10px] text-muted">
          {schedule.length} activities in your weekly routine
        </p>
      </div>

      {/* FOOTER */}
      <footer className="mt-10 flex gap-4 flex-wrap justify-center">
        <button onClick={() => navigate("/dashboard")} className="magic-btn">🏠 Dashboard</button>
        {schedule.length > 0 && (
          <button onClick={resetRoutine} className="magic-btn text-focus">🗑 Reset All</button>
        )}
      </footer>
    </div>
  );
}
