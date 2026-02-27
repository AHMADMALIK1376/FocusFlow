import React, { useState } from "react";
import "../Style/Home.css";

export default function FocusTimer({ setView, hours, minutes, seconds, isActive }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`stat-card neumorphic liquid-card ${isExpanded ? "expanded" : ""}`}>

      <div className="card-face face-front">
        <div className="card-header">
          <span className="icons">⚡</span>
          <h3>Deep Work</h3>
        </div>
        <div className="count-display">🚀</div>
        <p className="card-desc">Set custom timers & track sessions.</p>
        <button className="magic-btn" onClick={() => setView("focus-mode")}>
          ⏱️ Enter Focus Mode
        </button>
      </div>

    
      <div className="card-face face-back">
        <div className="card-header">
          <span className="icons">{isActive ? "☄️" : "🪐"}</span>
          <h3>Flow State</h3>
        </div>

          <div className={`timer-orb ${isActive ? "pulsing" : ""}`}style={{ width: '150px', height: '150px' }}>
          <div className="orb-inner-glow"></div>
          
          <div 
            className={`editable-timer-display ${isActive ? "" : ""}`} 
            style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              color: isActive ? '#6c5ce7' : 'inherit'
            }}
          >
            {displayTime}
          </div>
        </div>

      
      </div>

      <button className="liquid-trigger" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? "↩" : "⏳"}
      </button>
    </div>
  );
}