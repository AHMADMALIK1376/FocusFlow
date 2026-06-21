// src/Pages/TimelinePage.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/context/AppContext";
import { taskAPI, getToken } from "../services/api";
import { Card, Button } from "../components/ui";

export default function TimelinePage() {
  const navigate = useNavigate();
  const { tasks, setTasks } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const taskTypes = ["Assignment", "Project", "Presentation", "Code", "Daily Task"];

  const formatTimeTo12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        if (!token) { setLoading(false); return; }
        const fetchedTasks = await taskAPI.getAll();
        setTasks(fetchedTasks);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError(err.message || 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [setTasks]);

  const resetTimeline = async () => {
    if (!setTasks) return;
    if (window.confirm("Are you sure you want to clear your entire academic timeline?")) {
      try {
        await taskAPI.deleteAll();
        setTasks([]);
        alert("All tasks deleted successfully!");
      } catch (err) {
        console.error('Failed to delete all tasks:', err);
        alert('Failed to delete tasks. Please try again.');
      }
    }
  };

  const deleteCategory = async (type, isCompleted) => {
    if (!setTasks) return;
    const statusText = isCompleted ? "completed" : "active";
    if (window.confirm(`Remove all ${statusText} ${type}s?`)) {
      try {
        await taskAPI.deleteByType(type, isCompleted);
        const updated = tasks.filter(task => !(task.type === type && task.completed === isCompleted));
        setTasks(updated);
      } catch (err) {
        console.error('Failed to delete category:', err);
        alert('Failed to delete tasks. Please try again.');
      }
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

  const renderTimeline = (taskList, isCompleted = false) => {
    if (taskList.length === 0) return null;
    return (
      <div className="relative border-l-4 border-[rgb(var(--ink)/0.1)] ml-5 md:ml-8 py-4 space-y-10">
        {taskList.map((task) => {
          const formattedTime = formatTimeTo12Hour(task.time);
          return (
            <div key={task.id} className="relative pl-10 group transition-all hover:translate-x-2">
              <span className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 bg-surface z-10
                ${isCompleted ? 'border-success' : 'border-brand'}`}>
              </span>
              <div className="mb-2">
                <span className="text-xs font-black text-brand uppercase tracking-widest bg-brand/10 px-2 py-1 rounded-token-sm">
                  {task.date} {task.time && `• ⏰ ${formattedTime}`}
                </span>
              </div>
              <div className="bg-surface-2 p-5 rounded-token-md shadow-neu-sm flex justify-between items-center">
                <div>
                  <span className="inline-block px-2 py-1 bg-brand/10 text-brand text-[10px] font-black rounded uppercase mb-2 tracking-tighter">
                    {task.type}
                  </span>
                  <p className={`font-bold text-ink text-lg ${task.completed ? "line-through opacity-50" : ""}`}>
                    {task.text}
                  </p>
                </div>
                {task.completed && (
                  <span className="bg-success text-on-brand text-[10px] px-3 py-1 rounded-full font-black uppercase">
                    Done
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas py-10 px-5 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas py-10 px-5 flex flex-col items-center justify-center">
        <Card className="p-6 text-center max-w-md">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-xl font-black text-focus mb-2">Error Loading Timeline</h2>
          <p className="text-muted mb-4">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-5 flex flex-col items-center">
      <section className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-black text-ink tracking-tighter">
          Academic <span className="bg-gradient-to-r from-brand to-brand-soft bg-clip-text text-transparent">Timeline</span>
        </h1>
        <p className="text-muted font-medium mt-3">Your journey organized by task category.</p>
      </section>

      <div className="w-full max-w-3xl space-y-12">
        {tasks.length === 0 ? (
          <Card className="p-16 text-center">
            <p className="text-muted italic font-bold">No assignments in your schedule yet. 📅</p>
          </Card>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <div className="space-y-8">
                <h2 className="text-2xl font-black text-ink px-4 border-l-4 border-brand">Active Roadmap</h2>
                {taskTypes.map((type) => {
                  const tasksByType = pendingTasks.filter(t => t.type === type);
                  if (tasksByType.length === 0) return null;
                  return (
                    <Card key={`active-${type}`}>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⏳</span>
                          <h3 className="text-xl font-black text-ink">{type}s</h3>
                        </div>
                        <button onClick={() => deleteCategory(type, false)} className="text-muted hover:text-focus font-bold text-sm hover:scale-110 transition-transform">
                          🗑
                        </button>
                      </div>
                      {renderTimeline(getSortedList(tasksByType), false)}
                    </Card>
                  );
                })}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="space-y-8 pt-10">
                <hr className="border-none h-px bg-[rgb(var(--ink)/0.08)] mb-10" />
                <h2 className="text-2xl font-black text-success px-4 border-l-4 border-success">Accomplished Milestones</h2>
                {taskTypes.map((type) => {
                  const completedByType = completedTasks.filter(t => t.type === type);
                  if (completedByType.length === 0) return null;
                  return (
                    <Card key={`completed-${type}`}>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✅</span>
                          <h3 className="text-xl font-black text-ink">Completed {type}s</h3>
                        </div>
                        <button onClick={() => deleteCategory(type, true)} className="text-focus font-bold text-sm hover:scale-110 transition-transform">
                          🗑
                        </button>
                      </div>
                      {renderTimeline(getSortedList(completedByType), true)}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="mt-20 w-full flex justify-center px-4">
        <div className="flex flex-row items-center justify-center gap-6 flex-wrap">
          <Button variant="ghost" onClick={() => navigate("/tasks")}>📓 Back to Planner</Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>🏠 Back to Dashboard</Button>
          {tasks.length > 0 && (
            <Button variant="danger" onClick={resetTimeline}>🗑 Delete All Tasks</Button>
          )}
        </div>
      </footer>
    </div>
  );
}
