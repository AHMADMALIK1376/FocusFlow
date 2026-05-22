import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI, getToken } from "../services/api";

export default function UniCalendar() {
  const navigate = useNavigate();
  const [streakCount, setStreakCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        const data = await dashboardAPI.getStats();
        if (data && data.currentStreak !== undefined) {
          setStreakCount(data.currentStreak);
        }
      } catch (error) {
        console.error('Failed to fetch streak:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStreak();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 min-w-[320px] max-w-[450px] bg-[#f0f2f5] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-transform duration-300 hover:-translate-y-2 text-center group flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[320px] max-w-[450px] bg-[#f0f2f5] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-transform duration-300 hover:-translate-y-2 text-center group">
      
      {/* CARD HEADER */}
      <div className="flex flex-col items-center mb-4">
        <span className="text-[2.2rem] inline-flex items-center justify-center mb-2 drop-shadow-md transition-transform duration-300 group-hover:scale-110">
          🔥
        </span>
        <h3 className="text-xl font-black text-gray-800 tracking-tight">Daily Streak</h3>
      </div>

      {/* STREAK COUNT - Now from Database */}
      <div className="text-[5rem] font-black text-focusPurple my-2 drop-shadow-[2px_4px_6px_rgba(0,0,0,0.1)]">
        {streakCount}
      </div>

      <p className="text-gray-500 font-medium mb-8">Keep the momentum going!</p>

      {/* ACTION BUTTON */}
      <button className="magic-btn" onClick={() => navigate("/tasks")}>
        📓 Open Task Planner
      </button>
    </div>
  );
}