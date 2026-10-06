// src/components/routine/DonutChart.js
// Shared donut-chart schedule widget + routine helpers, used by both the
// combined /routine page and the full-week /routine/view page.
import React, { useState, useEffect, useRef } from "react";
import { WEEK, isDoneOn, isFutureDay } from "../../features/routine/routineDays";

// Use SHORT day names for backend compatibility
export const daysOfWeek = WEEK;

// Light sage for a ticked-off slice (the theme's --sage).
export const DONE_COLOR = '#B8DCC4';
const TICK_DONE = '#8FCDA6';

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

// Done = ticked on that weekday's date in the current week (the server stores
// dates, not weekday names).
export const isTaskCompleted = (task, activeDay) => isDoneOn(task, activeDay);

export const isTaskMissed = (task, activeDay, currentDayName) => {
  if (isTaskCompleted(task, activeDay)) return false;
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

// Can this slice be ticked (or unticked)? Today's items: any time, because you
// tick a routine after doing it, i.e. after its time (it still shows red until
// then). Past days: only to undo a tick, since a missed day stays missed.
// Days that haven't come yet: no.
export const canTick = (task, activeDay, currentDayName) =>
  !isFutureDay(activeDay) &&
  (activeDay === currentDayName || !isTaskMissed(task, activeDay, currentDayName));

export const getTaskColor = (task, activeDay, isLocked, currentDayName) => {
  if (isLocked) return '#cbd5e1';
  if (isTaskCompleted(task, activeDay)) return DONE_COLOR;
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
    if (isLocked) return 'Locked';
    if (isTaskCompleted(task, activeDay)) return 'Completed';
    if (isTaskMissed(task, activeDay, currentDayName)) return 'Missed';
    return 'Upcoming';
  };

  const completedCount = tasks.filter(t => isTaskCompleted(t, activeDay)).length;
  const missedCount = isLocked ? 0 : tasks.filter(t => isTaskMissed(t, activeDay, currentDayName)).length;

  const canToggle = (task) => !isLocked && canTick(task, activeDay, currentDayName);

  const handleSliceClick = (task) => {
    if (!canToggle(task)) return;
    onToggle(task.id, activeDay);
  };

  // Engraved look shared with the other round graphs (ui/ProgressRing): the
  // slices sit in a sunken groove, a raised disc holds the count, and a ring
  // of ticks lights up over the slices that are done.
  const pad = Math.max(6, size * 0.03); // the groove's rim around the slices
  const grooveOuter = radius + strokeWidth / 2 + pad;
  const discR = radius - strokeWidth / 2 - pad;
  const tickIn = grooveOuter + Math.max(3, size * 0.012);
  const tickCount = size < 200 ? 40 : 60;
  const tickLen = Math.max(4, size * 0.045);
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const deg = (i / tickCount) * 360;
    const t = (deg * Math.PI) / 180;
    const task = sliceAngle ? tasks[Math.floor(deg / sliceAngle)] : null;
    const lit = !isLocked && task && isTaskCompleted(task, activeDay);
    const r2 = tickIn + (i % 5 === 0 ? tickLen : tickLen * 0.6);
    return (
      <line key={i}
        x1={center + tickIn * Math.sin(t)} y1={center - tickIn * Math.cos(t)}
        x2={center + r2 * Math.sin(t)} y2={center - r2 * Math.cos(t)}
        stroke={lit ? TICK_DONE : 'rgb(var(--ink) / 0.16)'}
        strokeWidth={i % 5 === 0 ? Math.max(1.6, size * 0.009) : Math.max(1, size * 0.005)}
        strokeLinecap="round" style={{ transition: 'stroke 400ms ease-out' }} />
    );
  });
  const round = (r, style) => ({
    position: 'absolute', left: '50%', top: '50%', width: r * 2, height: r * 2,
    transform: 'translate(-50%, -50%)', borderRadius: '50%', pointerEvents: 'none', ...style,
  });

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
      {/* sunken groove (behind the slices) */}
      <div aria-hidden="true" style={round(grooveOuter, { background: 'rgb(var(--surface-2))', boxShadow: 'var(--shadow-neu-inset)' })} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
        {ticks}
        {tasks.map((task, i) => {
          const color = getSliceColor(task);
          const isHovered = hoveredIndex === i;
          const clickable = canToggle(task);
          const rotation = i * sliceAngle - 90;
          const dashArray = `${((sliceAngle - 2) / 360) * circumference} ${circumference}`;
          return (
            <g key={`${activeDay}-${task.id}`}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: clickable ? 'pointer' : 'not-allowed' }}
              onClick={() => handleSliceClick(task)}>
              <circle cx={center} cy={center} r={radius} fill="none" stroke={color}
                strokeWidth={isHovered && clickable ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={dashArray} strokeLinecap="butt"
                transform={`rotate(${rotation} ${center} ${center})`} opacity={1}
                className="transition-all duration-300" />
            </g>
          );
        })}
      </svg>
      {/* raised centre */}
      <div aria-hidden="true" style={round(discR, { background: 'rgb(var(--surface))', boxShadow: 'var(--shadow-neu-sm)' })} />
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
