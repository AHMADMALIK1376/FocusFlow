import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/AppContext";

export default function TimetablePage() {
  const navigate = useNavigate();
  const { timetable: schedule, setTimetable: setSchedule } = useApp();

  const [activity, setActivity] = useState("");
  const [time, setTime] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const formatTime12h = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const resetRoutine = () => {
    if (window.confirm("Are you sure you want to clear your entire weekly routine?")) {
      setSchedule([]);
    }
  };

  const deleteWholeDay = (day) => {
    if (window.confirm(`Remove all activities from ${day}?`)) {
      const updated = schedule.map(task => ({
        ...task,
        repeatOn: task.repeatOn.filter(d => d !== day)
      })).filter(task => task.repeatOn.length > 0);
      setSchedule(updated);
    }
  };

  const isTimeReached = (taskTime) => {
    const now = new Date();
    const [hours, minutes] = taskTime.split(":").map(Number);
    const taskDate = new Date();
    taskDate.setHours(hours, minutes, 0, 0);
    return now >= taskDate;
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

  const addSlot = (e) => {
    e.preventDefault();
    if (!activity || !time) return;
    const newDays = selectedDays.includes("All Days") ? [...daysOfWeek] : (selectedDays.length > 0 ? selectedDays : [dayName]);
    const collision = schedule.find(task => task.time === time && task.repeatOn.some(day => newDays.includes(day)));

    if (collision) {
      alert(`⚠️ TIME CONFLICT!\n\nYou already have "${collision.activity}" at ${formatTime12h(time)}.`);
      return; 
    }

    const newSlot = { id: Date.now(), activity, time, completedDays: [], repeatOn: newDays };
    setSchedule([...schedule, newSlot].sort((a, b) => a.time.localeCompare(b.time)));
    setActivity(""); setTime(""); setSelectedDays([]);
  };

  const toggleComplete = (taskId, day) => {
    setSchedule(schedule.map(task => {
      if (task.id === taskId) {
        if (!isTimeReached(task.time) && day === dayName) return task;
        const isDone = task.completedDays.includes(day);
        return { ...task, completedDays: isDone ? task.completedDays.filter(d => d !== day) : [...task.completedDays, day] };
      }
      return task;
    }));
  };

  const removeSlotFromDay = (taskId, day) => {
    const updated = schedule.map(task => task.id === taskId ? { ...task, repeatOn: task.repeatOn.filter(d => d !== day) } : task).filter(task => task.repeatOn.length > 0);
    setSchedule(updated);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] py-10 px-5 flex flex-col items-center">
      
      {/* HERO SECTION */}
      <section className="text-center mb-12 animate-fadeInUp">
        <h1 className="text-5xl md:text-6xl font-black text-gray-800 tracking-tighter mb-2">
          {dayName}'s <span className="bg-gradient-to-r from-[#6c5ce7] to-purple-500 bg-clip-text text-transparent">Routine</span>
        </h1>
        <p className="text-lg text-gray-500 font-medium italic">Today is <b className="text-gray-700">{dateStr}</b></p>
      </section>

      {/* ADD ACTIVITY CARD */}
      <div className="w-full max-w-3xl bg-[#f0f2f5] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] mb-12">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-3xl">✍️</span>
          <h3 className="text-2xl font-black text-gray-800">Add New Activity</h3>
        </div>

        <div className="mb-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Select Days:</p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => handleDayToggle("All Days")}
              className={`px-5 py-2 rounded-xl font-bold transition-all shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] ${selectedDays.includes("All Days") ? "text-[#6c5ce7] shadow-inner" : "text-gray-500 hover:text-[#6c5ce7]"}`}
            >
              All Days
            </button>
            {daysOfWeek.map(day => (
              <button 
                key={day}
                disabled={selectedDays.includes("All Days")}
                onClick={() => handleDayToggle(day)}
                className={`px-4 py-2 rounded-xl font-bold transition-all shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] ${selectedDays.includes("All Days") ? "opacity-40" : selectedDays.includes(day) ? "text-[#6c5ce7] shadow-inner" : "text-gray-500 hover:text-[#6c5ce7]"}`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={addSlot} className="flex flex-wrap gap-4">
          <input 
            type="text" placeholder="e.g. GYM" value={activity} 
            onChange={(e) => setActivity(e.target.value)}
            className="w-100% p-5 rounded-2xl bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-500 placeholder:text-gray-300 border-none focus:ring-2 ring-purple-100/50 transition-all"
          />
          <input 
            type="time" value={time} 
            onChange={(e) => setTime(e.target.value)}
            className="w-80% p-5 rounded-2xl bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-500 placeholder:text-gray-300 border-none focus:ring-2 ring-purple-100/50 transition-all"
          />
          <button type="submit" className="magic-btn">Add to Routine</button>
        </form>
      </div>

      {/* WEEKLY LIST */}
      <div className="w-full max-w-4xl space-y-8">
        {daysOfWeek.map((day) => {
          const isToday = day === dayName;
          const dayTasks = schedule.filter(task => task.repeatOn.includes(day));
          if (dayTasks.length === 0) return null;

          return (
            <div key={day} className={`bg-[#f0f2f5] p-8 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 ${!isToday ? 'opacity-70 scale-[0.98]' : ''}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className={`text-xl font-black uppercase tracking-tight ${isToday ? 'text-[#6c5ce7]' : 'text-gray-400'}`}>{day}</h3>
                  {isToday && <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full animate-pulse">ACTIVE</span>}
                </div>
                {/* Clear Day — kept minimal since it's inline in a card header */}
                <button onClick={() => deleteWholeDay(day)} className="text-gray-400 hover:text-red-500 font-bold text-sm transition-colors group">
                  <span className="group-hover:hidden">Clear Day</span>
                  <span className="hidden group-hover:inline text-lg">🗑</span>
                </button>
              </div>

              <div className="relative">
                {!isToday && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-2xl">
                    <span className="bg-white px-4 py-2 rounded-full shadow-md text-xs font-black text-gray-400 uppercase tracking-widest">Locked until {day}</span>
                  </div>
                )}

                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {dayTasks.map((task) => {
                    const isCompleted = task.completedDays.includes(day);
                    const unlocked = isTimeReached(task.time);

                    return (
                      <div key={`${day}-${task.id}`} className={`min-w-[150px] p-5 rounded-3xl bg-white shadow-sm border-l-4 transition-all ${isCompleted ? 'border-green-500 opacity-60' : 'border-[#6c5ce7]'}`}>
                        <p className={`font-black text-gray-800 ${isCompleted ? 'line-through' : ''}`}>{task.activity}</p>
                        <p className="text-xs font-bold text-[#6c5ce7] mt-1">{formatTime12h(task.time)}</p>

                        {isToday && (
                          <div className="flex gap-2 mt-4">
                            {/* These are small circular action buttons — kept as-is */}
                            <button 
                              onClick={() => toggleComplete(task.id, day)}
                              className={`w-8 h-8 flex items-center justify-center rounded-full text-white transition-transform hover:scale-110 ${!unlocked && !isCompleted ? "bg-gray-300 cursor-not-allowed" : "bg-green-500"}`}
                            >
                              {!unlocked && !isCompleted ? "🔒" : (isCompleted ? "↩" : "✔")}
                            </button>
                            <button onClick={() => removeSlotFromDay(task.id, day)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-400 text-white hover:scale-110 transition-transform">×</button> 
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER NAVIGATION */}
      <footer className="mt-20 w-full flex justify-center px-4">
        <div className="flex flex-row items-center gap-6">
          <button onClick={() => navigate("/dashboard")} className="magic-btn">
            🏠 Back to Dashboard
          </button>
          {schedule.length > 0 && (
            <button onClick={resetRoutine} className="magic-btn text-red-400">
              🗑 Reset Whole Routine
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}