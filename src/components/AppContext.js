import React, { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // ── Timer state ──────────────────────────────────────────────────
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // ── Persisted data state ─────────────────────────────────────────
  const [tasks, setTasksState] = useState(
    () => JSON.parse(localStorage.getItem("focus_tasks") || "[]")
  );
  const [timetable, setTimetableState] = useState(
    () => JSON.parse(localStorage.getItem("focus_timetable") || "[]")
  );
  const [calendar, setCalendarState] = useState(
    () => JSON.parse(localStorage.getItem("focus_academic_calendar") || "[]")
  );
  const [completedGoals, setCompletedGoalsState] = useState(
    () => parseInt(localStorage.getItem("focus_goals_count") || "0", 10)
  );

  // ── localStorage sync helpers ────────────────────────────────────
  const setTasks = (val) => {
    const next = typeof val === "function" ? val(tasks) : val;
    setTasksState(next);
    localStorage.setItem("focus_tasks", JSON.stringify(next));
  };

  const setTimetable = (val) => {
    const next = typeof val === "function" ? val(timetable) : val;
    setTimetableState(next);
    localStorage.setItem("focus_timetable", JSON.stringify(next));
  };

  const setCalendar = (val) => {
    const next = typeof val === "function" ? val(calendar) : val;
    setCalendarState(next);
    localStorage.setItem("focus_academic_calendar", JSON.stringify(next));
  };

  const setCompletedGoals = (val) => {
    const next = typeof val === "function" ? val(completedGoals) : val;
    setCompletedGoalsState(next);
    localStorage.setItem("focus_goals_count", String(next));
  };

  // ── Global countdown timer ───────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (seconds > 0) {
        setSeconds(s => s - 1);
      } else if (minutes > 0) {
        setMinutes(m => m - 1);
        setSeconds(59);
      } else if (hours > 0) {
        setHours(h => h - 1);
        setMinutes(59);
        setSeconds(59);
      } else {
        setIsActive(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, hours, minutes, seconds]);

  // ── Derived values ───────────────────────────────────────────────
  const pendingCount = tasks.filter(t => !t.completed).length;

  const todayLong  = new Date().toLocaleDateString("en-US", { weekday: "long"  }); // "Friday"
  const todayShort = new Date().toLocaleDateString("en-US", { weekday: "short" }); // "Fri"

  const pendingRoutine = timetable.filter(
    t => t.repeatOn?.includes(todayLong) && !t.completedDays?.includes(todayLong)
  ).length;

  const totalTasks     = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Normalize day matching — handles both "Fri" and "Friday" stored formats
  const todaysClasses = calendar.filter(item => {
    const days = Array.isArray(item.days) ? item.days : [item.days];
    return days.some(d => {
      const trimmed = (d || "").trim();
      return trimmed === todayLong || trimmed === todayShort;
    });
  });

  return (
    <AppContext.Provider value={{
      // Timer
      hours, setHours,
      minutes, setMinutes,
      seconds, setSeconds,
      isActive, setIsActive,
      // Data
      tasks, setTasks,
      timetable, setTimetable,
      calendar, setCalendar,
      completedGoals, setCompletedGoals,
      // Derived
      pendingCount,
      pendingRoutine,
      progress,
      todaysClasses,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);