import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { routineAPI, getToken } from "../services/api";

export default function DailyTimetableCard() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [todayData, setTodayData] = useState({ pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    const fetchTodayRoutine = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        const routines = await routineAPI.getToday();
        
        const pending = routines.filter(r => !r.completed).length;
        const completed = routines.filter(r => r.completed).length;
        
        setTodayData({ pending, completed });
      } catch (error) {
        console.error('Failed to fetch routine:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodayRoutine();
  }, []);

  if (loading) {
    return (
      <div className="relative bg-[#f0f2f5] p-10 rounded-[40px] flex-1 min-w-[320px] max-w-[450px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 text-center group hover:-translate-y-2 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`relative bg-[#f0f2f5] p-10 rounded-[40px] flex-1 min-w-[320px] max-w-[450px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 overflow-hidden text-center group hover:-translate-y-2
      ${isExpanded ? "min-h-[320px]" : "min-h-[280px]"}`}>

      {/* FRONT FACE */}
      <div className={`transition-all duration-500 ${isExpanded ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        <div className="flex flex-col items-center mb-4">
          <span className="text-[2.2rem] mb-2 drop-shadow-md">🕒</span>
          <h3 className="text-xl font-black text-gray-800">{todayName} Routine</h3>
        </div>
        <div className="text-8xl font-black text-focusPurple drop-shadow-lg mb-2">
          {todayData.pending}
        </div>
        <p className="text-gray-500 font-bold mb-6">Remaining Tasks</p>
        <button className="magic-btn" onClick={() => navigate("/routine")}>
          📅 Manage Schedule
        </button>
      </div>

      {/* BACK FACE */}
      <div className={`absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-2
        ${isExpanded ? "[clip-path:circle(150%_at_50%_90%)] pointer-events-auto" : "[clip-path:circle(0%_at_50%_90%)] pointer-events-none"}`}>
        <div className="flex flex-col items-center">
          <span className="text-[2.2rem] mb-2">🏅</span>
          <h3 className="text-xl font-black text-gray-800">Total Task Completed</h3>
        </div>
        <div className="text-8xl font-black text-focusPurple drop-shadow-lg my-2">
          {todayData.completed}
        </div>
        <div className="mt-5">
          <p className="font-bold text-lg text-gray-800 leading-none">{todayName}</p>
          <p className="text-gray-500 font-medium">{dateStr}</p>
        </div>
      </div>

      {/* LIQUID TRIGGER BUTTON — kept as circular FAB */}
      <button
        className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-focusPurple text-white text-xl flex items-center justify-center z-10 shadow-[0_4px_15px_rgba(108,92,231,0.4)] hover:scale-110 hover:rotate-12 transition-transform"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Switch View"
      >
        {isExpanded ? "↩" : "📊"}
      </button>
    </div>
  );
}