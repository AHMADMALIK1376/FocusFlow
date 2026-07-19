// src/Pages/DailyRoutine.js
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Flame } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { routineAPI, getToken } from "../services/api";
import { Card, CardDeleteButton, Modal } from "../components/ui";
import DonutChart, { daysOfWeek, getFullDayName, isTaskCompleted, isTaskMissed, getTaskColor, formatTime12h } from "../components/routine/DonutChart";
import EditRoutinePopup from "../components/routine/EditRoutinePopup";
import DeleteRoutinePopup from "../components/routine/DeleteRoutinePopup";

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const WEEKS_TRACKED = 8;

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Last N calendar dates (oldest → newest) that fall on the given short weekday, ending at today.
const getLastNWeekdayDates = (shortDay, n) => {
  const targetDow = WEEKDAY_INDEX[shortDay];
  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.length < n) {
    if (cursor.getDay() === targetDow) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates.reverse();
};

// Consecutive completed weeks, counting back from the most recent.
const computeStreak = (task, weekDates) => {
  let streak = 0;
  for (let i = weekDates.length - 1; i >= 0; i--) {
    if (task.completedDays?.includes(toISODate(weekDates[i]))) streak++;
    else break;
  }
  return streak;
};

// Same swatch set as EditRoutinePopup's per-day color picker, kept in sync manually
// (not shared/exported) so that popup's design stays untouched.
const COLOR_PALETTE = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Rose', color: '#e11d48' },
  { name: 'Violet Dark', color: '#7c3aed' },
];

