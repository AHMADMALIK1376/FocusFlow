import React, { useState, useEffect } from "react";

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

  useEffect(() => {
    localStorage.setItem("focus_history", JSON.stringify(history));
  }, [history]);

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
    setHours(0); setMinutes(0); setSeconds(0);
    setActivity("");
    setStartTime(null);
  };

  useEffect(() => {
    if (isActive && hours === 0 && minutes === 0 && seconds === 0) {
      processSessionEnd(true);
    }
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
    if (window.confirm("Are you sure you want to delete all history?")) setHistory([]);
  };

  return (
    <div className="flex flex-col items-center px-5 pt-20 pb-10 max-w-[1200px] mx-auto min-h-screen relative animate-[fadeInUp_0.8s_ease]">
      {/* Hero Header */}
      <section className="text-center mb-8">
        <span className="text-[2.8rem]">💫</span>
        <h1 className="text-4xl font-black text-gray-800">
          Deep <span className="bg-gradient-to-r from-focusPurple to-purple-400 bg-clip-text text-transparent">Flow</span>
        </h1>
      </section>

      <div className="w-full max-w-[850px] flex flex-col items-center">
        {/* Timer Card (Neumorphic) */}
        <div className="bg-[#f0f2f5] p-12 rounded-[40px] shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] flex flex-col items-center w-full max-w-[550px] mb-10">
          <input 
            type="text" 
            className="w-full max-w-[400px] bg-transparent text-center text-3xl font-black text-gray-800 border-b-4 border-focusPurple pb-2 outline-none mb-10 placeholder:text-gray-300" 
            placeholder="What's the goal?" 
            value={activity} 
            onChange={(e) => setActivity(e.target.value)} 
            disabled={isActive}
          />

          {/* Pulsing Timer Orb */}
          <div className={`relative w-[250px] h-[250px] mb-10 bg-white rounded-full flex items-center justify-center shadow-[20px_20px_40px_#d1d9e6,-20px_-20px_40px_#ffffff] border-4 border-focusPurple/10 transition-all duration-500 
            ${isActive ? 'animate-[orbPulse_2s_infinite_ease-in-out] shadow-[0_0_50px_rgba(108,92,231,0.3)]' : ''}`}>
            
            <div className="absolute w-4/5 h-4/5 bg-[radial-gradient(circle,rgba(108,92,231,0.2)_0%,transparent_70%)] rounded-full z-1"></div>
            
            <div className="flex items-center gap-1 z-10">
              {[ {val: hours, fn: setHours, max: 99}, {val: minutes, fn: setMinutes, max: 59}, {val: seconds, fn: setSeconds, max: 59} ].map((timer, i) => (
                <React.Fragment key={i}>
                  <input 
                    type="number" 
                    className="w-16 bg-transparent border-none font-mono text-4xl font-black text-gray-800 text-center outline-none focus:text-focusPurple disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={String(timer.val).padStart(2, '0')} 
                    onChange={(e) => timer.fn(Math.max(0, Math.min(timer.max, parseInt(e.target.value) || 0)))} 
                    disabled={isActive} 
                  />
                  {i < 2 && <span className="text-3xl font-black text-gray-300 mb-1">:</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Timer Buttons */}
          <div className="flex gap-4 w-full">
            {!isActive ? (
              <button className="w-full bg-focusPurple text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-110 transition-all active:scale-95" onClick={handleStart}>
                {startTime ? "RESUME" : "START SESSION"}
              </button>
            ) : (
              <div className="flex gap-4 w-full">
                <button className="flex-1 bg-white text-orange-400 font-bold py-4 rounded-2xl shadow-md border border-orange-100 hover:bg-orange-50 transition-all" onClick={() => setIsActive(false)}>PAUSE</button>
                <button className="flex-1 bg-white text-red-400 font-bold py-4 rounded-2xl shadow-md border border-red-100 hover:bg-red-50 transition-all" onClick={() => processSessionEnd(false)}>STOP</button>
              </div>
            )}
          </div>
        </div>

        {/* Roadmap / History Section */}
        {history.length > 0 && (
          <div className="w-full animate-[fadeInUp_0.8s_ease]">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
              <span className="w-2 h-8 bg-focusPurple rounded-full"></span> Focus Roadmap
            </h2>
            <div className="bg-white p-10 rounded-[40px] shadow-xl border border-gray-100 w-full mb-10">
              <div className="space-y-8">
                {history.map((item) => (
                  <div key={item.id} className="relative pl-8 border-l-2 border-dashed border-gray-200">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-focusPurple border-4 border-white shadow-sm"></div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-bold text-gray-400 text-sm uppercase tracking-wider">{item.date}</span>
                      <span className="bg-purple-50 text-focusPurple px-3 py-1 rounded-lg text-xs font-bold border border-purple-100">🕒 {item.start} — {item.end}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${item.status === 'Completed' ? 'bg-green-500' : 'bg-red-400'}`}>
                        {item.status}
                      </span>
                      <p className="text-xl font-bold text-gray-800">{item.activity}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-500 mt-1">Goal: {item.durationSet} | Logged: {item.actualDone}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 mb-20">
          <button className="bg-white text-focusPurple px-10 py-4 rounded-[20px] font-bold shadow-[6px_6px_12px_#d1d9e6,-2px_-2px_5px_#ffffff] hover:-translate-y-1 transition-all flex items-center gap-2" onClick={() => setView("dashboard")}>
            🏠 Back to Dashboard
          </button>
          {history.length > 0 && (
            <button className="bg-white text-red-400 px-10 py-4 rounded-[20px] font-bold shadow-[6px_6px_12px_#d1d9e6,-2px_-2px_5px_#ffffff] hover:-translate-y-1 transition-all flex items-center gap-2" onClick={clearHistory}>
              🗑️ Clear History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}