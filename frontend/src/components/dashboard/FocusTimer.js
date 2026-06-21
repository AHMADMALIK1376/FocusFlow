// src/components/dashboard/FocusTimer.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Lottie from "lottie-react";
import fireAnimation from "../../assets/animation/Sandy Loading.json";
import { Card, Button } from "../ui";

export default function FocusTimer() {
  const navigate = useNavigate();
  const { hours, minutes, seconds, isActive, totalFocusSessions } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);

  const displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <Card className={`min-w-[320px] max-w-[450px] transition-all duration-500 overflow-hidden text-center hover:-translate-y-2 relative ${isExpanded ? "min-h-[320px]" : "min-h-[280px]"}`}>
      {/* Front Face */}
      <div className={`transition-all duration-500 ${isExpanded ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        <div className="flex flex-col items-center mb-4">
          <span className="text-[2.2rem] mb-2 drop-shadow-md">⚡</span>
          <h3 className="text-xl font-black text-ink">Deep Work</h3>
        </div>

        <div className="w-24 h-24 mx-auto mb-4">
          <Lottie animationData={fireAnimation} loop={true} className="w-full h-full" />
        </div>

        <p className="text-muted font-bold mb-6">Set custom timers & track sessions.</p>
        <Button variant="primary" onClick={() => navigate("/focus-mode")}>
          ⏱️ Enter Focus Mode
        </Button>
      </div>

      {/* Back Face */}
      <div className={`absolute inset-0 bg-surface-2 flex flex-col items-center justify-center transition-all duration-700 ease-spring z-10
        ${isExpanded ? "[clip-path:circle(150%_at_50%_90%)] pointer-events-auto" : "[clip-path:circle(0%_at_50%_90%)] pointer-events-none"}`}>
        <div className="flex flex-col items-center mb-6">
          <span className="text-[2.2rem] mb-2">{isActive ? "☄️" : "🪐"}</span>
          <h3 className="text-xl font-black text-ink">Flow State</h3>
        </div>

        <div className={`relative w-[150px] h-[150px] rounded-full bg-surface shadow-neu flex items-center justify-center border-2 transition-all duration-500
          ${isActive ? "border-brand" : "border-[rgb(var(--ink)/0.08)]"}`}>
          <div className={`text-2xl font-black transition-colors duration-300 ${isActive ? "text-brand" : "text-muted"}`}>
            {displayTime}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted">Total Sessions</p>
          <p className="text-xl font-black text-brand">{totalFocusSessions || 0}</p>
        </div>
      </div>

      <button
        className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-brand text-on-brand text-xl flex items-center justify-center z-20 shadow-neu-sm hover:scale-110 hover:rotate-12 transition-transform"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "↩" : "⏳"}
      </button>
    </Card>
  );
}
