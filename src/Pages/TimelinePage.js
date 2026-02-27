import React from "react";

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
    <div className="relative border-l-4 border-[#e0e5ec] ml-5 md:ml-8 py-4 space-y-10">
      {list.map((task) => (
        <div key={task.id} className="relative pl-10 group transition-all hover:translate-x-2">
          {/* Timeline Dot */}
          <span className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 bg-[#f0f2f5] transition-all shadow-[3px_3px_6px_#d1d9e6,-3px_-3px_6px_#ffffff] z-10 ${task.completed ? "border-green-500 bg-green-500 shadow-green-200" : "border-focusPurple"}`}></span>
          
          <div className="mb-2">
            <span className="text-xs font-black text-focusPurple uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-md">
              {task.date} {task.time && `• ⏰ ${task.time}`}
            </span>
          </div>

          <div className="bg-[#f0f2f5] p-5 rounded-2xl shadow-[10px_10px_20px_#d1d9e6,-10px_-10px_20px_#ffffff] flex justify-between items-center group-hover:shadow-[15px_15px_30px_#d1d9e6,-15px_-15px_30px_#ffffff]">
            <div>
              <span className="inline-block px-2 py-1 bg-purple-100 text-focusPurple text-[10px] font-black rounded uppercase mb-2 tracking-tighter">
                {task.type}
              </span>
              <p className={`font-bold text-gray-700 text-lg ${task.completed ? "line-through opacity-50" : ""}`}>{task.text}</p>
            </div>
            {task.completed && (
              <span className="bg-green-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase">Done</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5] py-10 px-5 flex flex-col items-center">
      {/* HERO SECTION */}
      <section className="text-center mb-16 animate-fadeInUp">
        <h1 className="text-5xl md:text-6xl font-black text-gray-800 tracking-tighter">
          Academic <span className="bg-gradient-to-r from-focusPurple to-purple-500 bg-clip-text text-transparent">Timeline</span>
        </h1>
        <p className="text-gray-500 font-medium mt-3">Your journey organized by task category.</p>
      </section>

      <div className="w-full max-w-3xl space-y-12">
        {tasks.length === 0 ? (
          <div className="p-16 rounded-[40px] bg-[#f0f2f5] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] text-center">
            <p className="text-gray-400 italic font-bold">No assignments in your schedule yet. 📅</p>
          </div>
        ) : (
          <>
            {/* ACTIVE SECTION */}
            {pendingTasks.length > 0 && (
              <div className="space-y-8">
                <h2 className="text-2xl font-black text-gray-700 px-4 border-l-4 border-focusPurple">Active Roadmap</h2>
                {taskTypes.map((type) => {
                  const tasksByType = pendingTasks.filter(t => t.type === type);
                  if (tasksByType.length === 0) return null;
                  return (
                    <div key={`active-${type}`} className="p-8 rounded-[40px] bg-[#f0f2f5] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⏳</span>
                          <h3 className="text-xl font-black text-gray-800">{type}s</h3>
                        </div>
                        <button onClick={() => deleteCategory(type, false)} className="text-focusPurple font-bold text-sm hover:scale-110 transition-transform">🗑</button>
                      </div>
                      {RenderTimeline(getSortedList(tasksByType))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* COMPLETED SECTION */}
            {completedTasks.length > 0 && (
              <div className="space-y-8 pt-10">
                <hr className="border-none h-1 bg-gray-200 rounded-full opacity-50 mb-10" />
                <h2 className="text-2xl font-black text-green-500 px-4 border-l-4 border-green-500">Accomplished Milestones</h2>
                {taskTypes.map((type) => {
                  const completedByType = completedTasks.filter(t => t.type === type);
                  if (completedByType.length === 0) return null;
                  return (
                    <div key={`done-${type}`} className="p-8 rounded-[40px] bg-[#f0f2f5] shadow-[10px_10px_30px_#d1d9e6] opacity-80 grayscale-[0.5]">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✅</span>
                          <h3 className="text-xl font-black text-gray-800">Completed {type}s</h3>
                        </div>
                        <button onClick={() => deleteCategory(type, true)} className="text-red-400 font-bold text-sm hover:scale-110 transition-transform">🗑</button>
                      </div>
                      {RenderTimeline(getSortedList(completedByType))}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER NAV */}
      <footer className="mt-20 flex flex-col items-center gap-6 w-full">
        <div className="flex gap-4">
          <button className="magic-btn" onClick={() => setView("timeline")}>📓 Back to Planner</button>
          <button className="magic-btn shadow-purple-100" onClick={() => setView("dashboard")}>🏠 Dashboard</button>
        </div>
        
        {tasks.length > 0 && (
          <button 
            className="text-red-400 font-black text-xs uppercase tracking-widest hover:underline transition-all"
            onClick={resetTimeline}
          >
            🗑 Delete Entire Timeline
          </button>
        )}
      </footer>
    </div>
  );
}