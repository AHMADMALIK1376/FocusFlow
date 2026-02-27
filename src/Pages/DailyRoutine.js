import React, { useState } from "react";
import "../Style/Home.css";

export default function TimetablePage({ schedule, setSchedule, setView }) {
  const [activity, setActivity] = useState("");
  const [time, setTime] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Helper function to convert 24h string to 12h AM/PM string
  const formatTime12h = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12; // Convert 0 to 12
    return `${h}:${minutes} ${ampm}`;
  };

  const resetRoutine = () => {
    if (window.confirm("Are you sure you want to clear your entire weekly routine? This cannot be undone.")) {
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
        if (filtered.includes(day)) {
          return filtered.filter(d => d !== day);
        } else {
          return [...filtered, day];
        }
      });
    }
  };

  const addSlot = (e) => {
    e.preventDefault();
    if (!activity || !time) return;

    const newDays = selectedDays.includes("All Days") 
      ? [...daysOfWeek] 
      : (selectedDays.length > 0 ? selectedDays : [dayName]);

    const collision = schedule.find(task => {
      const sameTime = task.time === time;
      const sameDay = task.repeatOn.some(day => newDays.includes(day));
      return sameTime && sameDay;
    });

    if (collision) {
      // Alert now uses the AM/PM format in the message
      alert(`⚠️ TIME CONFLICT!\n\nYou already have "${collision.activity}" scheduled at ${formatTime12h(time)} on one of the selected days.\n\nPlease choose a different time.`);
      return; 
    }

    const newSlot = {
      id: Date.now(),
      activity,
      time, // We store 24h internally for easy sorting/logic
      completedDays: [],
      repeatOn: newDays
    };

    const updated = [...schedule].concat(newSlot).sort((a, b) => a.time.localeCompare(b.time));
    setSchedule(updated);
    setActivity("");
    setTime("");
    setSelectedDays([]);
  };

  const toggleComplete = (taskId, day) => {
    setSchedule(schedule.map(task => {
      if (task.id === taskId) {
        if (!isTimeReached(task.time) && day === dayName) return task;
        const isDone = task.completedDays.includes(day);
        return {
          ...task,
          completedDays: isDone
            ? task.completedDays.filter(d => d !== day)
            : [...task.completedDays, day]
        };
      }
      return task;
    }));
  };

  const removeSlotFromDay = (taskId, day) => {
    const updated = schedule.map(task => {
      if (task.id === taskId) {
        return { ...task, repeatOn: task.repeatOn.filter(d => d !== day) };
      }
      return task;
    }).filter(task => task.repeatOn.length > 0);
    setSchedule(updated);
  };

  const isTaskOnDay = (task, day) => task.repeatOn.includes(day);

  return (
    <div className="home-page">
      <section className="hero">
        <h1 className="hero-title">{dayName}'s <span className="gradient-text">Routine</span> </h1>
        <p className="hero-subtitle">Today is <b>{dateStr}</b></p>
        <div style={{ marginTop: '15px' }}>
          <button className="magic-btn back-btn" onClick={() => setView("dashboard")}> ⬅ Back to Dashboard </button>
        </div>
      </section>

      <div className="calendar-card neumorphic">
        <div className="card-header">
          <span className="icons">✍️</span>
          <h3>Add New Activity</h3>
        </div>

        <div className="type-selector" style={{ marginBottom: '20px' }}>
          <p className="label">Select Days:</p>
          <div className="chip-group">
            <div className={`type-chip ${selectedDays.includes("All Days") ? "active" : ""}`} onClick={() => handleDayToggle("All Days")}>All Days</div>
            {daysOfWeek.map(day => (
              <div key={day}
                className={`type-chip ${selectedDays.includes(day) ? "active" : ""}`}
                style={selectedDays.includes("All Days") ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                onClick={() => handleDayToggle(day)}>
                {day.substring(0, 3)}</div>
            ))}
          </div>
        </div>

        <form onSubmit={addSlot} className="task-form routine-form">
          <input type="text" placeholder="e.g. GYM" value={activity} onChange={(e) => setActivity(e.target.value)} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <button type="submit" className="magic-btn">Add to Routine</button>
        </form>
      </div>

      <div className="weekly-container" style={{ width: '100%', maxWidth: '900px' }}>
        {daysOfWeek.map((day) => {
          const isToday = day === dayName;
          const dayTasks = schedule.filter(task => isTaskOnDay(task, day));
          if (dayTasks.length === 0) return null;

          return (
            <div key={day} className={`calendar-card neumorphic day-card ${!isToday ? 'locked-card' : ''}`}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: isToday ? '#6c5ce7' : '#b2bec3', textTransform: 'uppercase', margin: 0 }}>{day}</h3>
                  {isToday && <span className="status-label">ACTIVE</span>}
                </div>
                <div className="delete-btn-wrapper">
                  <button className="hover-delete-btn" onClick={() => deleteWholeDay(day)}>
                    <span>Clear Day</span>
                  </button>
                </div>
              </div>

              <div className="day-content" style={{ position: 'relative' }}>
                {!isToday && (
                  <div className="lock-overlay">
                    <span className="lock-text">LOCKED UNTIL {day.toUpperCase()}</span>
                  </div>
                )}

                <div className="task-horizontal-list" style={{ display: 'flex', gap: '15px', padding: '10px 0', overflowX: 'auto' }}>
                  {dayTasks.map((task) => {
                    const isCompleted = task.completedDays.includes(day);
                    const unlocked = isTimeReached(task.time);

                    return (
                      <div key={`${day}-${task.id}`} className={`mini-task-card neumorphic ${isCompleted ? 'mini-done' : ''}`}>
                        <p className="mini-activity">{task.activity}</p>
                        {/* Displaying time in AM/PM format */}
                        <p className="mini-time">{formatTime12h(task.time)}</p>

                        {isToday && (
                          <div className="mini-actions">
                            <button onClick={() => toggleComplete(task.id, day)}
                              className={`mini-btn tick ${!unlocked && !isCompleted ? "locked-time" : ""}`}
                              title={!unlocked ? "Wait for the scheduled time" : ""} >
                              {!unlocked && !isCompleted ? "🔒" : (isCompleted ? "↩" : "✔")}
                            </button>
                            <button onClick={() => removeSlotFromDay(task.id, day)} className="mini-btn cross">×</button> 
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

      {schedule.length > 0 && (
        <footer style={{ margin: '40px 0', textAlign: 'center' }}>
          <button className="magic-btn"
            style={{ color: '#6c5ce7', border: '1px solid rgba(255, 118, 117, 0.2)' }}
            onClick={resetRoutine}>🗑 Reset Whole Routine </button>
        </footer>
      )}
    </div>
  );
}