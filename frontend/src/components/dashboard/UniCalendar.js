// src/components/dashboard/UniCalendar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Card, Button } from "../ui";

export default function UniCalendar() {
  const navigate = useNavigate();
  const { tasks } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [nextTask, setNextTask] = useState(null);
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setWeeklyProgress(0);
      setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
      setNextTask(null);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const upcomingTasks = tasks
      .filter(t => !t.completed && t.date >= today)
      .sort((a, b) => {
        if (a.date === b.date) return (a.time || '00:00').localeCompare(b.time || '00:00');
        return a.date.localeCompare(b.date);
      });

    if (upcomingTasks.length > 0) {
      const task = upcomingTasks[0];
      setNextTask(task);
      calculateTimeLeft(task);
    } else {
      setNextTask(null);
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const dailyCompletion = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayTasks = tasks.filter(t => t.date === dateStr);
      const dayCompleted = dayTasks.filter(t => t.completed).length;
      const dayTotal = dayTasks.length;

      dailyCompletion.push(dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0);
    }
    setWeeklyData(dailyCompletion);

    const weekTasks = tasks.filter(t => t.date >= startOfWeek.toISOString().split('T')[0]);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    const weekTotal = weekTasks.length;

    setWeeklyProgress(weekTotal > 0 ? (weekCompleted / weekTotal) * 100 : 0);

    const interval = setInterval(() => {
      if (nextTask) calculateTimeLeft(nextTask);
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks, nextTask]);

  const calculateTimeLeft = (task) => {
    if (!task || !task.date) return;
    const now = new Date();
    const dueDate = new Date(task.date);
    if (task.time) {
      const [hours, minutes] = task.time.split(':');
      dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      dueDate.setHours(23, 59, 59, 999);
    }
    const diffMs = dueDate - now;
    if (diffMs <= 0) { setTimeLeft("Past due"); return; }
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffDays > 0) setTimeLeft(`${diffDays}d ${diffHours}h left`);
    else if (diffHours > 0) setTimeLeft(`${diffHours}h ${diffMinutes}m left`);
    else setTimeLeft(`${diffMinutes}m left`);
  };

  const formatTimeTo12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const chartWidth = 280;
  const chartHeight = 140;
  const barWidth = 30;
  const barSpacing = 10;
  const maxBarHeight = 90;
  const startX = 20;

  const barHeights = weeklyData.map(value => (value / 100) * maxBarHeight);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card className="min-w-[320px] max-w-[450px] min-h-[420px] transition-all duration-500 text-center hover:-translate-y-2 relative overflow-hidden">
      {/* Front: Weekly Trend */}
      <div className={`flex flex-col items-center justify-center h-full transition-all duration-500 ${isExpanded ? "opacity-0 scale-95 absolute inset-0 pointer-events-none" : "opacity-100 scale-100 relative"}`}>
        <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-1">Weekly Trend</h3>
        <p className="text-[10px] text-muted mb-4">Daily completion rate</p>

        <div className="relative w-full flex justify-center mb-4">
          <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {[0, 25, 50, 75, 100].map((level) => {
              const y = chartHeight - 20 - (level / 100) * maxBarHeight;
              return (
                <g key={level}>
                  <line x1={startX} y1={y} x2={chartWidth - startX} y2={y}
                    stroke="rgb(var(--ink)/0.08)" strokeWidth="1" strokeDasharray="4" />
                  <text x={startX - 5} y={y + 2} textAnchor="end" fontSize="6" fill="rgb(var(--muted))">
                    {level}%
                  </text>
                </g>
              );
            })}

            {weeklyData.map((value, index) => {
              const x = startX + index * (barWidth + barSpacing);
              const y = chartHeight - 20 - barHeights[index];
              const barStroke = value >= 80
                ? 'rgb(var(--success))'
                : value >= 50
                  ? 'rgb(var(--brand))'
                  : 'rgb(var(--warn))';

              return (
                <g key={index}>
                  <rect x={x} y={y} width={barWidth} height={barHeights[index]}
                    fill={barStroke} rx="4" ry="4"
                    className="transition-all duration-700 ease-out">
                    <title>{`${dayLabels[index]}: ${Math.round(value)}%`}</title>
                  </rect>
                  <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="7"
                    fill={barStroke} fontWeight="bold">
                    {Math.round(value)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between w-full max-w-[280px] mx-auto">
          {dayLabels.map((day, index) => (
            <div key={index} className="text-center" style={{ width: barWidth, marginLeft: index === 0 ? 0 : barSpacing }}>
              <span className="text-[7px] text-muted font-medium">{day}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-[280px] mx-auto mt-4">
          <div className="flex justify-between text-center">
            <div className="flex-1">
              <p className="text-sm font-black text-brand">{Math.round(weeklyProgress)}%</p>
              <p className="text-[8px] text-muted">Weekly Avg</p>
            </div>
            <div className="w-px h-8 bg-[rgb(var(--ink)/0.08)]"></div>
            <div className="flex-1">
              <p className="text-sm font-black text-success">{Math.max(...weeklyData).toFixed(0)}%</p>
              <p className="text-[8px] text-muted">Best Day</p>
            </div>
            <div className="w-px h-8 bg-[rgb(var(--ink)/0.08)]"></div>
            <div className="flex-1">
              <p className="text-sm font-black text-warn">{Math.min(...weeklyData).toFixed(0)}%</p>
              <p className="text-[8px] text-muted">Lowest</p>
            </div>
          </div>
        </div>

        <Button variant="primary" size="sm" className="mt-4" onClick={() => navigate("/tasks")}>
          📓 Open Task Planner
        </Button>
      </div>

      {/* Back: Next Task */}
      <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center transition-all duration-700 ease-spring rounded-token-lg bg-surface-2
        ${isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
        <div className="flex flex-col items-center w-full">
          <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-1">Next Task</h3>
          <p className="text-[10px] text-muted mb-4">Your upcoming deadline</p>

          {nextTask ? (
            <div className="w-full bg-surface rounded-token-md shadow-neu border border-[rgb(var(--ink)/0.08)] overflow-hidden">
              <div className="h-1.5 bg-grad-hero"></div>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-brand/10 rounded-token-sm flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📋</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-black text-ink leading-tight">{nextTask.text}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-brand/10 text-brand text-[8px] font-black rounded-full uppercase tracking-wider">
                      {nextTask.type || 'General'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[rgb(var(--ink)/0.08)]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-surface-2 rounded-token-sm flex items-center justify-center">
                      <span className="text-sm">📅</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[8px] text-muted uppercase tracking-wider">Due Date</p>
                      <p className="text-xs font-bold text-ink">{nextTask.date}</p>
                    </div>
                  </div>
                  {nextTask.time && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-warn/10 rounded-token-sm flex items-center justify-center">
                        <span className="text-sm">⏰</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[8px] text-muted uppercase tracking-wider">Deadline</p>
                        <p className="text-xs font-bold text-warn">{formatTimeTo12Hour(nextTask.time)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 p-2.5 bg-brand/5 rounded-token-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⏳</span>
                      <span className="text-[9px] font-bold text-muted">Time Remaining</span>
                    </div>
                    <span className="text-xs font-black text-brand">{timeLeft || "Calculating..."}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-6 bg-surface rounded-token-md text-center border border-[rgb(var(--ink)/0.08)]">
              <span className="text-3xl mb-2 block">✅</span>
              <p className="text-sm font-black text-ink">All caught up!</p>
              <p className="text-[9px] text-muted mt-1">No pending tasks</p>
            </div>
          )}
        </div>
      </div>

      <button
        className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-brand text-on-brand text-xl flex items-center justify-center z-10 shadow-neu-sm hover:scale-110 hover:rotate-12 transition-transform"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Switch View"
      >
        {isExpanded ? "↩" : "📊"}
      </button>
    </Card>
  );
}
