import React, { createContext, useContext, useState, useEffect } from "react";
import { taskAPI, routineAPI, dashboardAPI, getToken } from "../services/api";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // ── Timer state ──────────────────────────────────────────────────
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // ── Data state ─────────────────────────────────────────
  const [tasks, setTasksState] = useState([]);
  const [timetable, setTimetableState] = useState([]);
  const [calendar, setCalendarState] = useState([]);
  const [completedGoals, setCompletedGoalsState] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Load data from API on mount ───────────────────────────────────
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Load tasks
        const fetchedTasks = await taskAPI.getAll();
        setTasksState(fetchedTasks);
        
        // Load routines
        const fetchedRoutines = await routineAPI.getAll();
        setTimetableState(fetchedRoutines);
        
        // Load dashboard stats for completed goals
        const stats = await dashboardAPI.getStats();
        if (stats && stats.totalGoalsCompleted !== undefined) {
          setCompletedGoalsState(stats.totalGoalsCompleted);
        }
        
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);

  // ── State setters with API sync ────────────────────────────────────
  const setTasks = async (val) => {
    const next = typeof val === "function" ? val(tasks) : val;
    setTasksState(next);
  };

  const setTimetable = async (val) => {
    const next = typeof val === "function" ? val(timetable) : val;
    setTimetableState(next);
  };

  const setCalendar = async (val) => {
    const next = typeof val === "function" ? val(calendar) : val;
    setCalendarState(next);
  };

  const setCompletedGoals = (val) => {
    const next = typeof val === "function" ? val(completedGoals) : val;
    setCompletedGoalsState(next);
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

  const todayLong = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayShort = new Date().toLocaleDateString("en-US", { weekday: "short" });

  const pendingRoutine = timetable.filter(
    t => t.repeatOn?.includes(todayLong) && !t.completedDays?.includes(todayLong)
  ).length;

  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Normalize day matching — handles both "Fri" and "Friday" stored formats
  const todaysClasses = calendar.filter(item => {
    const days = Array.isArray(item.days) ? item.days : [item.days];
    return days.some(d => {
      const trimmed = (d || "").trim();
      return trimmed === todayLong || trimmed === todayShort;
    });
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#f0f2f5] flex items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
      setTodaysClasses: (classes) => setCalendarState(classes),
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);