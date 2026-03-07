import React, { useState, useEffect, useContext } from "react";
import Splash from "./components/Splash";
import AuthPage from "./Pages/Authpage"; 
import Navbar from "./components/Navbar";
import Home from "./Pages/Home";
import TaskManager from "./components/TaskManager";
import TimelinePage from "./Pages/TimelinePage";
import TimetablePage from "./Pages/DailyRoutine";
import FocusModePage from "./Pages/FocusModePage";
import AcademicCalendarPage from "./Pages/AcademicCalendarPage"; // 1. Import the new page
import { UserProvider, UserContext } from "./components/UserContext"; 

function AppContent() {
  const { userName } = useContext(UserContext);
  const [view, setView] = useState("dashboard");

  // Timer State
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Data State
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("focus_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [timetable, setTimetable] = useState(() => {
    const saved = localStorage.getItem("focus_timetable");
    return saved ? JSON.parse(saved) : [];
  });

  // 2. New Academic Calendar State with Persistence
  const [calendar, setCalendar] = useState(() => {
    const saved = localStorage.getItem("focus_academic_calendar");
    return saved ? JSON.parse(saved) : [];
  });

  const [completedGoals, setCompletedGoals] = useState(() => {
    const savedGoals = localStorage.getItem("focus_goals_count");
    return savedGoals ? parseInt(savedGoals) : 0;
  });

  // Auth Guard
  useEffect(() => {
    if (!userName || userName === "Guest") {
      setView("auth");
    }
  }, [userName]);

  // Global Timer Logic
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) { setSeconds(s => s - 1); } 
        else if (minutes > 0) { setMinutes(m => m - 1); setSeconds(59); } 
        else if (hours > 0) { setHours(h => h - 1); setMinutes(59); setSeconds(59); } 
        else { setIsActive(false); }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, hours, minutes, seconds]);

  // Persistence
  useEffect(() => { localStorage.setItem("focus_goals_count", completedGoals); }, [completedGoals]);
  useEffect(() => { localStorage.setItem("focus_timetable", JSON.stringify(timetable)); }, [timetable]);
  
  // 3. Save Academic Calendar to LocalStorage automatically
  useEffect(() => { 
    localStorage.setItem("focus_academic_calendar", JSON.stringify(calendar)); 
  }, [calendar]);

  const saveAndSetTasks = (newTasks) => {
    setTasks(newTasks);
    localStorage.setItem("focus_tasks", JSON.stringify(newTasks));
  };

  // Stats Calculation
  const pendingCount = tasks.filter((t) => !t.completed).length;
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const pendingRoutine = timetable.filter((task) =>
    task.repeatOn.includes(todayName) &&
    !task.completedDays.includes(todayName)).length;
  
  const progress = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans selection:bg-focusPurple/20">
      {view === "auth" ? (
        <AuthPage setView={setView} />
      ) : (
        <div className="flex flex-col">
          {/* NAVIGATION */}
          <Navbar 
            taskCount={pendingCount}
            routineCount={pendingRoutine}
            progress={progress}
            setView={setView}
          />

          {/* GLOBAL PROGRESS BAR (Floating) */}
          <div className="fixed top-0 left-0 w-full h-1.5 z-[100] bg-gray-200/50">
            <div 
              className="h-full bg-gradient-to-r from-focusPurple to-purple-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(108,92,231,0.5)]" 
              style={{ width: `${progress}%` }}
            ></div> 
          </div>

          {/* VIEW ROUTING */}
          <main className="animate-fadeIn">
            {view === "dashboard" && (
              <Home 
                tasks={tasks} 
                timetable={timetable} 
                calendar={calendar} // 4. Pass calendar to Home for the Dashboard Card
                completedGoals={completedGoals}
                setView={setView} 
                hours={hours}
                minutes={minutes}
                seconds={seconds}
                isActive={isActive}
              />
            )}

            {view === "focus-mode" && (
              <FocusModePage 
                setView={setView}
                hours={hours} setHours={setHours}
                minutes={minutes} setMinutes={setMinutes}
                seconds={seconds} setSeconds={setSeconds}
                isActive={isActive} setIsActive={setIsActive}
              />
            )}

            {view === "timeline" && (
              <TaskManager 
                tasks={tasks}
                setTasks={saveAndSetTasks}
                setCompletedGoals={setCompletedGoals} 
                setView={setView}
              />
            )}

            {view === "roadmap" && (
              <TimelinePage 
                tasks={tasks}
                setTasks={saveAndSetTasks}
                setView={setView}
              />
            )}

            {view === "timetablePage" && (
              <TimetablePage 
                schedule={timetable}
                setSchedule={setTimetable}
                setView={setView} 
              />
            )}

            {/* 5. NEW ROUTE: Academic Calendar Page */}
            {view === "academicPage" && (
              <AcademicCalendarPage 
                calendar={calendar}
                setCalendar={setCalendar}
                setView={setView} 
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <Splash onComplete={() => setLoading(false)} />;
  }

  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;