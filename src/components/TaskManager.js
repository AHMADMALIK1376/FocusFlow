import React, { useState } from "react";

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
    <div className="flex flex-col items-center w-full max-w-[900px] mx-auto py-10 px-4 animate-fadeInUp">
      
      {/* HERO SECTION */}
      <section className="text-center mb-12">
        <h1 className="text-[3.5rem] font-black text-gray-800 tracking-tight leading-tight">
          Task <span className="bg-gradient-to-r from-focusPurple to-purple-400 bg-clip-text text-transparent">Planner</span>
        </h1>
        <p className="text-xl text-gray-500 font-medium">Design your academic journey.</p>
      </section>

      {/* ADD TASK CARD */}
      <div className="w-full bg-[#f0f2f5] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] mb-12 transition-transform hover:-translate-y-1">
        <h3 className="text-2xl font-black text-gray-800 mb-8">Add New Task</h3>
        <form onSubmit={addTask} className="space-y-6">
          <input
            type="text"
            className="w-full p-5 rounded-2xl bg-[#f0f2f5] shadow-[inset_8px_8px_16px_#d1d9e6,inset_-8px_-8px_16px_#ffffff] outline-none font-semibold focus:shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] transition-all"
            placeholder="e.g. Data Structures Project"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="w-full">
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Select Category:</p>
            <div className="flex flex-wrap gap-3">
              {taskOptions.map((option) => (
                <div
                  key={option}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] 
                    ${type === option ? "text-focusPurple shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]" : "text-gray-500 hover:text-focusPurple hover:-translate-y-0.5"}`}
                  onClick={() => setType(option)}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <input type="time" className="flex-1 p-4 rounded-2xl bg-[#f0f2f5] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-700" value={time} onChange={(e) => setTime(e.target.value)} />
            <input type="date" className="flex-1 p-4 rounded-2xl bg-[#f0f2f5] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-700" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <button type="submit" className="w-full py-5 rounded-2xl bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] text-focusPurple font-black hover:-translate-y-1 active:scale-[0.98] active:shadow-inner transition-all">
            Add to Flow
          </button>
        </form>
      </div>

      {/* PENDING LIST */}
      <div className="w-full space-y-12">
        <h2 className="text-2xl font-black text-gray-800 text-left border-l-4 border-focusPurple pl-4">Pending Roadmap</h2>

        {pendingTasks.length === 0 ? (
          <div className="w-full bg-[#f0f2f5] p-10 rounded-[40px] shadow-[inset_10px_10px_20px_#d1d9e6,inset_-10px_-10px_20px_#ffffff] text-center">
            <p className="text-gray-400 italic font-bold">All caught up! 🎉</p>
          </div>
        ) : (
          taskOptions.map((cat) => {
            const tasksByCategory = pendingTasks.filter(t => t.type === cat);
            if (tasksByCategory.length === 0) return null;

            return (
              <div key={cat} className="group w-full bg-[#f0f2f5] p-8 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏳</span>
                    <h3 className="text-xl font-black text-gray-800">{cat}s</h3>
                  </div>

                  <button 
                    onClick={() => deleteCategory(cat)}
                    className="relative text-focusPurple font-extrabold text-sm group/del overflow-hidden h-8 flex items-center"
                  >
                    <span className="group-hover/del:translate-y-[-150%] transition-transform duration-300">Clear Section</span>
                    <span className="absolute inset-0 translate-y-[150%] group-hover/del:translate-y-0 transition-transform duration-300 flex items-center justify-center text-lg">🗑</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {tasksByCategory.map((task) => (
                    <div key={task.id} className="flex justify-between items-center bg-[#f0f2f5] p-6 rounded-[24px] shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] hover:scale-[1.01] hover:translate-x-2 transition-all duration-300 border-l-0 hover:border-l-4 border-focusPurple">
                      <div className="text-left">
                        <p className="text-lg font-black text-gray-800 mb-1">{task.text}</p>
                        <div className="flex gap-4">
                          <span className="text-xs font-bold text-focusPurple tracking-widest uppercase">📅 {task.date}</span>
                          {task.time && <span className="text-xs font-bold text-focusPurple tracking-widest uppercase">⏰ {task.time}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleComplete(task.id)} 
                        className="px-6 py-2 rounded-xl bg-[#f0f2f5] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] text-[#00b894] font-black hover:bg-[#00b894] hover:text-white hover:shadow-[0_10px_20px_rgba(0,184,148,0.3)] transition-all"
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
    {(() => {
      // Shared "Blueprint" classes
      const baseBtn = "bg-[#f0f2f5] text-focusPurple py-4 px-8 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap hover:-translate-y-1 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff]";

      return (
        <>
          <button 
            onClick={() => setView("roadmap")} 
            className={`${baseBtn} `}
          >
            🗺️ Academic Timeline
          </button>

          <button 
            onClick={() => setView("dashboard")} 
            className={`${baseBtn} `}
          >
            🏠 Dashboard
          </button>

          {tasks.length > 0 && (
            <button 
              onClick={resetTimeline} 
              className={`${baseBtn}  text-red-400 hover:text-red-500 hover:shadow-[0_5px_15px_rgba(255,118,117,0.2)]`}
            >
              🗑 Delete All Tasks
            </button>
          )}
        </>
      );
    })()}
  </div>
</footer>
    </div>
  );
}