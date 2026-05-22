import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "./AppContext";
import Lottie from "lottie-react";
import fireAnimation from "../assets/animation/Sandy Loading.json";
import { focusAPI, getToken } from "../services/api";

export default function FocusTimer() {
  const navigate = useNavigate();
  const { hours, minutes, seconds, isActive } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  
  const displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  useEffect(() => {
    const fetchSessionCount = async () => {
      try {
        const token = getToken();
        if (!token) return;
        
        const sessions = await focusAPI.getSessions();
        setTotalSessions(sessions.length);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
    };
    
    fetchSessionCount();
  }, []);

  return (
    <div className={`relative bg-[#f0f2f5] p-10 rounded-[40px] flex-1 min-w-[320px] max-w-[450px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 overflow-hidden text-center group hover:-translate-y-2
      ${isExpanded ? "min-h-[320px]" : "min-h-[280px]"}`}>

      {/* FRONT FACE */}
      <div className={`transition-all duration-500 ${isExpanded ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        <div className="flex flex-col items-center mb-4">
          <span className="text-[2.2rem] mb-2 drop-shadow-md">⚡</span>
          <h3 className="text-xl font-black text-gray-800">Deep Work</h3>
        </div>

        {/* Fire Lottie animation replacing 🚀 */}
        <div className="w-24 h-24 mx-auto mb-4">
          <Lottie animationData={fireAnimation} loop={true} className="w-full h-full" />
        </div>

        <p className="text-gray-500 font-bold mb-6">Set custom timers & track sessions.</p>
        <button className="magic-btn" onClick={() => navigate("/focus-mode")}>
          ⏱️ Enter Focus Mode
        </button>
      </div>

      {/* BACK FACE */}
      <div className={`absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-2
        ${isExpanded ? "[clip-path:circle(150%_at_50%_90%)] pointer-events-auto" : "[clip-path:circle(0%_at_50%_90%)] pointer-events-none"}`}>
        <div className="flex flex-col items-center mb-6">
          <span className="text-[2.2rem] mb-2">{isActive ? "☄️" : "🪐"}</span>
          <h3 className="text-xl font-black text-gray-800">Flow State</h3>
        </div>

        {/* TIMER ORB */}
        <div className={`relative w-[150px] h-[150px] rounded-full bg-[#f0f2f5] shadow-[10px_10px_20px_#d1d9e6,-10px_-10px_20px_#ffffff] flex items-center justify-center border-4 border-transparent transition-all duration-500
          ${isActive ? "animate-orbPulse border-focusPurple/20" : ""}`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-focusPurple/5 to-transparent blur-sm"></div>
          <div className={`text-2xl font-black transition-colors duration-300 ${isActive ? "text-focusPurple" : "text-gray-400"}`}>
            {displayTime}
          </div>
        </div>
        
        {/* Total Sessions from Database */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Total Sessions</p>
          <p className="text-xl font-black text-focusPurple">{totalSessions}</p>
        </div>
      </div>

      {/* LIQUID TRIGGER BUTTON */}
      <button
        className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-focusPurple text-white text-xl flex items-center justify-center z-10 shadow-[0_4px_15px_rgba(108,92,231,0.4)] hover:scale-110 hover:rotate-12 transition-transform"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "↩" : "⏳"}
      </button>
    </div>
  );
}