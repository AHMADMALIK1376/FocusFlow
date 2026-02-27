import React from "react";
import "../Style/Home.css";

export default function UniCalendar({ setView }) {
  return (
  <div className="stat-card secondary">
  <div className="card-header">
  <span className="icons">🔥</span>
  <h3>Daily Streak</h3> </div>
      
  <div className="count-display">12</div>
  <p className="card-desc">Keep the momentum going!</p>
  <button className="magic-btn" onClick={() => setView("timeline")}>📓 Open Task Planner</button>
  </div>
);
}