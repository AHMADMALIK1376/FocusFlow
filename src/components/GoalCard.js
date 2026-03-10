import React from "react";
import { useApp } from "./AppContext";

export default function GoalCard() {
  const { completedGoals } = useApp();

  const getAppreciationMessage = () => {
    if (completedGoals === 0) return "Complete tasks to see your performance!";
    if (completedGoals < 5) return "Great start! Keep the momentum going. 🚀";
    if (completedGoals < 15) return "Keep it up! Building a habit. 💪";
    if (completedGoals < 50) return "Academic Beast Mode! 🔥";
    return "Legendary Status! Mastered. 👑";
  };

  return (
    /* Keeping the exact dimensions: min-w-[320px], max-w-[450px], and min-h-[350px] */
    <div className="relative bg-[#f0f2f5] p-10 rounded-[40px] min-w-[320px] max-w-[450px] min-h-[350px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 overflow-hidden text-center group hover:-translate-y-2 flex flex-col justify-center items-center">
      
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
        <span className="text-green-600 text-[10px] font-black uppercase tracking-widest">
          Live System
        </span>
      </div>
    </div>
  );
}