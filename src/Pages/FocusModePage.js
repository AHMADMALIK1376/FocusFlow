import React, { useState, useEffect } from "react";
import "../Style/FocusPage.css";

// Now accepting global timer state as props
export default function FocusModePage({ 
  setView, 
  hours, setHours, 
  minutes, setMinutes, 
  seconds, setSeconds, 
  isActive, setIsActive 
}) {
  const [activity, setActivity] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [totalDuration, setTotalDuration] = useState(25 * 60);

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("focus_history");
    return saved ? JSON.parse(saved) : [];
  });

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("focus_history", JSON.stringify(history));
  }, [history]);

  // Handle Session Completion (saving to roadmap)
  const processSessionEnd = (isComplete) => {
    const endTime = new Date();
    const currentRemaining = (hours * 3600) + (minutes * 60) + seconds;
    const secondsDone = totalDuration - currentRemaining;
    
    const formatActual = (sec) => {
      const hh = Math.floor(sec / 3600);
      const mm = Math.floor((sec % 3600) / 60);
      return hh > 0 ? `${hh}h ${mm}m` : `${mm}m ${sec % 60}s`;
    };

    const newEntry = {
      id: Date.now(),
      activity: activity || "Unnamed Session",
      durationSet: formatActual(totalDuration),
      actualDone: isComplete ? formatActual(totalDuration) : formatActual(secondsDone),
      start: startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "N/A",
      end: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: endTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
      status: isComplete ? "Completed" : "Stopped Early"
    };

    setHistory((prev) => [newEntry, ...prev]);
    setIsActive(false);
    
    // Reset inputs to default after session ends
    setHours(0); 
    setMinutes(0); 
    setSeconds(0);
    setActivity("");
    setStartTime(null);
  };

  // Watch for the timer hitting zero to auto-complete
  useEffect(() => {
    if (isActive && hours === 0 && minutes === 0 && seconds === 0) {
      processSessionEnd(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, minutes, seconds, isActive]);

  const handleStart = () => {
    if (!activity) return alert("Please enter an activity name!");
    const total = (hours * 3600) + (minutes * 60) + seconds;
    if (total === 0) return alert("Set a time first!");
    
    if (!startTime) {
      setStartTime(new Date());
      setTotalDuration(total);
    }
    setIsActive(true);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to delete all history?")) {
      setHistory([]);
    }
  };

  return (
    <div className="home-page focus-page-container">
      <section className="hero compact-hero">
        <span className="icons" style={{ fontSize: "2.8rem" }}>💫</span>
        <h1 className="hero-title">Deep <span className="gradient-text">Flow</span></h1>
      </section>

      <div className="focus-main-layout">
        <div className="calendar-card neumorphic focus-timer-card">
          <input 
            type="text" className="focus-input" placeholder="What's the goal?" 
            value={activity} onChange={(e) => setActivity(e.target.value)} disabled={isActive}
          />

          <div className={`timer-orb ${isActive ? "pulsing" : ""}`}>
            <div className="orb-inner-glow"></div>
            <div className="editable-timer-display count-display">
              <input 
                type="number" 
                value={String(hours).padStart(2, '0')} 
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))} 
                disabled={isActive} 
              />
              <span>:</span>
              <input 
                type="number" 
                value={String(minutes).padStart(2, '0')} 
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} 
                disabled={isActive} 
              />
              <span>:</span>
              <input 
                type="number" 
                value={String(seconds).padStart(2, '0')} 
                onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} 
                disabled={isActive} 
              />
            </div>
          </div>

          <div className="timer-actions">
            {!isActive ? (
              <button className="magic-btn start-btn" onClick={handleStart}>
                {startTime ? "RESUME" : "START SESSION"}
              </button>
            ) : (
              <div className="action-group">
                <button className="magic-btn pause-btn" onClick={() => setIsActive(false)}>PAUSE</button>
                <button className="magic-btn stop-btn" onClick={() => processSessionEnd(false)}>STOP</button>
              </div>
            )}
          </div>
        </div>

        {/* Roadmap / History Section */}
        {history.length > 0 && (
          <>
            <div className="section-header" style={{marginTop: '40px'}}>
               <h2 className="active-title">Focus Roadmap</h2>
            </div>
            <div className="calendar-card neumorphic timeline-card">
              <div className="timeline">
                {history.map((item) => (
                  <div key={item.id} className="timeline-item">
                    <div className="timeline-date">
                      {item.date} 
                      <span className="timeline-time-tag">🕒 {item.start} — {item.end}</span>
                    </div>
                    <div className="timeline-content">
                      <span className="dot"></span>
                      <div className="timeline-text-group">
                        <span className={`type-badge ${item.status === 'Completed' ? 'success-bg' : 'warn-bg'}`}>{item.status}</span>
                        <p className="timeline-text">{item.activity}</p>
                        <small className="session-details">Goal: {item.durationSet} | Logged: {item.actualDone}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="focus-footer-actions">
          <button className="magic-btn dashboard-link" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>
          {history.length > 0 && (
            <button className="magic-btn reset-btn" onClick={clearHistory}>
              🗑️ Clear History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}