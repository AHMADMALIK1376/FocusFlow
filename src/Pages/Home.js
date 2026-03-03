import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../components/UserContext";
import UniCalendar from "../components/UniCalendar";
import DailyTimetableCard from "../components/DailyTimetableCard";
import FocusTimer from "../components/FocusTimer";
import Sidebar from "../components/Sidebar";
import GoalCard from "../components/GoalCard";

export default function Home({
  timetable,
  completedGoals,
  setView,
  hours,
  minutes,
  seconds,
  isActive,
}) {
  const { userName } = useContext(UserContext);
  const [greeting, setGreeting] = useState("Welcome back");
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f0f2f5] overflow-x-hidden">
      <Sidebar setView={setView} currentView="dashboard" />

      <main className="flex-1 p-6 md:p-10 transition-all duration-300 flex flex-col items-center">
        
        <header className="mb-12 animate-fadeInUp w-full max-w-[1000px] mx-auto text-center flex flex-col items-center">
          <div className="inline-block px-4 py-1 bg-purple-100 text-focusPurple rounded-full text-xs font-bold mb-4 shadow-sm">
            🕒 {currentTime}
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-gray-800 tracking-tight">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-focusPurple to-purple-500 bg-clip-text text-transparent">
              {userName}.
            </span>
          </h1>

          <p className="text-gray-500 text-lg mt-4 font-medium">
            Your University life, organized. You have crushed{" "}
            <b className="text-focusPurple">{completedGoals}</b> targets so far.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1000px] w-full mx-auto items-stretch">
          
          <GoalCard completedGoals={completedGoals} />

          <FocusTimer
            setView={setView}
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            isActive={isActive}
          />

          <DailyTimetableCard schedule={timetable} setView={setView} />

          <UniCalendar setView={setView} />

        </div>
      </main>
    </div>
  );
}