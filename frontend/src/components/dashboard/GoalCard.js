// src/components/dashboard/GoalCard.js
import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, ProgressRing } from "../ui";

export default function GoalCard() {
  const { tasks, completedGoals } = useApp();
  const [isHovered, setIsHovered] = useState(false);

  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = totalTasks - completed;

  const completionPercentage = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

  return (
    <Card
      className="min-w-[320px] max-w-[450px] min-h-[400px] transition-all duration-500 overflow-hidden text-center hover:-translate-y-2 flex flex-col justify-center items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-center mb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-1">Task Progress</h3>
        <p className="text-[9px] text-muted">{completedGoals} goals achieved</p>
      </div>

      <div className="flex justify-center items-center mb-3">
        <ProgressRing value={completionPercentage} size={230} stroke={18} marks={["0", "25", "50", "75"]}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-3xl font-black text-brand">{completed}</span>
            <div className="w-8 h-px bg-[rgb(var(--ink)/0.15)] my-1.5"></div>
            <span className="text-base font-bold text-warn">{pending}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted mt-1">done / left</span>
          </div>
        </ProgressRing>
      </div>

      <div className="flex justify-center items-center gap-2 mt-2">
        <div className={`w-2 h-2 rounded-full bg-success transition-all duration-300 ${isHovered ? 'scale-150' : ''}`}>
          <div className={`w-full h-full rounded-full bg-success animate-pulse opacity-75 ${isHovered ? 'opacity-100' : ''}`}></div>
        </div>
        <span className={`text-[8px] font-medium text-muted uppercase tracking-wider transition-all duration-300 ${isHovered ? 'tracking-widest text-brand' : ''}`}>
          {isHovered ? 'ACTIVE' : 'UPDATED'}
        </span>
      </div>
    </Card>
  );
}
