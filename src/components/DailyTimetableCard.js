import React, { useState } from "react";
import "../Style/Home.css";

export default function DailyTimetableCard({ schedule, setView }) {
const [isExpanded, setIsExpanded] = useState(false);

const today = new Date();
const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const todaysRemainingTasks = schedule.filter(task =>
task.repeatOn.includes(todayName) && !task.completedDays.includes(todayName)
).length;

const todaysCompletedTasks = schedule.filter(task =>
task.repeatOn.includes(todayName) && task.completedDays.includes(todayName)
).length;

return (
<div className={`stat-card neumorphic liquid-card ${isExpanded ? "expanded" : ""}`}>

<div className="card-face face-front">
<div className="card-header">
<span className="icons">🕒</span>
<h3>{todayName} Routine</h3>
</div>
<div className="count-display">{todaysRemainingTasks}</div>
<p className="card-desc">Remaining Tasks</p>
<button className="magic-btn" onClick={() => setView("timetablePage")}>📅 Manage Schedule</button>
</div>

<div className="card-face face-back">
<div className="card-header">
<span className="icons">🏅</span>
<h3>Total Task Completed</h3>
</div>
<div className="count-display completed-glow">{todaysCompletedTasks}</div>
<div className="proto-footer">
<p className="proto-day">{todayName}</p>
<p className="proto-date">{dateStr}</p>
</div>
</div>

<button
className="liquid-trigger"
onClick={() => setIsExpanded(!isExpanded)}
title="Switch View"
>
{isExpanded ? "↩" : "📊"}
</button>
</div>
);
}
