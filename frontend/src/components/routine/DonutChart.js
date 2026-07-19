// src/components/routine/DonutChart.js
// Shared donut-chart schedule widget + routine helpers, used by both the
// combined /routine page and the full-week /routine/view page.
import React, { useState, useEffect, useRef } from "react";

// Use SHORT day names for backend compatibility
export const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const getFullDayName = (shortDay) => {
  const dayMap = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
    'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
  };
  return dayMap[shortDay] || shortDay;
};

const TASK_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#3b82f6', '#a855f7', '#22c55e',
  '#e11d48', '#7c3aed',
];

export const isTaskMissed = (task, activeDay, currentDayName) => {
  if (task.completedDays?.includes(activeDay)) return false;
  const dayIndex = daysOfWeek.indexOf(activeDay);
  const currentDayIndex = daysOfWeek.indexOf(currentDayName);
  if (dayIndex > currentDayIndex) return false;
  if (dayIndex === currentDayIndex) {
    const now = new Date();
    const [h, m] = (task.time || "00:00").split(':').map(Number);
    return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
  }
  return true;
};

export const isTaskCompleted = (task, activeDay) => task.completedDays?.includes(activeDay);

export const getTaskColor = (task, activeDay, isLocked, currentDayName) => {
  if (isLocked) return '#cbd5e1';
  if (isTaskCompleted(task, activeDay)) return '#10b981';
  if (isTaskMissed(task, activeDay, currentDayName)) return '#ff3b3b';
  if (task.dayColors && task.dayColors[activeDay]) return task.dayColors[activeDay];
  if (task.color) return task.color;
  const hash = task.id ? task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  return TASK_COLORS[hash % TASK_COLORS.length];
};

export const formatTime12h = (time) => {
  if (!time) return 'N/A';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
};

export default function DonutChart({ tasks, activeDay, onToggle, sliceAngle, isLocked, currentDayName, size = 240, showLabels = true, strokeRatio = 0.14 }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [visibleIndex, setVisibleIndex] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const hoverTimerRef = useRef(null);
  const center = size / 2;
  const radius = size / 2 - 38;
  const strokeWidth = Math.round(size * strokeRatio);
  const circumference = 2 * Math.PI * radius;

  const totalTasks = tasks.length;

  const getSliceColor = (task) => getTaskColor(task, activeDay, isLocked, currentDayName);

  const getStatusText = (task) => {
    if (isLocked) return '🔒 Locked';
    if (isTaskCompleted(task, activeDay)) return '✅ Completed';
    if (isTaskMissed(task, activeDay, currentDayName)) return '🔒 Missed';
    return '📅 Upcoming';
  };

  const completedCount = tasks.filter(t => isTaskCompleted(t, activeDay)).length;
  const missedCount = isLocked ? 0 : tasks.filter(t => isTaskMissed(t, activeDay, currentDayName)).length;

  const handleSliceClick = (task) => {
    if (isLocked || isTaskMissed(task, activeDay, currentDayName)) return;
    onToggle(task.id, activeDay);
  };

  const handleMouseEnter = (index) => {
    if (isLocked) return;
    setHoveredIndex(index);
    setIsFading(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setVisibleIndex(index), 1000);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsFading(true);
    setTimeout(() => { setVisibleIndex(null); setIsFading(false); }, 300);
  };

  useEffect(() => () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }, []);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgb(var(--ink)/0.1)" strokeWidth={strokeWidth} />
        {tasks.map((task, i) => {
          const color = getSliceColor(task);
          const isHovered = hoveredIndex === i;
          const isMissed = isTaskMissed(task, activeDay, currentDayName);
          const rotation = i * sliceAngle - 90;
          const dashArray = `${((sliceAngle - 2) / 360) * circumference} ${circumference}`;
          return (
            <g key={`${activeDay}-${task.id}`}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: (isLocked || isMissed) ? 'not-allowed' : 'pointer' }}
              onClick={() => handleSliceClick(task)}>
              <circle cx={center} cy={center} r={radius} fill="none" stroke={color}
                strokeWidth={isHovered && !isMissed && !isLocked ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={dashArray} strokeLinecap="butt"
                transform={`rotate(${rotation} ${center} ${center})`} opacity={1}
                className="transition-all duration-300" />
            </g>
          );
        })}
        <circle cx={center} cy={center} r={radius - strokeWidth / 2 - 5} fill="rgb(var(--surface))" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-black text-ink" style={{ fontSize: Math.round(size * 0.11) }}>{completedCount}/{totalTasks}</span>
        {showLabels && (
          <>
            <span className="text-muted font-bold uppercase mt-0.5" style={{ fontSize: Math.max(7, Math.round(size * 0.038)) }}>Done</span>
            {missedCount > 0 && <span className="text-focus font-bold mt-0.5" style={{ fontSize: Math.max(6, Math.round(size * 0.034)) }}>{missedCount} missed</span>}
          </>
        )}
      </div>

      {!isLocked && visibleIndex !== null && tasks[visibleIndex] && (() => {
        const task = tasks[visibleIndex];
        const color = getSliceColor(task);
        const midAngle = (visibleIndex * sliceAngle + sliceAngle / 2) * Math.PI / 180;
        const dirX = Math.sin(midAngle);
        const dirY = -Math.cos(midAngle);
        const tooltipDist = radius + 72;
        const tx = center + dirX * tooltipDist;
        const ty = center + dirY * tooltipDist;
        return (
          <div className={`absolute z-30 pointer-events-none transition-all duration-300 ease-out ${isFading ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
            style={{ left: `${tx}px`, top: `${ty}px`, transform: `translate(-50%, -50%)` }}>
            <div className="bg-ink text-canvas rounded-token-md px-4 py-3 shadow-glass min-w-[160px] text-center">
              <p className="text-xs font-black truncate">{task.activity}</p>
              <p className="text-lg font-black mt-1" style={{ color }}>
                {formatTime12h(task.time)}
              </p>
              <p className="text-[10px] mt-1 font-bold" style={{ color }}>{getStatusText(task)}</p>
            </div>
            <div className="absolute w-3 h-3 bg-ink"
              style={{ left: `${50 - dirX * 45}%`, top: `${50 - dirY * 45}%`, transform: 'translate(-50%, -50%) rotate(45deg)' }} />
          </div>
        );
      })()}
    </div>
  );
}
