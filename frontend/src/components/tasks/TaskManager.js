// src/components/tasks/TaskManager.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { taskAPI, getToken } from "../../services/api";

export default function TaskManager() {
  const navigate = useNavigate();
  const { tasks, setTasks, setCompletedGoals } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add a ref to prevent multiple fetches
  const hasFetched = useRef(false);

  const [input, setInput] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("Assignment");

  const taskOptions = ["Assignment", "Project", "Presentation", "Code", "Quiz", "Daily Task"];

  // Helper function to convert 24-hour time to 12-hour format for display
  const formatTimeTo12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  // Load tasks from API on mount - only once
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        console.log('Fetching tasks...');
        const fetchedTasks = await taskAPI.getAll();
        console.log('Tasks fetched:', fetchedTasks.length);

        if (JSON.stringify(tasks) !== JSON.stringify(fetchedTasks)) {
          setTasks(fetchedTasks);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        setError(error.message || 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetTimeline = async () => {
    if (!window.confirm("Are you sure you want to clear your entire academic timeline?")) return;

    try {
      await taskAPI.deleteAll();
      setTasks([]);
      alert("All tasks deleted successfully!");
    } catch (error) {
      console.error('Failed to delete all tasks:', error);
      alert(error.message || 'Failed to delete tasks. Please try again.');
    }
  };

  const deleteCategory = async (categoryType) => {
    if (!window.confirm(`Remove all pending ${categoryType}s?`)) return;

    try {
      await taskAPI.deleteByType(categoryType, false);
      const updated = tasks.filter(task => !(task.type === categoryType && !task.completed));
      setTasks(updated);
      alert(`All pending ${categoryType}s removed!`);
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(error.message || 'Failed to delete tasks. Please try again.');
    }
  };

  const addTask = async (e) => {
    e.preventDefault();

    if (!input || !date) {
      alert("Please enter task text and date");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Adding task:', { text: input, date, time, type });
      const newTask = await taskAPI.create({
        text: input,
        date: date,
        time: time,
        type: type
      });
      console.log('Task added successfully:', newTask);

      setTasks([...tasks, newTask.task]);
      setInput("");
      setDate("");
      setTime("");
      setType("Assignment");
    } catch (error) {
      console.error('Failed to add task - Full error:', error);
      alert(error.message || 'Failed to add task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleComplete = async (id) => {
    try {
      console.log('Toggling task completion:', id);
      await taskAPI.toggleComplete(id);

      setTasks(tasks.map(t => {
        if (t.id === id) {
          if (!t.completed) setCompletedGoals(prev => prev + 1);
          return { ...t, completed: !t.completed };
        }
        return t;
      }));
      console.log('Task toggled successfully');
    } catch (error) {
      console.error('Failed to toggle task:', error);
      alert(error.message || 'Failed to update task. Please try again.');
    }
  };

  const pendingTasks = tasks.filter(t => !t.completed);

  if (loading) {
    return (
      <div className="flex flex-col items-center w-full max-w-[900px] mx-auto py-10 px-4 animate-fadeInUp">
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center w-full max-w-[900px] mx-auto py-10 px-4">
        <div className="bg-focus/10 border border-focus/30 rounded-token-lg p-6 text-center max-w-md">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-xl font-black text-focus mb-2">Error Loading Tasks</h2>
          <p className="text-muted mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="magic-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[900px] mx-auto py-10 px-4 animate-fadeInUp">

      {/* HERO */}
      <section className="text-center mb-12">
        <h1 className="text-[3.5rem] font-black text-ink tracking-tight leading-tight">
          Task <span className="text-brand">Planner</span>
        </h1>
        <p className="text-xl text-muted font-medium">Design your academic journey.</p>
      </section>

      {/* ADD TASK CARD */}
      <div className="w-full bg-surface p-10 rounded-token-xl shadow-neu mb-12 transition-transform hover:-translate-y-1">
        <h3 className="text-2xl font-black text-ink mb-8">Add New Task</h3>
        <form onSubmit={addTask} className="space-y-6">
          <input
            type="text"
            className="w-full p-5 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-semibold text-ink focus:shadow-neu transition-all"
            placeholder="e.g. Data Structures Project"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="w-full">
            <p className="text-xs font-extrabold text-muted uppercase tracking-widest mb-4">Select Category:</p>
            <div className="flex flex-wrap gap-3">
              {taskOptions.map((option) => (
                <div
                  key={option}
                  className={`px-5 py-2.5 rounded-token-sm text-sm font-bold cursor-pointer transition-all shadow-neu-sm
                    ${type === option ? "text-brand shadow-neu-inset" : "text-muted hover:text-brand hover:-translate-y-0.5"}`}
                  onClick={() => setType(option)}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="time"
              className="flex-1 p-4 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-bold text-ink"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <input
              type="date"
              className="flex-1 p-4 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-bold text-ink"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <button type="submit" className="magic-btn w-full py-5" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to Flow"}
          </button>
        </form>
      </div>

      {/* PENDING LIST */}
      <div className="w-full space-y-12">
        <h2 className="text-2xl font-black text-ink text-left border-l-4 border-brand pl-4">Pending Roadmap</h2>

        {pendingTasks.length === 0 ? (
          <div className="w-full bg-surface p-10 rounded-token-xl shadow-neu-inset text-center">
            <p className="text-muted italic font-bold">All caught up! 🎉</p>
          </div>
        ) : (
          taskOptions.map((cat) => {
            const tasksByCategory = pendingTasks.filter(t => t.type === cat);
            if (tasksByCategory.length === 0) return null;

            return (
              <div key={cat} className="group w-full bg-surface p-8 rounded-token-xl shadow-neu">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏳</span>
                    <h3 className="text-xl font-black text-ink">{cat}s</h3>
                  </div>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="relative text-brand font-extrabold text-sm group/del overflow-hidden h-8 flex items-center"
                  >
                    <span className="group-hover/del:translate-y-[-150%] transition-transform duration-300">Clear Section</span>
                    <span className="absolute inset-0 translate-y-[150%] group-hover/del:translate-y-0 transition-transform duration-300 flex items-center justify-center text-lg">🗑</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {tasksByCategory.map((task) => (
                    <div key={task.id} className="flex justify-between items-center bg-surface p-6 rounded-token-lg shadow-neu-sm hover:scale-[1.01] hover:translate-x-2 transition-all duration-300 border-l-0 hover:border-l-4 border-brand">
                      <div className="text-left">
                        <p className="text-lg font-black text-ink mb-1">{task.text}</p>
                        <div className="flex gap-4">
                          <span className="text-xs font-bold text-brand tracking-widest uppercase">📅 {task.date}</span>
                          {task.time && (
                            <span className="text-xs font-bold text-brand tracking-widest uppercase">
                              ⏰ {formatTimeTo12Hour(task.time)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleComplete(task.id)}
                        className="px-6 py-2 rounded-token-sm bg-surface-2 shadow-neu-sm text-success font-black hover:bg-success hover:text-on-brand hover:shadow-neu transition-all"
                      >
                        Done
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      <footer className="mt-16 w-full flex justify-center px-4">
        <div className="flex flex-row items-center justify-center gap-6 flex-wrap">
          <button onClick={() => navigate("/timeline")} className="magic-btn flex items-center gap-2">
            🗺️ Academic Timeline
          </button>
          <button onClick={() => navigate("/dashboard")} className="magic-btn flex items-center gap-2">
            🏠 Dashboard
          </button>
          {tasks.length > 0 && (
            <button onClick={resetTimeline} className="magic-btn text-focus flex items-center gap-2">
              🗑 Delete All Tasks
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
