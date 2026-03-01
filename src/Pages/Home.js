import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../components/UserContext";
import UniCalendar from "../components/UniCalendar";
import DailyTimetableCard from "../components/DailyTimetableCard";
import FocusTimer from "../components/FocusTimer";
import Sidebar from "../components/Sidebar";

export default function Home({ timetable, completedGoals, setView, hours, minutes, seconds, isActive }) {
  const { userName } = useContext(UserContext);
  const [greeting, setGreeting] = useState("Welcome back");
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
    if (completedGoals < 15) return "Keep it up! Building a habit. 💪";
    if (completedGoals < 50) return "Academic Beast Mode! 🔥";
    return "Legendary Status! Mastered. 👑";
  };

  return (
    <div className="flex min-h-screen bg-[#f0f2f5] overflow-x-hidden">
      <Sidebar setView={setView} currentView="dashboard" />

      <main className="flex-1 lg:ml-64 p-6 md:p-10 transition-all duration-300">
        
        {/* HERO SECTION */}
        <header className="mb-12 animate-fadeInUp max-w-[1000px] mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[1000px] mx-auto items-stretch">
          
          {/* SIMPLIFIED STAT CARD: GOALS */}
          <div 
            className="relative bg-[#f0f2f5] p-10 rounded-[40px] min-w-[320px] max-w-[450px] min-h-[350px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 overflow-hidden text-center group hover:-translate-y-2 flex flex-col justify-center items-center"
          >
            <div className="flex flex-col items-center mb-4">
              <span className="text-[2.2rem] mb-2 drop-shadow-md">🎯</span>
              <h3 className="text-xl font-black text-gray-800">Goals Finished</h3>
            </div>

            <div className="text-8xl font-black text-focusPurple drop-shadow-lg mb-2">
              {completedGoals}
            </div>

            <p className="text-gray-500 font-bold mb-6 italic px-4 text-sm">
              "{getAppreciationMessage()}"
            </p>

            <div className="flex justify-center items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-green-600 text-[10px] font-black uppercase tracking-widest">Live System</span>
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