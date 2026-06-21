// src/components/routine/RoutineView.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { routineAPI } from "../../services/api";
import EditRoutinePopup from "./EditRoutinePopup";
import DeleteRoutinePopup from "./DeleteRoutinePopup";

// Use SHORT day names for backend compatibility
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Helper to convert short day to full for display
const getFullDayName = (shortDay) => {
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

const isTaskMissed = (task, activeDay, currentDayName) => {
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

const isTaskCompleted = (task, activeDay) => task.completedDays?.includes(activeDay);

const getTaskColor = (task, activeDay, isLocked, currentDayName) => {
  if (isLocked) return '#cbd5e1';
  if (isTaskCompleted(task, activeDay)) return '#10b981';
  if (isTaskMissed(task, activeDay, currentDayName)) return '#ff3b3b';
  if (task.dayColors && task.dayColors[activeDay]) return task.dayColors[activeDay];
  if (task.color) return task.color;
  const hash = task.id ? task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  return TASK_COLORS[hash % TASK_COLORS.length];
};

// ========== DONUT CHART ==========
const DonutChart = ({ tasks, activeDay, onToggle, sliceAngle, isLocked, currentDayName }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [visibleIndex, setVisibleIndex] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const hoverTimerRef = useRef(null);
  const size = 240;
  const center = size / 2;
  const radius = 82;
  const strokeWidth = 34;
  const circumference = 2 * Math.PI * radius;

  const totalTasks = tasks.length;

  const getSliceColor = (task, index) => getTaskColor(task, activeDay, isLocked, currentDayName);

  const getStatusText = (task) => {
    if (isLocked) return '🔒 Locked';
    if (isTaskCompleted(task, activeDay)) return '✅ Completed';
    if (isTaskMissed(task, activeDay, currentDayName)) return '🔒 Missed';
    return '📅 Upcoming';
  };

  const completedCount = tasks.filter(t => isTaskCompleted(t, activeDay)).length;
  const missedCount = isLocked ? 0 : tasks.filter(t => isTaskMissed(t, activeDay, currentDayName)).length;

  const handleSliceClick = (task, index) => {
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
          const color = getSliceColor(task, i);
          const isHovered = hoveredIndex === i;
          const isMissed = isTaskMissed(task, activeDay, currentDayName);
          const rotation = i * sliceAngle - 90;
          const dashArray = `${((sliceAngle - 2) / 360) * circumference} ${circumference}`;
          return (
            <g key={`${activeDay}-${task.id}`}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: (isLocked || isMissed) ? 'not-allowed' : 'pointer' }}
              onClick={() => handleSliceClick(task, i)}>
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
        <span className="text-2xl font-black text-ink">{completedCount}/{totalTasks}</span>
        <span className="text-[9px] text-muted font-bold uppercase mt-0.5">Done</span>
        {missedCount > 0 && <span className="text-[8px] text-focus font-bold mt-0.5">{missedCount} missed</span>}
      </div>

      {!isLocked && visibleIndex !== null && tasks[visibleIndex] && (() => {
        const task = tasks[visibleIndex];
        const color = getSliceColor(task, visibleIndex);
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
                {task.time ? (() => { const [h, m] = task.time.split(':'); const hour = parseInt(h); const ampm = hour >= 12 ? 'PM' : 'AM'; return `${hour % 12 || 12}:${m} ${ampm}`; })() : 'N/A'}
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
};

export default function RoutineView() {
  const navigate = useNavigate();
  const { timetable, setTimetable } = useApp();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deletingRoutine, setDeletingRoutine] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [currentDayName, setCurrentDayName] = useState("");
  const [dateStr, setDateStr] = useState("");

  // Set up current day
  useEffect(() => {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'short' });
    const todayStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    setCurrentDayName(day);
    setDateStr(todayStr);
    setActiveDay(day);
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;
    const timer = setTimeout(() => {
      const newNow = new Date();
      const newDay = newNow.toLocaleDateString('en-US', { weekday: 'short' });
      const newDateStr = newNow.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      setCurrentDayName(newDay);
      setDateStr(newDateStr);
      setActiveDay(newDay);
    }, msUntilMidnight + 1000);
    return () => clearTimeout(timer);
  }, []);

  // Use cached data from context instead of fetching
  useEffect(() => {
    if (timetable && timetable.length > 0) {
      setSchedule(timetable);
      setLoading(false);
    } else {
      // Fallback to API if context is empty
      const fetchRoutines = async () => {
        try {
          const routines = await routineAPI.getAll();
          setSchedule(routines);
          setTimetable(routines);
        } catch (error) {
          console.error('Failed to fetch routines:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchRoutines();
    }
  }, [timetable, setTimetable]);

  const toggleComplete = async (routineId, day) => {
    const task = schedule.find(t => t.id === routineId);
    if (task && isTaskMissed(task, day, currentDayName)) return;
    try {
      await routineAPI.complete(routineId);
      setSchedule(prev => prev.map(task => {
        if (task.id === routineId) {
          const isDone = task.completedDays?.includes(day);
          return { ...task, completedDays: isDone ? task.completedDays.filter(d => d !== day) : [...(task.completedDays || []), day] };
        }
        return task;
      }));
      // Update context
      setTimetable(schedule);
    } catch (error) { console.error('Failed to toggle:', error); }
  };

  const handleEditSave = async (routineId, updatedData) => {
    try {
      await routineAPI.update(routineId, updatedData);
      const routines = await routineAPI.getAll();
      setSchedule(routines);
      setTimetable(routines);
      setShowEditPopup(false);
      setEditingRoutine(null);
    }
    catch (error) { alert('Failed to update routine: ' + error.message); }
  };

  const handleEditClick = (task) => {
    if (isTaskMissed(task, activeDay, currentDayName)) return;
    setEditingRoutine(task); setShowEditPopup(true);
  };

  const handleDeleteRoutine = async (routineId, mode) => {
    try {
      if (routineId === 'ALL_ROUTINES') {
        await routineAPI.deleteAll();
      } else if (mode === 'all' || mode === 'entireWeek') {
        await routineAPI.delete(routineId);
      } else if (Array.isArray(mode)) {
        const routine = schedule.find(r => r.id === routineId);
        const newDays = routine.repeatOn.filter(d => !mode.includes(d));
        if (newDays.length === 0) {
          await routineAPI.delete(routineId);
        } else {
          await routineAPI.update(routineId, {
            activity: routine.activity,
            time: routine.time,
            repeatOn: newDays,
            dayColors: routine.dayColors
          });
        }
      }
      const routines = await routineAPI.getAll();
      setSchedule(routines);
      setTimetable(routines);
      setShowDeletePopup(false);
      setDeletingRoutine(null);
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const dayTasks = schedule.filter(task => task.repeatOn?.includes(activeDay)).sort((a, b) => a.time.localeCompare(b.time));
  const totalTasks = dayTasks.length;
  const sliceAngle = totalTasks > 0 ? 360 / totalTasks : 360;
  const leftSideTasks = [], rightSideTasks = [];
  dayTasks.forEach((task, index) => {
    const midAngle = (index * sliceAngle + sliceAngle / 2) % 360;
    if (midAngle >= 180 && midAngle < 360) leftSideTasks.push({ task, originalIndex: index });
    else rightSideTasks.push({ task, originalIndex: index });
  });
  const orderedLeftTasks = [...leftSideTasks].reverse();

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const formatDayForDisplay = (day) => getFullDayName(day);

  return (
    <div className="min-h-screen bg-canvas py-6 px-4 flex flex-col items-center">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-black text-brand">Daily Routine</h1>
        <p className="text-muted text-sm mt-1">{dateStr}</p>
      </div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 max-w-full px-2">
        {daysOfWeek.map((day) => {
          const isActive = day === activeDay;
          const isToday = day === currentDayName;
          const count = schedule.filter(t => t.repeatOn?.includes(day)).length;
          const displayDay = formatDayForDisplay(day);
          return (
            <button key={day} onClick={() => setActiveDay(day)}
              className={`px-4 py-2 rounded-token-md font-black text-[11px] uppercase tracking-wider transition-all flex-shrink-0
                ${isActive ? 'bg-grad-hero text-on-brand shadow-neu-sm' :
                  isToday ? 'bg-surface text-brand shadow-neu ring-2 ring-brand/30' :
                  'bg-surface text-muted shadow-neu-sm hover:shadow-neu'}`}>
              {displayDay.substring(0, 3)}{count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="relative w-full max-w-2xl group/card">
        <div className="bg-surface rounded-token-xl shadow-neu p-8 mb-6">
          {dayTasks.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-5xl mb-4 block">🌅</span>
              <p className="text-muted font-bold">No activities for {formatDayForDisplay(activeDay)}</p>
              <button onClick={() => navigate("/routine")} className="magic-btn mt-4 text-sm">+ Add Activities</button>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-black text-ink">{formatDayForDisplay(activeDay)}'s Schedule</h2>
                <p className="text-[10px] text-muted mt-1">Click slice to complete • Hover for details</p>
              </div>

              <div className="flex items-center justify-center gap-4">
                {/* Left side labels */}
                <div className="flex flex-col gap-3 items-end w-[160px]">
                  {orderedLeftTasks.map(({ task, originalIndex }) => {
                    const completed = isTaskCompleted(task, activeDay);
                    const missed = isTaskMissed(task, activeDay, currentDayName);
                    const color = getTaskColor(task, activeDay, false, currentDayName);
                    return (
                      <div key={task.id} className="flex items-center gap-1.5 group justify-end w-full">
                        {!missed && (
                          <button onClick={() => handleEditClick(task)}
                            className="text-[13px] text-info opacity-0 group-hover:opacity-100 transition-opacity leading-none mr-0.5">✎</button>
                        )}
                        {missed && <span className="text-[11px] text-focus font-bold mr-0.5">🔒</span>}
                        <span className={`text-[11px] font-bold text-right leading-tight max-w-[115px] truncate ${completed ? 'text-success line-through' : missed ? 'text-focus line-through font-black' : 'text-ink'}`}>
                          {task.activity}
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                      </div>
                    );
                  })}
                </div>

                {/* Donut Chart */}
                <div className="flex-shrink-0">
                  <DonutChart tasks={dayTasks} activeDay={activeDay} onToggle={toggleComplete} sliceAngle={sliceAngle} isLocked={false} currentDayName={currentDayName} />
                </div>

                {/* Right side labels */}
                <div className="flex flex-col gap-3 items-start w-[160px]">
                  {rightSideTasks.map(({ task, originalIndex }) => {
                    const completed = isTaskCompleted(task, activeDay);
                    const missed = isTaskMissed(task, activeDay, currentDayName);
                    const color = getTaskColor(task, activeDay, false, currentDayName);
                    return (
                      <div key={task.id} className="flex items-center gap-1.5 group justify-start w-full">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                        <span className={`text-[11px] font-bold text-left leading-tight max-w-[115px] truncate ${completed ? 'text-success line-through' : missed ? 'text-focus line-through font-black' : 'text-ink'}`}>
                          {task.activity}
                        </span>
                        {!missed && (
                          <button onClick={() => handleEditClick(task)}
                            className="text-[13px] text-info opacity-0 group-hover:opacity-100 transition-opacity leading-none ml-0.5">✎</button>
                        )}
                        {missed && <span className="text-[11px] text-focus font-bold ml-0.5">🔒</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-6 mt-5 text-[9px] font-bold">
                <span className="text-success">🟢 Completed</span>
                <span className="text-focus">🔴 Missed</span>
                <span className="text-muted">⚪ Upcoming</span>
              </div>
            </>
          )}
        </div>

        {/* Delete button */}
        <div className="absolute bottom-0 right-0 w-24 h-24 flex items-center justify-center pointer-events-none">
          <button
            onClick={() => {
              if (dayTasks.length > 0) {
                setDeletingRoutine(dayTasks[0]);
                setShowDeletePopup(true);
              }
            }}
            className="pointer-events-auto text-xl text-muted hover:text-focus opacity-0 group-hover/card:opacity-100 transition-all duration-300 hover:scale-110 z-10"
            title="Delete activities">
            🗑
          </button>
        </div>
      </div>

      <footer className="mt-4 flex gap-4">
        <button onClick={() => navigate("/dashboard")} className="magic-btn">🏠 Dashboard</button>
        <button onClick={() => navigate("/routine")} className="magic-btn">✏️ Edit Routine</button>
      </footer>

      {showEditPopup && editingRoutine && (
        <EditRoutinePopup routine={editingRoutine} onClose={() => { setShowEditPopup(false); setEditingRoutine(null); }} onSave={handleEditSave} />
      )}

      {showDeletePopup && deletingRoutine && (
        <DeleteRoutinePopup
          routine={deletingRoutine}
          allRoutines={dayTasks}
          onClose={() => { setShowDeletePopup(false); setDeletingRoutine(null); }}
          onDelete={handleDeleteRoutine}
        />
      )}
    </div>
  );
}
