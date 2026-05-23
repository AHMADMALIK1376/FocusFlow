import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "./AppContext";
import Lottie from "lottie-react";
import fireAnimation from "../assets/animation/work managemnt.json";
import { getToken } from "../services/api";

export default function AcademicCalendar() {
  const navigate = useNavigate();
  const { setTodaysClasses } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classCount, setClassCount] = useState(0);
  const [classDetails, setClassDetails] = useState([]);
  const hasFetched = useRef(false);

  // Fetch today's classes from Oracle - only once
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    const fetchTodaysClasses = async () => {
      try {
        const token = getToken();
        console.log('Token found:', !!token);
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        console.log('Fetching dashboard summary...');
        
        const response = await fetch('http://localhost:5555/api/dashboard/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        console.log('Dashboard API Response:', data);
        
        if (response.ok && data) {
          if (data.todaysClasses && Array.isArray(data.todaysClasses)) {
            console.log(`✅ Found ${data.todaysClasses.length} classes:`, data.todaysClasses);
            setClassCount(data.todaysClasses.length);
            setClassDetails(data.todaysClasses);
            setTodaysClasses(data.todaysClasses);
          } else {
            console.log('❌ No todaysClasses in response or not an array');
            setClassCount(0);
            setClassDetails([]);
            setTodaysClasses([]);
          }
        } else {
          console.error('API Error:', data.error);
          setClassCount(0);
          setClassDetails([]);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setClassCount(0);
        setClassDetails([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodaysClasses();
  }, [setTodaysClasses]);

  if (loading) {
    return (
      <div className="relative bg-[#f0f2f5] p-10 rounded-[40px] flex-1 min-w-[320px] max-w-[450px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 text-center group hover:-translate-y-2 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`relative bg-[#f0f2f5] p-10 rounded-[40px] flex-1 min-w-[320px] max-w-[450px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 text-center group hover:-translate-y-2
      ${isExpanded ? "min-h-[320px]" : "min-h-[280px]"}`}>

      {/* Tooltip */}
      {showTooltip && isExpanded && classDetails.length > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+16px)] w-60 bg-white rounded-2xl shadow-[0_8px_30px_rgba(108,92,231,0.25)] p-4 z-50 text-left"
          style={{ pointerEvents: "none" }}
        >
          <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 shadow-[-2px_2px_4px_rgba(0,0,0,0.05)]" />
          <p className="text-[10px] font-black text-focusPurple uppercase tracking-widest mb-3 px-1">Today's lineup</p>
          <div className="flex flex-col gap-2">
            {classDetails.map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-focusPurple flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-gray-800 truncate">
                    {item.subject || item.name || "Class"}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {item.startTime && item.endTime
                      ? `${item.startTime} – ${item.endTime}`
                      : item.time || "No time set"}
                  </p>
                  {item.room && (
                    <p className="text-[10px] text-focusPurple font-bold mt-0.5">
                      📍 {item.room}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FRONT FACE */}
      <div className={`flex flex-col items-center justify-center h-full overflow-hidden transition-all duration-500 ${isExpanded ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        <h3 className="text-xl font-black text-gray-800 mb-2">Classes Today</h3>
        <div className="w-40 h-40">
          <Lottie animationData={fireAnimation} loop={true} className="w-full h-full" />
        </div>
        <p className="text-gray-500 font-bold mt-2 mb-6">
          {classCount === 0
            ? "No classes today 🎉"
            : `${classCount} ${classCount === 1 ? "class" : "classes"} scheduled`}
        </p>
        <button className="magic-btn" onClick={() => navigate("/academic")}>
          <span className="icon">✏️</span>
          <span className="text">Edit Calendar</span>
        </button>
      </div>

      {/* BACK FACE */}
      <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-2
        ${isExpanded ? "[clip-path:circle(150%_at_50%_90%)] pointer-events-auto" : "[clip-path:circle(0%_at_50%_90%)] pointer-events-none"}
        bg-gradient-to-br from-gray-50 to-gray-200`}>

        <div className="flex flex-col items-center mb-2">
          <span className="text-[2.2rem] mb-1">📚</span>
          <h3 className="text-xl font-black text-gray-800">Today's Classes</h3>
          <p className="text-xs text-gray-400 font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>

        {/* Hoverable number */}
        <div
          className="relative cursor-pointer select-none"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className={`text-8xl font-black drop-shadow-lg transition-colors duration-200 ${showTooltip ? "text-purple-400" : "text-focusPurple"}`}>
            {classCount}
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1">
            {classCount === 0 ? "No classes today!" : "hover to see details →"}
          </p>
        </div>
      </div>

      {/* LIQUID TRIGGER BUTTON */}
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