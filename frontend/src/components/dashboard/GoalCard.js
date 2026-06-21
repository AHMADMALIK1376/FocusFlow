// src/components/dashboard/GoalCard.js
import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card } from "../ui";

export default function GoalCard() {
  const { tasks, completedGoals } = useApp();
  const [isHovered, setIsHovered] = useState(false);

  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = totalTasks - completed;

  const completionPercentage = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
  const pendingPercentage = 100 - completionPercentage;

  const size = 240;
  const center = size / 2;

  const radius1 = 80;
  const strokeWidth1 = 24;
  const circumference1 = 2 * Math.PI * radius1;
  const completedDash = (completionPercentage / 100) * circumference1;

  const radius2 = 108;
  const strokeWidth2 = 24;
  const circumference2 = 2 * Math.PI * radius2;
  const pendingDash = (pendingPercentage / 100) * circumference2;

  const completedAngle = (completionPercentage / 100) * 360;
  const pendingAngle = (pendingPercentage / 100) * 360;

  const completedRad = (completedAngle - 90) * Math.PI / 180;
  const completedTextX = center + (radius1 + 12) * Math.cos(completedRad);
  const completedTextY = center + (radius1 + 12) * Math.sin(completedRad);

  const pendingRad = (pendingAngle - 90) * Math.PI / 180;
  const pendingTextX = center + (radius2 + 14) * Math.cos(pendingRad);
  const pendingTextY = center + (radius2 + 14) * Math.sin(pendingRad);

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
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
            <circle cx={center} cy={center} r={radius2} fill="none"
              stroke="rgb(var(--ink)/0.08)" strokeWidth={strokeWidth2} />
            <circle cx={center} cy={center} r={radius2} fill="none"
              stroke="rgb(var(--warn))" strokeWidth={strokeWidth2}
              strokeDasharray={`${pendingDash} ${circumference2}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-1000 ease-out" />
            <circle cx={center} cy={center} r={radius1} fill="none"
              stroke="rgb(var(--ink)/0.08)" strokeWidth={strokeWidth1} />
            <circle cx={center} cy={center} r={radius1} fill="none"
              stroke="rgb(var(--brand))" strokeWidth={strokeWidth1}
              strokeDasharray={`${completedDash} ${circumference1}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-1000 ease-out" />
          </svg>

          {completionPercentage > 0 && completionPercentage < 100 && (
            <div
              className="absolute text-on-brand font-black text-sm bg-brand px-2 py-1 rounded-full shadow-neu-sm whitespace-nowrap"
              style={{ left: `${completedTextX}px`, top: `${completedTextY}px`, transform: 'translate(-50%, -50%)' }}
            >
              {Math.round(completionPercentage)}%
            </div>
          )}

          {pendingPercentage > 0 && pendingPercentage < 100 && (
            <div
              className="absolute text-on-brand font-black text-sm bg-warn px-2 py-1 rounded-full shadow-neu-sm whitespace-nowrap"
              style={{ left: `${pendingTextX}px`, top: `${pendingTextY}px`, transform: 'translate(-50%, -50%)' }}
            >
              {Math.round(pendingPercentage)}%
            </div>
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-brand">{completed}</span>
            <div className="w-8 h-px bg-[rgb(var(--ink)/0.15)] my-1"></div>
            <span className="text-base font-bold text-warn">{pending}</span>
          </div>
        </div>
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
