import React, { useState, useEffect } from "react";
import { useUser } from "../components/UserContext";
import { useApp } from "../components/AppContext";
import UniCalendar from "../components/UniCalendar";
import DailyTimetableCard from "../components/DailyTimetableCard";
import FocusTimer from "../components/FocusTimer";
import GoalCard from "../components/GoalCard";
import AcademicCalendar from "../components/AcademicCalendar";
import Sidebar from "../components/Sidebar";
import { dashboardAPI, getToken } from "../services/api";

export default function Home() {
  const { userName } = useUser();
  const { completedGoals, setCompletedGoals } = useApp();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = getToken();
        if (!token) { setLoading(false); return; }
        const data = await dashboardAPI.getSummary();
        if (data) { setDashboardData(data); if (data.completedGoals !== undefined) setCompletedGoals(data.completedGoals); }
      } catch (error) { console.error('Failed to fetch dashboard data:', error); }
      finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [setCompletedGoals]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-6 md:p-10 flex flex-col items-center">
        <header className="mb-12 w-full max-w-[1000px] mx-auto text-center">
          <div className="inline-block px-4 py-1 bg-purple-100 text-focusPurple rounded-full text-xs font-bold mb-4 shadow-sm">🕒 {currentTime}</div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-800 tracking-tight">
            {greeting},{" "}<span className="bg-gradient-to-r from-focusPurple to-purple-500 bg-clip-text text-transparent">{userName}.</span>
          </h1>
          <p className="text-gray-500 text-lg mt-4 font-medium">
            Your University life, organized. You have crushed <b className="text-focusPurple">{dashboardData?.completedGoals || completedGoals}</b> targets so far.
          </p>
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