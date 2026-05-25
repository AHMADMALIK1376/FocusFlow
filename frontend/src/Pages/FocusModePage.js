import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/context/AppContext";
import { focusAPI, getToken } from "../services/api";

export default function FocusModePage() {
  const navigate = useNavigate();
  const { hours, setHours, minutes, setMinutes, seconds, setSeconds, isActive, setIsActive } = useApp();

  const [activity, setActivity] = useState("");
  const [startTime, setStartTime] = useState(null);
  const totalDurationRef = useRef(25 * 60);
  const timerCardRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load sessions from API
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        const sessions = await focusAPI.getSessions();
        setHistory(sessions);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, []);

  const processSessionEnd = useCallback(async (isComplete) => {
    const endTime = new Date();
    const currentRemaining = (hours * 3600) + (minutes * 60) + seconds;
    const dur = totalDurationRef.current;
    const secondsDone = dur - currentRemaining;

    const formatActual = (sec) => {
      const hh = Math.floor(sec / 3600);
      const mm = Math.floor((sec % 3600) / 60);
      return hh > 0 ? `${hh}h ${mm}m` : `${mm}m ${sec % 60}s`;
    };

    const sessionData = {
      activityName: activity || "Unnamed Session",
      durationSetSeconds: dur,
      actualDoneSeconds: isComplete ? dur : secondsDone,
      startTime: startTime?.toISOString(),
      endTime: endTime.toISOString(),
      status: isComplete ? "Completed" : "Stopped Early",
      remainingSeconds: isComplete ? 0 : currentRemaining
    };

    try {
      await focusAPI.createSession(sessionData);
      
      const newEntry = {
        id: Date.now(),
        activity: activity || "Unnamed Session",
        durationSet: formatActual(dur),
        actualDone: isComplete ? formatActual(dur) : formatActual(secondsDone),
        start: startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "N/A",
        end: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: endTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
        status: isComplete ? "Completed" : "Stopped Early",
        remainingSeconds: isComplete ? 0 : currentRemaining,
        totalSeconds: dur,
        activityName: activity || "Unnamed Session",
      };

      setHistory((prev) => [newEntry, ...prev]);
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    setIsActive(false);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setActivity("");
    setStartTime(null);
  }, [activity, hours, minutes, seconds, startTime, setHours, setMinutes, setSeconds, setIsActive]);

  useEffect(() => {
    if (isActive && hours === 0 && minutes === 0 && seconds === 0) {
      processSessionEnd(true);
    }
  }, [hours, minutes, seconds, isActive, processSessionEnd]);

  const handleStart = () => {
    if (!activity) return alert("Please enter an activity name!");
    const total = (hours * 3600) + (minutes * 60) + seconds;
    if (total === 0) return alert("Set a time first!");
    if (!startTime) {
      setStartTime(new Date());
      totalDurationRef.current = total;
    }
    setIsActive(true);
  };

  const handleContinue = (item) => {
    const rem = item.remainingSeconds || 0;
    if (rem === 0) return alert("No remaining time to continue!");
    setIsActive(false);
    setHours(Math.floor(rem / 3600));
    setMinutes(Math.floor((rem % 3600) / 60));
    setSeconds(rem % 60);
    setActivity(item.activityName);
    totalDurationRef.current = rem;
    setStartTime(null);
    setHistory(prev => prev.filter(h => h.id !== item.id));
    timerCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleReset = (item) => {
    const full = item.totalSeconds || 0;
    setIsActive(false);
    setHours(Math.floor(full / 3600));
    setMinutes(Math.floor((full % 3600) / 60));
    setSeconds(full % 60);
    setActivity(item.activityName);
    totalDurationRef.current = full;
    setStartTime(null);
    setHistory(prev => prev.filter(h => h.id !== item.id));
    timerCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const clearHistory = async () => {
    if (window.confirm("Are you sure you want to delete all history?")) {
      try {
        await focusAPI.deleteAll();
        setHistory([]);
      } catch (error) {
        console.error('Failed to clear history:', error);
        alert('Failed to clear history. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center px-5 pt-20 pb-10 max-w-[1200px] mx-auto min-h-screen relative animate-[fadeInUp_0.8s_ease] justify-center">
        <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-5 pt-20 pb-10 max-w-[1200px] mx-auto min-h-screen relative animate-[fadeInUp_0.8s_ease]">

      <section className="text-center mb-8">
        <span className="text-[2.8rem]">💫</span>
        <h1 className="text-4xl font-black text-gray-800">
          Deep <span className="bg-gradient-to-r from-focusPurple to-purple-400 bg-clip-text text-transparent">Flow</span>
        </h1>
      </section>

      <div className="w-full max-w-[850px] flex flex-col items-center">

        {/* Timer Card */}
        <div ref={timerCardRef} className="bg-[#f0f2f5] p-12 rounded-[40px] shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] flex flex-col items-center w-full max-w-[550px] mb-10">
          <input
            type="text"
            className="w-full max-w-[400px] bg-transparent text-center text-3xl font-black text-gray-800 border-b-4 border-focusPurple pb-2 outline-none mb-10 placeholder:text-gray-300"
            placeholder="What's the goal?"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            disabled={isActive}
          />

          <div className={`relative w-[250px] h-[250px] mb-10 bg-white rounded-full flex items-center justify-center shadow-[20px_20px_40px_#d1d9e6,-20px_-20px_40px_#ffffff] border-4 border-focusPurple/10 transition-all duration-500
            ${isActive ? 'animate-[orbPulse_2s_infinite_ease-in-out] shadow-[0_0_50px_rgba(108,92,231,0.3)]' : ''}`}>
            <div className="absolute w-4/5 h-4/5 bg-[radial-gradient(circle,rgba(108,92,231,0.2)_0%,transparent_70%)] rounded-full z-1"></div>
            <div className="flex items-center gap-1 z-10">
              {[{val: hours, fn: setHours, max: 99}, {val: minutes, fn: setMinutes, max: 59}, {val: seconds, fn: setSeconds, max: 59}].map((timer, i) => (
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

          <div className="flex gap-4 w-full">
            {!isActive ? (
              <button className="magic-btn w-full" onClick={handleStart}>
                {startTime ? "RESUME" : "START SESSION"}
              </button>
            ) : (
              <div className="flex gap-4 w-full">
                <button className="magic-btn flex-1 text-orange-400" onClick={() => setIsActive(false)}>PAUSE</button>
                <button className="magic-btn flex-1 text-red-400" onClick={() => processSessionEnd(false)}>STOP</button>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="w-full animate-[fadeInUp_0.8s_ease] mb-10">
            <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-focusPurple pl-4">
              Focus Roadmap
            </h2>
            <div className="p-8 rounded-[40px] bg-[#f0f2f5] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]">
              <div className="relative border-l-4 border-[#e0e5ec] ml-5 md:ml-8 py-4 space-y-10">
                {history.map((item) => (
                  <div key={item.id} className="relative pl-10 group transition-all hover:translate-x-2">
                    <span className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 bg-[#f0f2f5] transition-all shadow-[3px_3px_6px_#d1d9e6,-3px_-3px_6px_#ffffff] z-10
                      ${item.status === 'Completed' ? 'border-green-500 bg-green-500 shadow-green-200' : 'border-orange-400'}`}
                    ></span>
                    <div className="mb-2">
                      <span className="text-xs font-black text-focusPurple uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-md">
                        {item.date} • 🕒 {item.start} — {item.end}
                      </span>
                    </div>
                    <div className="bg-[#f0f2f5] p-5 rounded-2xl shadow-[10px_10px_20px_#d1d9e6,-10px_-10px_20px_#ffffff] flex justify-between items-center group-hover:shadow-[15px_15px_30px_#d1d9e6,-15px_-15px_30px_#ffffff]">
                      <div>
                        <span className={`inline-block px-2 py-1 text-[10px] font-black rounded uppercase mb-2 tracking-tighter
                          ${item.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
                          {item.status}
                        </span>
                        <p className="font-bold text-gray-700 text-lg">{item.activity}</p>
                        <p className="text-xs font-bold text-gray-400 mt-1">Goal: {item.durationSet} · Logged: {item.actualDone}</p>
                      </div>
                      {item.status !== 'Completed' && (
                        <div className="flex flex-col gap-2 shrink-0 ml-4">
                          <button onClick={() => handleContinue(item)} className="magic-btn text-xs px-4 py-2 text-[#7C3AED]">
                            ▶ 
                          </button>
                          <button onClick={() => handleReset(item)} className="magic-btn text-xs px-4 py-2 text-red-400">
                            ↺ 
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 mb-20 w-full flex justify-center px-4">
          <div className="flex flex-row items-center justify-center gap-6">
            <button onClick={() => navigate("/dashboard")} className="magic-btn flex items-center gap-2">
              🏠 Back to Dashboard
            </button>
            {history.length > 0 && (
              <button onClick={clearHistory} className="magic-btn text-red-400 flex items-center gap-2">
                🗑️ Clear History
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}