import React from "react";

export default function UniCalendar({ setView }) {
  return (
    <div className="flex-1 min-w-[320px] max-w-[450px] bg-[#f0f2f5] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-transform duration-300 hover:-translate-y-2 text-center group">
      
      {/* CARD HEADER */}
      <div className="flex flex-col items-center mb-4">
        <span className="text-[2.2rem] inline-flex items-center justify-center mb-2 drop-shadow-md transition-transform duration-300 group-hover:scale-110">
          🔥
        </span>
        <h3 className="text-xl font-black text-gray-800 tracking-tight">Daily Streak</h3> 
      </div>
        
      {/* STREAK COUNT */}
      <div className="text-[5rem] font-black text-focusPurple my-2 drop-shadow-[2px_4px_6px_rgba(0,0,0,0.1)]">
        12
      </div>

      <p className="text-gray-500 font-medium mb-8">Keep the momentum going!</p>

      {/* ACTION BUTTON */}
      <button 
        className="magic-btn w-full py-4 rounded-2xl bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] text-focusPurple font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(108,92,231,0.2)] active:scale-95 active:shadow-inner"
        onClick={() => setView("timeline")}
      >
        📓 Open Task Planner
      </button>
    </div>
  );
}