export default function DailyRoutine() {
  const { setTimetable } = useApp();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState("");
  const [time, setTime] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].color);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeDay, setActiveDay] = useState(null);
  const [currentDayName, setCurrentDayName] = useState("");
  const [hoveredDay, setHoveredDay] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deletingRoutine, setDeletingRoutine] = useState(null);
  const [deletingRoutineDay, setDeletingRoutineDay] = useState(null);

  // Current day, refreshed at midnight
  useEffect(() => {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'short' });
    setCurrentDayName(day);
    setActiveDay(day);
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;
    const timer = setTimeout(() => {
      const newDay = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      setCurrentDayName(newDay);
      setActiveDay(newDay);
    }, msUntilMidnight + 1000);
    return () => clearTimeout(timer);
  }, []);

  // Ticking clock — powers the "now" marker and the Up-Next countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchRoutines = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const routines = await routineAPI.getAll();
        setSchedule(routines);
        setTimetable(routines);
      } catch (error) {
        console.error('Failed to fetch routines:', error);
        setError(error.message || 'Failed to load routines');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Random color for a new activity, preferring one not already used by an existing task.
  const pickRandomUnusedColor = () => {
    const used = new Set();
    schedule.forEach(t => {
      if (t.color) used.add(t.color);
      if (t.dayColors) Object.values(t.dayColors).forEach(c => used.add(c));
    });
    const unused = COLOR_PALETTE.filter(c => !used.has(c.color));
    const pool = unused.length > 0 ? unused : COLOR_PALETTE;
    return pool[Math.floor(Math.random() * pool.length)].color;
  };

  const openAddModal = () => {
    setSelectedColor(pickRandomUnusedColor());
    setShowAddModal(true);
  };

  const handleDayToggle = (day) => {
    if (day === "All Days") {
      setSelectedDays(prev => prev.includes("All Days") ? [] : ["All Days"]);
    } else {
      setSelectedDays((prev) => {
        const filtered = prev.filter(d => d !== "All Days");
        return filtered.includes(day) ? filtered.filter(d => d !== day) : [...filtered, day];
      });
    }
  };

  const addSlot = async (e) => {
    e.preventDefault();
    if (!activity || !time) {
      alert("Please enter activity name and time");
      return;
    }

    let newDays;
    if (selectedDays.includes("All Days")) {
      newDays = [...daysOfWeek];
    } else if (selectedDays.length > 0) {
      newDays = selectedDays;
    } else {
      alert("Please select at least one day");
      return;
    }

    const dayColors = newDays.reduce((acc, d) => { acc[d] = selectedColor; return acc; }, {});

    setIsSubmitting(true);
    try {
      const newRoutine = await routineAPI.create({ activity, time, repeatOn: newDays, dayColors });
      const updated = [...schedule, newRoutine.routine].sort((a, b) => a.time.localeCompare(b.time));
      setSchedule(updated);
      setTimetable(updated);
      setActivity("");
      setTime("");
      setSelectedDays([]);
      setSelectedColor(pickRandomUnusedColor());
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add routine:', error);
      alert(error.message || 'Failed to add routine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleComplete = async (routineId, day) => {
    const task = schedule.find(t => t.id === routineId);
    if (task && isTaskMissed(task, day, currentDayName)) return;
    try {
      await routineAPI.complete(routineId);
      const todayISO = toISODate(new Date());
      setSchedule(prev => {
        const next = prev.map(t => {
          if (t.id === routineId) {
            const isDone = t.completedDays?.includes(day);
            // Push both the weekday flag (drives the donut/timeline's "current cycle" status)
            // and today's real date (drives the consistency tracker's per-week history) so
            // a fresh toggle reflects immediately in both without waiting on a refetch.
            const updated = isDone
              ? t.completedDays.filter(d => d !== day && d !== todayISO)
              : [...(t.completedDays || []), day, todayISO];
            return { ...t, completedDays: updated };
          }
          return t;
        });
        setTimetable(next);
        return next;
      });
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  const handleEditClick = (task) => {
    if (isTaskMissed(task, activeDay, currentDayName)) return;
    setEditingRoutine(task);
    setShowEditPopup(true);
  };

  const handleEditSave = async (routineId, updatedData) => {
    try {
      await routineAPI.update(routineId, updatedData);
      const routines = await routineAPI.getAll();
      setSchedule(routines);
      setTimetable(routines);
      setShowEditPopup(false);
      setEditingRoutine(null);
    } catch (error) {
      alert('Failed to update routine: ' + error.message);
    }
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

  const getDayTasks = (day) =>
    schedule.filter(task => task.repeatOn?.includes(day)).sort((a, b) => a.time.localeCompare(b.time));

  const dayTasks = schedule.filter(task => task.repeatOn?.includes(activeDay)).sort((a, b) => a.time.localeCompare(b.time));
  const totalTasks = dayTasks.length;
  const sliceAngle = totalTasks > 0 ? 360 / totalTasks : 360;
  const completedCount = dayTasks.filter(t => isTaskCompleted(t, activeDay)).length;
  const missedCount = dayTasks.filter(t => isTaskMissed(t, activeDay, currentDayName)).length;
  const upcomingCount = totalTasks - completedCount - missedCount;

  // Timeline derived state
  const isToday = activeDay === currentDayName;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const taskMinutes = (t) => { const [h, m] = (t.time || "00:00").split(":").map(Number); return h * 60 + m; };
  const nowIndex = isToday ? dayTasks.findIndex(t => taskMinutes(t) > nowMinutes) : -1;

  // Consistency tracker derived state — last 8 occurrences of the active weekday
  const trackerWeeks = activeDay && activeDay !== 'ALL' ? getLastNWeekdayDates(activeDay, WEEKS_TRACKED) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="bg-focus/10 border border-focus/30 rounded-token-lg p-6 text-center max-w-md">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-xl font-black text-focus mb-2">Error Loading Routines</h2>
          <p className="text-muted mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="magic-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-10 px-4 md:px-10 flex flex-col">

      {/* HEADER — left-aligned, flush against the sidebar edge */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-brand">Create Your Routine</h1>
        <p className="text-muted text-sm mt-2">Add activities for each day of the week</p>
      </div>

      <div className="w-full flex flex-col gap-8">
        <div className="w-full">
          {/* Daily Routine schedule */}
          <div>
            <h3 className="text-lg font-black text-ink mb-3">Daily Routine</h3>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                <button onClick={() => setActiveDay('ALL')}
                  className={`px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 flex-shrink-0
                    ${activeDay === 'ALL'
                      ? 'bg-grad-hero text-on-brand shadow-[0_6px_16px_rgb(var(--brand)/0.45)] hover:-translate-y-0.5'
                      : 'bg-white text-muted border border-[rgb(var(--ink)/0.08)] shadow-[0_3px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.16)] hover:-translate-y-0.5'}`}>
                  All
                </button>
                {daysOfWeek.map((day) => {
                  const isActive = day === activeDay;
                  const isToday = day === currentDayName;
                  const count = schedule.filter(t => t.repeatOn?.includes(day)).length;
                  return (
                    <button key={day} onClick={() => setActiveDay(day)}
                      className={`px-3.5 py-2 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 flex-shrink-0
                        ${isActive ? 'bg-grad-hero text-on-brand shadow-[0_6px_16px_rgb(var(--brand)/0.45)] hover:-translate-y-0.5' :
                          isToday ? 'bg-surface text-brand ring-2 ring-brand/30 shadow-[0_3px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.16)] hover:-translate-y-0.5' :
                          'bg-white text-muted border border-[rgb(var(--ink)/0.08)] shadow-[0_3px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.16)] hover:-translate-y-0.5'}`}>
                      {day}{count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={openAddModal}
                className="px-5 py-2.5 rounded-full bg-brand text-on-brand font-black text-xs uppercase tracking-wider shadow-[0_6px_16px_rgb(var(--brand)/0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgb(var(--brand)/0.55)] active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} /> Add Activity
              </button>
            </div>
          </div>

          {activeDay === 'ALL' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {daysOfWeek.map((day) => {
                const tasks = getDayTasks(day);
                if (tasks.length === 0) return null;
                const angle = 360 / tasks.length;
                return (
                  <div
                    key={day}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveDay(day)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveDay(day); }}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay((d) => (d === day ? null : d))}
                    className="relative group/card bg-surface rounded-token-lg shadow-neu-sm p-4 flex flex-col items-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-transform"
                  >
                    <h4 className="text-sm font-black text-ink">{getFullDayName(day)}'s</h4>
                    <div className="pointer-events-none">
                      <DonutChart tasks={tasks} activeDay={day} onToggle={() => {}} sliceAngle={angle} isLocked={false} currentDayName={currentDayName} size={140} showLabels={false} strokeRatio={0.09} />
                    </div>
                    <CardDeleteButton
                      onClick={(e) => { e.stopPropagation(); setDeletingRoutine(tasks[0]); setDeletingRoutineDay(day); setShowDeletePopup(true); }}
                      ghost
                      className="absolute bottom-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity"
                    />

                    <AnimatePresence>
                      {hoveredDay === day && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-max max-w-[220px] pointer-events-none"
                        >
                          <div className="bg-white text-black rounded-token-md shadow-glass px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{getFullDayName(day)}</p>
                            <ul className="space-y-1">
                              {tasks.map((task) => (
                                <li key={task.id} className="text-xs font-bold flex items-center gap-2 text-black">
                                  <span>{task.activity}</span>
                                  <span className="text-gray-500 font-semibold">· {formatTime12h(task.time)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {daysOfWeek.every((day) => getDayTasks(day).length === 0) && (
                <p className="text-muted font-bold text-sm py-6 col-span-full">No activities scheduled for any day yet.</p>
              )}
            </div>
          ) : (
          <Card className="relative group/card p-10 mt-4">
            {dayTasks.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-5xl mb-4 block">🌅</span>
                <p className="text-muted font-bold text-sm">No activities for {getFullDayName(activeDay)}</p>
              </div>
            ) : (
              <>
                <div className="absolute top-6 right-6 flex flex-col gap-1.5 text-[11px] font-bold items-end">
                  <span className="text-success flex items-center gap-1.5">🟢 Completed {completedCount}</span>
                  <span className="text-focus flex items-center gap-1.5">🔴 Missed {missedCount}</span>
                  <span className="text-muted flex items-center gap-1.5">⚪ Upcoming {upcomingCount}</span>
                </div>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-black text-ink">{getFullDayName(activeDay)}'s Schedule</h2>
                  <p className="text-xs text-muted mt-1">Click slice to complete · hover for details</p>
                </div>

                <div className="flex items-center justify-between gap-6">
                  {/* LEFT: Day timeline */}
                  <div className="w-[280px] shrink-0">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">🕒 Timeline</p>
                    <div className={`relative pl-1 ${dayTasks.length > 3 ? 'max-h-[280px] overflow-y-auto pr-2 ff-side-scroll' : ''}`}>
                      <div className="absolute left-[6px] top-1 bottom-1 w-0.5 bg-[rgb(var(--ink)/0.1)]" />
                      {dayTasks.map((task, index) => {
                        const completed = isTaskCompleted(task, activeDay);
                        const missed = isTaskMissed(task, activeDay, currentDayName);
                        const color = getTaskColor(task, activeDay, false, currentDayName);
                        const statusLabel = completed ? "Completed" : missed ? "Missed" : "Upcoming";
                        return (
                          <React.Fragment key={task.id}>
                            {index === nowIndex && (
                              <div className="relative pl-7 pb-4 flex items-center gap-2">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-brand ring-4 ring-brand/20 animate-pulse z-10" />
                                <span className="text-[10px] font-black text-brand uppercase tracking-wider">Now · {formatTime12h(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)}</span>
                                <div className="flex-1 h-px bg-brand/30" />
                              </div>
                            )}
                            <div className="relative pl-7 pb-5 last:pb-0 group">
                              <span className="absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface z-10" style={{ backgroundColor: color }} />
                              <p className="text-[10px] font-black uppercase tracking-wider text-muted">{formatTime12h(task.time)}</p>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-bold leading-tight truncate max-w-[180px] ${completed ? 'text-success line-through' : missed ? 'text-focus line-through' : 'text-ink'}`}>
                                  {task.activity}
                                </span>
                                {!missed && (
                                  <button onClick={() => handleEditClick(task)}
                                    className="text-sm text-info opacity-0 group-hover:opacity-100 transition-opacity leading-none">✎</button>
                                )}
                                {missed && <span className="text-xs">🔒</span>}
                              </div>
                              <span className={`text-[10px] font-bold ${completed ? 'text-success' : missed ? 'text-focus' : 'text-muted'}`}>{statusLabel}</span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      {isToday && nowIndex === -1 && (
                        <div className="relative pl-7 flex items-center gap-2">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-brand ring-4 ring-brand/20 animate-pulse z-10" />
                          <span className="text-[10px] font-black text-brand uppercase tracking-wider">Now — day's done</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CENTER: Donut Chart */}
                  <div className="flex-shrink-0">
                    <DonutChart tasks={dayTasks} activeDay={activeDay} onToggle={toggleComplete} sliceAngle={sliceAngle} isLocked={false} currentDayName={currentDayName} size={260} strokeRatio={0.11} />
                  </div>

                  {/* RIGHT: Consistency tracker */}
                  <div className="w-[280px] shrink-0">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">📈 Consistency</p>
                    <div className={`flex flex-col divide-y divide-[rgb(var(--ink)/0.06)] ${dayTasks.length > 3 ? 'max-h-[280px] overflow-y-auto pr-2 ff-side-scroll' : ''}`}>
                      {dayTasks.map((task, taskIndex) => {
                        const streak = computeStreak(task, trackerWeeks);
                        const color = getTaskColor(task, activeDay, false, currentDayName);
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: taskIndex * 0.06 }}
                            className="py-3.5 first:pt-0"
                          >
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="flex items-center gap-2 text-sm font-black text-ink truncate max-w-[150px]">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                {task.activity}
                              </span>
                              {streak > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-black text-focus shrink-0">
                                  <Flame size={12} fill="currentColor" /> {streak}w
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 pl-4">
                              {trackerWeeks.map((weekDate, i) => {
                                const done = task.completedDays?.includes(toISODate(weekDate));
                                return (
                                  <motion.span
                                    key={i}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.25, delay: taskIndex * 0.06 + i * 0.03 }}
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: done ? color : 'rgb(var(--ink) / 0.08)' }}
                                    title={weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  />
                                );
                              })}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {dayTasks.length > 0 && (
              <CardDeleteButton
                onClick={() => { setDeletingRoutine(dayTasks[0]); setDeletingRoutineDay(activeDay); setShowDeletePopup(true); }}
                ghost
                className="absolute bottom-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity"
              />
            )}
          </Card>
          )}
        </div>
      </div>

      <style>{`
        .ff-side-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        .ff-side-scroll::-webkit-scrollbar { width: 6px; }
        .ff-side-scroll::-webkit-scrollbar-track { background: transparent; }
        .ff-side-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 4px; transition: background-color 0.3s ease; }
        .ff-side-scroll:hover::-webkit-scrollbar-thumb { background-color: rgb(var(--ink) / 0.25); }
        .ff-side-scroll:hover { scrollbar-color: rgb(var(--ink) / 0.25) transparent; }
      `}</style>

      {showEditPopup && editingRoutine && (
        <EditRoutinePopup routine={editingRoutine} onClose={() => { setShowEditPopup(false); setEditingRoutine(null); }} onSave={handleEditSave} />
      )}

      {showDeletePopup && deletingRoutine && (
        <DeleteRoutinePopup
          routine={deletingRoutine}
          allRoutines={deletingRoutineDay ? getDayTasks(deletingRoutineDay) : dayTasks}
          onClose={() => { setShowDeletePopup(false); setDeletingRoutine(null); setDeletingRoutineDay(null); }}
          onDelete={handleDeleteRoutine}
        />
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="✍️ Add New Activity">
        <div>
          <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Select Days:</p>
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => handleDayToggle("All Days")}
              className={`px-4 py-2 rounded-full font-bold text-xs transition-all duration-200
                ${selectedDays.includes("All Days")
                  ? "bg-grad-hero text-on-brand shadow-[0_6px_16px_rgb(var(--brand)/0.45)] hover:-translate-y-0.5"
                  : "bg-white text-muted shadow-[0_3px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.16)] hover:-translate-y-0.5"}`}
            >
              All Days
            </button>
            {daysOfWeek.map(day => (
              <button
                key={day}
                disabled={selectedDays.includes("All Days")}
                onClick={() => handleDayToggle(day)}
                className={`px-4 py-2 rounded-full font-bold text-xs transition-all duration-200
                  ${selectedDays.includes("All Days") ? "opacity-40 cursor-not-allowed shadow-none" :
                    selectedDays.includes(day) ? "bg-grad-hero text-on-brand shadow-[0_6px_16px_rgb(var(--brand)/0.45)] hover:-translate-y-0.5" :
                    "bg-white text-muted shadow-[0_3px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.16)] hover:-translate-y-0.5"}`}
              >
                {day}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">🎨 Colour</p>
          <div className="grid grid-cols-6 gap-2 mb-5">
            {COLOR_PALETTE.map((c) => {
              const isSelected = selectedColor === c.color;
              return (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setSelectedColor(c.color)}
                  title={c.name}
                  className={`w-full aspect-square rounded-token-sm transition-all duration-200 flex items-center justify-center
                    ${isSelected ? 'scale-110 shadow-neu ring-2 ring-offset-1 ring-muted' : 'hover:scale-105 shadow-neu-sm'}`}
                  style={{ backgroundColor: c.color }}
                >
                  {isSelected && <span className="text-white text-sm font-black">✓</span>}
                </button>
              );
            })}
          </div>

          <form onSubmit={addSlot} className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="e.g. Morning Gym"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="flex-1 min-w-[160px] px-5 py-3.5 rounded-full bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm placeholder:text-muted placeholder:font-semibold"
              required
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="px-5 py-3.5 rounded-full bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm"
              required
            />
            <button type="submit" className="px-7 py-3.5 rounded-full bg-brand text-on-brand font-black text-sm shadow-[0_6px_16px_rgb(var(--brand)/0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgb(var(--brand)/0.55)] active:scale-95 disabled:opacity-60 shrink-0" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add to Routine"}
            </button>
          </form>

          <p className="text-[10px] text-muted text-center mt-5">
            {schedule.length} activities in your weekly routine
          </p>
        </div>
      </Modal>
    </div>
  );
}
