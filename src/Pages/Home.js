import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../components/UserContext";
import UniCalendar from "../components/UniCalendar";
import DailyTimetableCard from "../components/DailyTimetableCard";
import FocusTimer from "../components/FocusTimer";
import Sidebar from "../components/Sidebar";

export default function Home({ timetable, completedGoals, setView, hours, minutes, seconds, isActive }) {
  const { userName } = useContext(UserContext);
  const [greeting, setGreeting] = useState("Welcome back");
  const [isExpanded, setIsExpanded] = useState(false); // Controls the Liquid effect
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getAppreciationMessage = () => {
    if (completedGoals === 0) return "Complete tasks to see your performance!";
    if (completedGoals < 5) return "Great start! Keep the momentum going. 🚀";
    if (completedGoals < 15) return "Keep it up! You're building a solid habit. 💪";
    if (completedGoals < 25) return "Good job! You're becoming a productivity pro. ✨";
    if (completedGoals < 50) return "Academic Beast Mode! Your dedication is inspiring. 🔥";
    return "Legendary Status! You've mastered your timeline. 👑";
  };

  return (
    <div className="flex min-h-screen bg-[#f0f2f5] overflow-x-hidden">
      <Sidebar setView={setView} currentView="dashboard" />

      <main className="flex-1 lg:ml-64 p-6 md:p-10 transition-all duration-300">
        
        {/* HERO SECTION */}
        <header className="mb-12 animate-fadeInUp">
          <div className="inline-block px-4 py-1 bg-purple-100 text-focusPurple rounded-full text-xs font-bold mb-4 shadow-sm">
            🕒 {currentTime}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-800 tracking-tight">
            {greeting}, <span className="bg-gradient-to-r from-focusPurple to-purple-500 bg-clip-text text-transparent">{userName}.</span>
          </h1>
          <p className="text-gray-500 text-lg mt-4 font-medium">
            Your University life, organized. You have crushed <b className="text-focusPurple">{completedGoals}</b> targets so far.
          </p>
        </header>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* STAT CARD: GOALS (With Liquid & Trash Effect) */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`neu-card liquid-card p-10 cursor-pointer transition-all hover:-translate-y-2 text-center ${isExpanded ? 'liquid-card-expanded' : ''}`}
          >
            {/* The Liquid Face Back */}
            <div className="face-back">
               <h3 className="text-focusPurple font-black text-xl mb-2">Detailed View</h3>
               <p className="text-gray-500 px-6">You are in the top 5% of users this week! Keep pushing those boundaries.</p>
               <button className="mt-6 text-sm font-bold text-gray-400">Click to close</button>
            </div>

            {/* Trash Bin Header Logic */}
            <div className="card-header-group flex justify-between items-center w-full mb-6">
               <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Performance</span>
               <button className="hover-delete-btn" onClick={(e) => { e.stopPropagation(); /* Add Reset Logic Here */ }}>
                  <span className="hover-delete-text text-[10px]">Reset Stats</span>
               </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-5xl mb-4 filter drop-shadow-md">🎯</span>
              <h3 className="text-xl font-black text-gray-700 uppercase tracking-widest text-sm">Goals Finished</h3>
            </div>
            
            <div className="text-7xl font-black text-focusPurple my-4 drop-shadow-sm">
              {completedGoals}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-green-500 font-bold text-sm flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Sync Active
              </span>
              <p className="text-focusPurple/80 font-semibold italic text-sm mt-2">
                "{getAppreciationMessage()}"
              </p>
            </div>
          </div>

          {/* FOCUS TIMER CARD */}
          <FocusTimer 
            setView={setView}
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            isActive={isActive}
          />

          {/* DAILY TIMETABLE CARD */}
          <DailyTimetableCard schedule={timetable} setView={setView} />

          {/* CALENDAR CARD */}
          <UniCalendar setView={setView} />

        </div>
      </main>
    </div>
  );
}