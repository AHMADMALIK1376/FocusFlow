import React from "react";
import "../Style/Home.css";

export default function TimelinePage({ tasks, setTasks, setView }) {
const taskTypes = ["Assignment", "Project", "Presentation", "Code", "Daily Task"];

const resetTimeline = () => {
if (typeof setTasks !== "function") return;
if (window.confirm("Are you sure you want to clear your entire academic timeline?")) {
setTasks([]);
}
};

const deleteCategory = (type, isCompleted) => {
if (typeof setTasks !== "function") return;
const statusText = isCompleted ? "completed" : "active";
if (window.confirm(`Remove all ${statusText} ${type}s?`)) {
const updated = tasks.filter(task => !(task.type === type && task.completed === isCompleted));
setTasks(updated);
}
};

const getSortedList = (list) => {
return [...list].sort((a, b) => {
const dateDiff = new Date(a.date) - new Date(b.date);
if (dateDiff !== 0) return dateDiff;
return (a.time || "").localeCompare(b.time || "");
});
};

const pendingTasks = tasks.filter(task => !task.completed);
const completedTasks = tasks.filter(task => task.completed);

const RenderTimeline = (list) => (
<div className="timeline">
{list.map((task) => (
<div key={task.id} className={`timeline-item ${task.completed ? "is-done" : ""}`}>
<div className="timeline-date">
{task.date}
{task.time && <span className="timeline-time-tag">⏰ {task.time}</span>}
</div>
<div className="timeline-content">
<span className="dot"></span>
<div className="timeline-text-group">
<span className="type-badge">{task.type}</span>
<p className="timeline-text">{task.text}</p>
</div>
{task.completed && <span className="status-label">Completed</span>}
</div>
</div>
))}
</div>
);

return (
<div className="home-page timeline-page-container">
<section className="hero compact-hero">
<h1 className="hero-title">Academic <span className="gradient-text">Timeline</span></h1>
<p className="hero-subtitle">Your journey organized by task category.</p>
</section>

<div className="timeline-main-content">
{tasks.length === 0 ? (
<div className="calendar-card neumorphic empty-state-card">
<p className="empty-msg">No assignments in your schedule yet. 📅</p>
</div>
) : (
<>
{pendingTasks.length > 0 && (
<div className="section-header">
<h2 className="active-title">Active Roadmap</h2>
</div>
)}

{taskTypes.map((type) => {
const tasksByType = pendingTasks.filter(t => t.type === type);
if (tasksByType.length === 0) return null;
return (
<div key={`active-${type}`} className="calendar-card neumorphic timeline-card">
<div className="card-header">
<div className="header-label-group">
<span className="icon">⏳</span>
<h3>{type}s</h3>
</div>
<div className="delete-btn-wrapper">
<button className="hover-delete-btn" onClick={() => deleteCategory(type, false)}>
<span>Clear Section</span>
</button>
</div>
</div>
{RenderTimeline(getSortedList(tasksByType))}
</div>
);
})}

{completedTasks.length > 0 && (
<>
<hr className="timeline-divider" />
<div className="section-header">
<h2 className="completed-title">Accomplished Milestones</h2>
</div>
</>
)}

{taskTypes.map((type) => {
const completedByType = completedTasks.filter(t => t.type === type);
if (completedByType.length === 0) return null;
return (
<div key={`done-${type}`} className="calendar-card neumorphic timeline-card completed-opacity">
<div className="card-header">
<div className="header-label-group">
<span className="icon">✅</span>
<h3>Completed {type}s</h3>
</div>
<div className="delete-btn-wrapper">
<button className="hover-delete-btn" onClick={() => deleteCategory(type, true)}>
<span>Clear Section</span>
</button>
</div>
</div>
{RenderTimeline(getSortedList(completedByType))}
</div>
);
})}
</>
)}
</div>

<footer className="timeline-footer">
<div className="hero-btn-group">
<button className="magic-btn" onClick={() => setView("timeline")}>
📓 Back to Planner</button>
<button className="magic-btn dashboard-link" onClick={() => setView("dashboard")}>
🏠 Dashboard
</button>
</div>

{tasks.length > 0 && (
<button className="magic-btn reset-btn" onClick={resetTimeline}>
🗑 Delete Entire Timeline
</button>
)}
</footer>
</div>
);
}

