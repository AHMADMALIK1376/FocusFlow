import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { taskAPI, getToken } from "../services/api";
export default function UniCalendar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [nextTask, setNextTask] = useState(null);
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        const tasks = await taskAPI.getAll();
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
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    const interval = setInterval(() => {
      if (nextTask) {
        calculateTimeLeft(nextTask);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [nextTask]);

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
    
    if (diffMs <= 0) {
      setTimeLeft("Past due");
      return;
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      setTimeLeft(`${diffDays}d ${diffHours}h left`);
    } else if (diffHours > 0) {
      setTimeLeft(`${diffHours}h ${diffMinutes}m left`);
    } else {
      setTimeLeft(`${diffMinutes}m left`);
    }
  };

  const formatTimeTo12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  // Bar Chart parameters
  const chartWidth = 280;
  const chartHeight = 140;
  const barWidth = 30;
  const barSpacing = 10;
  const maxBarHeight = 90;
  const startX = 20;
  
  const barHeights = weeklyData.map(value => (value / 100) * maxBarHeight);
  
  const getBarColor = (value) => {
    if (value >= 80) return "#22c55e";
    if (value >= 60) return "#6c5ce7";
    if (value >= 40) return "#f59e0b";
    return "#ef4444";
  };
  
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (loading) {
    return (
      <div className="flex-1 min-w-[320px] max-w-[450px] bg-[#f0f2f5] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-transform duration-300 hover:-translate-y-2 text-center group flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`relative bg-[#f0f2f5] p-8 rounded-[40px] flex-1 min-w-[320px] max-w-[450px] min-h-[420px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 text-center group hover:-translate-y-2`}>
      
      {/* FRONT FACE - Weekly Trend Bar Chart */}
      <div className={`flex flex-col items-center justify-center h-full transition-all duration-500 ${isExpanded ? "opacity-0 scale-95 absolute inset-0" : "opacity-100 scale-100 relative"}`}>
        <h3 className="text-lg font-black text-gray-800 mb-1">Weekly Trend</h3>
        <p className="text-[10px] text-gray-400 mb-4">Daily completion rate</p>

        {/* Bar Chart */}
        <div className="relative w-full flex justify-center mb-4">
          <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {/* Y-axis grid lines */}
            {[0, 25, 50, 75, 100].map((level) => {
              const y = chartHeight - 20 - (level / 100) * maxBarHeight;
              return (
                <line
                  key={level}
                  x1={startX}
                  y1={y}
                  x2={chartWidth - startX}
                  y2={y}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
              );
            })}
            
            {/* Y-axis labels */}
            {[0, 25, 50, 75, 100].map((level) => {
              const y = chartHeight - 20 - (level / 100) * maxBarHeight;
              return (
                <text
                  key={level}
                  x={startX - 5}
                  y={y + 2}
                  textAnchor="end"
                  fontSize="6"
                  fill="#aaa"
                >
                  {level}%
                </text>
              );
            })}
            
            {/* Bars */}
            {weeklyData.map((value, index) => {
              const x = startX + index * (barWidth + barSpacing);
              const y = chartHeight - 20 - barHeights[index];
              const barColor = getBarColor(value);
              
              return (
                <g key={index}>
                  {/* Bar with animation */}
                  <rect
                    x={x}
                    y={chartHeight - 20}
                    width={barWidth}
                    height="0"
                    fill={barColor}
                    rx="4"
                    ry="4"
                    opacity="0.3"
                  />
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeights[index]}
                    fill={barColor}
                    rx="4"
                    ry="4"
                    className="transition-all duration-700 ease-out"
                  >
                    <title>{`${dayLabels[index]}: ${Math.round(value)}%`}</title>
                  </rect>
                  {/* Value label */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="7"
                    fill={barColor}
                    fontWeight="bold"
                  >
                    {Math.round(value)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between w-full max-w-[280px] mx-auto">
          {dayLabels.map((day, index) => (
            <div key={index} className="text-center" style={{ width: barWidth, marginLeft: index === 0 ? 0 : barSpacing }}>
              <span className="text-[7px] text-gray-400 font-medium">{day}</span>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="w-full max-w-[280px] mx-auto mt-4">
          <div className="flex justify-between text-center">
            <div className="flex-1">
              <p className="text-sm font-black text-focusPurple">{Math.round(weeklyProgress)}%</p>
              <p className="text-[8px] text-gray-500">Weekly Avg</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="flex-1">
              <p className="text-sm font-black text-green-500">{Math.max(...weeklyData).toFixed(0)}%</p>
              <p className="text-[8px] text-gray-500">Best Day</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="flex-1">
              <p className="text-sm font-black text-orange-500">{Math.min(...weeklyData).toFixed(0)}%</p>
              <p className="text-[8px] text-gray-500">Lowest</p>
            </div>
          </div>
        </div>

        <button className="magic-btn mt-4" onClick={() => navigate("/tasks")}>📓 Open Task Planner</button>
      </div>

      {/* BACK FACE - Next Task Card */}
      <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[40px]
        ${isExpanded ? "opacity-100 scale-100 relative" : "opacity-0 scale-95 pointer-events-none"}
        bg-gradient-to-br from-gray-50 to-gray-200`}>
        
        <div className="flex flex-col items-center w-full">
          <h3 className="text-lg font-black text-gray-800 mb-1">Next Task</h3>
          <p className="text-[10px] text-gray-400 mb-4">Your upcoming deadline</p>

          {nextTask ? (
            <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-focusPurple to-purple-400"></div>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-focusPurple/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📋</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-black text-gray-800 leading-tight">{nextTask.text}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-focusPurple/10 text-focusPurple text-[8px] font-black rounded-full uppercase tracking-wider">
                      {nextTask.type || 'General'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm">📅</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[8px] text-gray-400 uppercase tracking-wider">Due Date</p>
                      <p className="text-xs font-bold text-gray-700">{nextTask.date}</p>
                    </div>
                  </div>
                  {nextTask.time && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                        <span className="text-sm">⏰</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[8px] text-gray-400 uppercase tracking-wider">Deadline</p>
                        <p className="text-xs font-bold text-orange-500">{formatTimeTo12Hour(nextTask.time)}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 p-2.5 bg-gradient-to-r from-focusPurple/5 to-purple-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⏳</span>
                      <span className="text-[9px] font-bold text-gray-600">Time Remaining</span>
                    </div>
                    <span className="text-xs font-black text-focusPurple">{timeLeft || "Calculating..."}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-6 bg-gray-50 rounded-2xl text-center">
              <span className="text-3xl mb-2 block">✅</span>
              <p className="text-sm font-black text-gray-600">All caught up!</p>
              <p className="text-[9px] text-gray-400 mt-1">No pending tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* LIQUID TRIGGER BUTTON */}
      <button
        className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-focusPurple text-white text-xl flex items-center justify-center z-10 shadow-[0_4px_15px_rgba(108,92,231,0.4)] hover:scale-110 hover:rotate-12 transition-transform"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Switch View"
      >
        {isExpanded ? "↩" : "📊"}
      </button>
    </div>
  );
}