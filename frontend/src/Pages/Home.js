// src/Pages/Home.js
import React, { useState, useEffect } from "react";
import { useUser } from "../components/auth/UserContext";
import { useApp } from "../components/context/AppContext";
import UniCalendar from "../components/dashboard/UniCalendar";
import DailyTimetableCard from "../components/dashboard/DailyTimetableCard";
import FocusTimer from "../components/dashboard/FocusTimer";
import GoalCard from "../components/dashboard/GoalCard";
import AcademicCalendar from "../components/calendar/AcademicCalendar";
import Sidebar from "../components/layout/Sidebar";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export default function Home() {
  const { userName } = useUser();
  const { 
    completedGoals, 
    streak, 
    pendingTasksCount, 
    pendingRoutineCount,
    loading: contextLoading 
  } = useApp();
  
  const [greeting, setGreeting] = useState("Welcome back");
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Loading state - use context loading
  if (contextLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <LoadingSpinner fullScreen={false} message="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-6 md:p-10 flex flex-col items-center">
        <header className="mb-12 w-full max-w-[1000px] mx-auto text-center">
          <div className="inline-block px-4 py-1 bg-purple-100 text-focusPurple rounded-full text-xs font-bold mb-4 shadow-sm">
            🕒 {currentTime}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-800 tracking-tight">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-focusPurple to-purple-500 bg-clip-text text-transparent">
              {userName || 'Student'}.
            </span>
          </h1>
          <p className="text-gray-500 text-lg mt-4 font-medium">
            Your University life, organized. You have crushed{' '}
            <b className="text-focusPurple">{completedGoals || 0}</b> targets so far.
          </p>
          
          {/* Quick stats row using cached context data */}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-orange-500">🔥</span>
              <span className="text-gray-600">{streak || 0} day streak</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-500">📋</span>
              <span className="text-gray-600">{pendingTasksCount || 0} tasks pending</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-500">🕒</span>
              <span className="text-gray-600">{pendingRoutineCount || 0} routines left</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1000px] w-full mx-auto items-stretch">
          <GoalCard />
          <UniCalendar />
          <DailyTimetableCard />
          <AcademicCalendar />
          <FocusTimer />
        </div>
      </div>
    </div>
  );
}