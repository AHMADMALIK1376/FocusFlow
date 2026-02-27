import React, { useState, useEffect, useContext } from "react";
import Splash from "./components/Splash";
import AuthPage from "./Pages/Authpage"; 
import Navbar from "./components/Navbar";
import Home from "./Pages/Home";
import TaskManager from "./components/TaskManager";
import TimelinePage from "./Pages/TimelinePage";
import TimetablePage from "./Pages/DailyRoutine";
import FocusModePage from "./Pages/FocusModePage";
import { UserProvider, UserContext } from "./components/UserContext"; 
import "./Style/App.css";

// 1. Created a wrapper to use Context properly
function AppContent() {
  const { userName } = useContext(UserContext);
  const [view, setView] = useState("dashboard");

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // 2. State management for data
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("focus_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [timetable, setTimetable] = useState(() => {
    const saved = localStorage.getItem("focus_timetable");
    return saved ? JSON.parse(saved) : [];
  });

  const [completedGoals, setCompletedGoals] = useState(() => {
    const savedGoals = localStorage.getItem("focus_goals_count");
    return savedGoals ? parseInt(savedGoals) : 0;
  });

  // 3. Logic: If userName becomes null or Guest, force them to Auth view
  useEffect(() => {
    if (!userName || userName === "Guest") {
      setView("auth");
    }
  }, [userName]);

  // Timer Logic
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

  // LocalStorage Sync
  useEffect(() => { localStorage.setItem("focus_goals_count", completedGoals); }, [completedGoals]);
  useEffect(() => { localStorage.setItem("focus_timetable", JSON.stringify(timetable)); }, [timetable]);

  const saveAndSetTasks = (newTasks) => {
    setTasks(newTasks);
    localStorage.setItem("focus_tasks", JSON.stringify(newTasks));
  };

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const pendingRoutine = timetable.filter((task) =>
    task.repeatOn.includes(todayName) &&
    !task.completedDays.includes(todayName)).length;
  
  const progress = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)
    : 0;

  // 4. Conditional Rendering based on view and auth status
  return (
    <div className="App">
      {view === "auth" ? (
        <AuthPage setView={setView} />
      ) : (
        <>
          <Navbar 
            taskCount={pendingCount}
            routineCount={pendingRoutine}
            progress={progress}
            setView={setView}
          />

          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div> 
          </div>

          <main className="main-content">
            {view === "dashboard" && (
              <Home 
                tasks={tasks} 
                timetable={timetable} 
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
          </main>
        </>
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