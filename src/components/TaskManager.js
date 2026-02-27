import React, { useState } from "react";
import "../Style/Home.css";

export default function TaskManager({ tasks, setTasks, setCompletedGoals, setView }) {
const [input, setInput] = useState("");
const [date, setDate] = useState("");
const [time, setTime] = useState("");
const [type, setType] = useState("Assignment");

const taskOptions = ["Assignment", "Project", "Presentation", "Code", "Quiz", "Daily Task"];

const resetTimeline = () => {
if (window.confirm("Are you sure you want to clear your entire academic timeline?")) {
setTasks([]);
}
};

const deleteCategory = (categoryType) => {
if (window.confirm(`Remove all pending ${categoryType}s?`)) {
const updated = tasks.filter(task => !(task.type === categoryType && !task.completed));
setTasks(updated);
}
};

const addTask = (e) => {
e.preventDefault();
if (!input || !date) return;
const newTask = {
id: Date.now(),
text: input,
date: date,
time: time,
type: type,
completed: false,
};
setTasks([...tasks, newTask]);
setInput(""); setDate(""); setTime(""); setType("Assignment");
};

const toggleComplete = (id) => {
setTasks(tasks.map(task => {
if (task.id === id) {
if (!task.completed) {
setCompletedGoals(prev => prev + 1);
}
return { ...task, completed: !task.completed };
}
return task;
}));
};

const pendingTasks = tasks.filter(t => !t.completed);

return (
<div className="task-manager-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
<div className="task-planner-view">
<section className="hero">
<h1 className="hero-title">Task <span className="gradient-text">Planner</span></h1>
<p className="hero-subtitle">Design your academic journey.</p>
</section>
</div>

<div className="add-task-card neumorphic">
<h3>Add New Task</h3>
<form onSubmit={addTask} className="task-form">
<input
type="text"
className="full-width-input"
placeholder="e.g. Data Structures Project"
value={input}
onChange={(e) => setInput(e.target.value)}
/>
<div className="type-selector">
<p className="label">Select Category:</p>
<div className="chip-group">
{taskOptions.map((option) => (
<div
key={option}
className={`type-chip ${type === option ? "active" : ""}`}
onClick={() => setType(option)}
>
{option}
</div>
))}
</div>
</div>
<div className="input-row">
<input type="time" className="task-time-input" value={time} onChange={(e) => setTime(e.target.value)} />
<input type="date" className="task-date-input" value={date} onChange={(e) => setDate(e.target.value)} />
</div>
<button type="submit" className="magic-btn submit-btn">Add to Flow</button></form>
</div>

<div className="pending-list" style={{ width: '100%', maxWidth: '850px' }}>
<h2 className="active-title">Pending Roadmap</h2>

{pendingTasks.length === 0 ? (
<div className="calendar-card neumorphic empty-state-card">
<p className="empty-msg">All caught up! 🎉</p></div>
) : (
taskOptions.map((cat) => {
const tasksByCategory = pendingTasks.filter(t => t.type === cat);
if (tasksByCategory.length === 0) return null;

return (
  <div key={cat} className="calendar-card neumorphic timeline-card">
  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', minHeight: '50px' }}>
  <div className="header-label-group">
  <span className="icon" style={{ fontSize: '1.5rem' }}>⏳</span>
  <h3 style={{ margin: '5px 0 15px 0', textAlign: 'left' }}>{cat}s</h3></div>

  <div className="delete-btn-wrapper">
  <button className="hover-delete-btn"
   onClick={() => deleteCategory(cat)}
    style={{ background: 'none', border: 'none', color: '#6c5ce7', cursor: 'pointer' }}>
  <span>Clear Section</span> </button></div>
  </div>

  <div className="task-scroll-container">
  {tasksByCategory.map((task) => (
  <div key={task.id} className="task-item neumorphic">
  <div style={{ textAlign: 'left' }}>
  <p className="task-text" style={{ fontWeight: '800', margin: '0 0 5px 0' }}>{task.text}</p>
  <div className="task-meta-row">
  <span className="task-date">📅 {task.date}</span>
  {task.time && <span className="task-date"> ⏰ {task.time}</span>}</div>
  </div>
  <button onClick={() => toggleComplete(task.id)} className="check-btn"> Done </button></div>
  ) 
  )
  }

   </div>
   </div>
   );
   })
   )}
   </div>

   <footer className="timeline-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', gap: '15px' }}>
   <div className="hero-btn-group" style={{ display: 'flex', gap: '15px' }}>
   <button className="magic-btn" onClick={() => setView("roadmap")} style={{ fontWeight: '600' }}>🗺️ Academic Timeline
   </button>
   <button className="magic-btn dashboard-link" onClick={() => setView("dashboard")} style={{ fontWeight: '600' }}>
  🏠 Dashboard </button> </div>

   {tasks.length > 0 && (
   <button className="magic-btn reset-btn" onClick={resetTimeline} style={{ width: '250px', fontWeight: '700', color: '#ff7675' }}>
    🗑 Delete All Tasks
    </button>
)}
    </footer>
    </div>
);
}

