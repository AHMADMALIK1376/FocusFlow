// src/components/context/AppContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { taskAPI, routineAPI, dashboardAPI, focusAPI, attendanceAPI, getToken } from "../../services/api";

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
  const [streak, setStreak] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingRoutineCount, setPendingRoutineCount] = useState(0);
  const [totalFocusSessions, setTotalFocusSessions] = useState(0);
  const [todaysClasses, setTodaysClassesState] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── SINGLE FUNCTION TO LOAD ALL DATA - CALLED ONCE ─────────────────
  const loadAllData = async () => {
    // Prevent multiple loads
    if (dataLoaded) return;
    
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      
      console.log('📦 Loading all dashboard data in ONE batch...');
      
      // Fetch ALL data in parallel with Promise.all
      const [
        fetchedTasks,
        fetchedRoutines,
        dashboardComplete,
        focusSessions,
        attendance
      ] = await Promise.all([
        taskAPI.getAll().catch(err => {
          console.error('Tasks fetch error:', err);
          return [];
        }),
        routineAPI.getAll().catch(err => {
          console.error('Routines fetch error:', err);
          return [];
        }),
        dashboardAPI.getComplete().catch(err => {
          console.error('Dashboard complete error:', err);
          return { data: {} };
        }),
        focusAPI.getSessions().catch(err => {
          console.error('Focus sessions error:', err);
          return [];
        }),
        attendanceAPI.getSummary().catch(err => {
          console.error('Attendance summary error:', err);
          return [];
        })
      ]);
      
      // Update all states
      setTasksState(fetchedTasks);
      setTimetableState(fetchedRoutines);
      
      if (dashboardComplete?.data) {
        setCompletedGoalsState(dashboardComplete.data.completedGoals || 0);
        setStreak(dashboardComplete.data.streakCount || 0);
        setPendingTasksCount(dashboardComplete.data.pendingTasks || 0);
        setPendingRoutineCount(dashboardComplete.data.pendingRoutine || 0);
        setTotalFocusSessions(dashboardComplete.data.totalFocusSessions || 0);
        setTodaysClassesState(dashboardComplete.data.todaysClasses || []);
      }
      
      // If dashboard complete didn't have focus sessions, use the direct call
      if (focusSessions.length > 0 && totalFocusSessions === 0) {
        setTotalFocusSessions(focusSessions.length);
      }
      
      setAttendanceSummary(attendance);
      
      setDataLoaded(true);
      console.log('✅ All data loaded successfully');
      console.log(`   Tasks: ${fetchedTasks.length}`);
      console.log(`   Routines: ${fetchedRoutines.length}`);
      console.log(`   Focus Sessions: ${focusSessions.length}`);
      console.log(`   Attendance Subjects: ${attendance.length}`);
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data only once on mount
  useEffect(() => {
    loadAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── State setters ────────────────────────────────────────────────
  const setTasks = (val) => {
    const next = typeof val === "function" ? val(tasks) : val;
    setTasksState(next);
  };

  const setTimetable = (val) => {
    const next = typeof val === "function" ? val(timetable) : val;
    setTimetableState(next);
  };

  const setCalendar = (val) => {
    const next = typeof val === "function" ? val(calendar) : val;
    setCalendarState(next);
    // Also update todaysClasses when calendar changes
    const todayShort = new Date().toLocaleDateString("en-US", { weekday: "short" });
    const newTodaysClasses = next.filter(item => {
      const days = Array.isArray(item.days) ? item.days : [item.days];
      return days.some(d => (d || "").trim() === todayShort);
    });
    setTodaysClassesState(newTodaysClasses);
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

  // Use SHORT day format for backend compatibility
  const todayShort = new Date().toLocaleDateString("en-US", { weekday: "short" });

  // Filter routines using short day format
  const pendingRoutine = timetable.filter(
    t => t.repeatOn?.includes(todayShort) && !t.completedDays?.includes(todayShort)
  ).length;

  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-canvas flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted font-medium animate-pulse">Loading your dashboard...</p>
        </div>
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
      
      // Additional stats from combined endpoint
      streak,
      pendingTasksCount,
      pendingRoutineCount,
      totalFocusSessions,
      todaysClasses,
      attendanceSummary,
      
      // Derived
      pendingCount,
      pendingRoutine,
      progress,
      setTodaysClasses: setTodaysClassesState,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};