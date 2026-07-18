import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../components/context/AppContext";
import { focusAPI, getToken } from "../services/api";
import { Card, Button, RepeatButton, ClearHistoryButton } from "../components/ui";

const isCompleted = (status) => (status || "").toLowerCase() === "completed";

export default function FocusModePage() {
  const { hours, setHours, minutes, setMinutes, seconds, setSeconds, isActive, setIsActive } = useApp();

  const [activity, setActivity] = useState("");
  const [startTime, setStartTime] = useState(null);
  const totalDurationRef = useRef(25 * 60);
  const timerCardRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = getToken();
        if (!token) { setLoading(false); return; }
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
      <div className="flex flex-col items-center px-5 pt-20 pb-10 max-w-[1200px] mx-auto min-h-screen justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-5 pt-4 pb-10 max-w-[1200px] mx-auto min-h-screen animate-[fadeInUp_0.8s_ease]">
      <section className="w-full max-w-[1100px] text-left mb-4">
        <span className="text-[2.8rem]">💫</span>
        <h1 className="text-4xl font-black text-ink">
          Deep <span className="bg-gradient-to-r from-brand to-brand-soft bg-clip-text text-transparent">Flow</span>
        </h1>
      </section>

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row items-start gap-8">
        {/* Left: Timer Card */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col items-center">
          <Card ref={timerCardRef} className="flex flex-col items-center w-full">
            <input
              type="text"
              className="w-full max-w-[400px] bg-transparent text-center text-3xl font-black text-ink border-b-4 border-brand pb-2 outline-none mb-10 placeholder:text-muted"
              placeholder="What's the goal?"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              disabled={isActive}
            />

            <div className={`relative w-[250px] h-[250px] mb-10 bg-surface-2 rounded-full flex items-center justify-center shadow-neu border-2 transition-all duration-500 ${isActive ? 'border-brand' : 'border-[rgb(var(--ink)/0.08)]'}`}>
              <div className="flex items-center gap-1 z-10">
                {[{val: hours, fn: setHours, max: 99}, {val: minutes, fn: setMinutes, max: 59}, {val: seconds, fn: setSeconds, max: 59}].map((timer, i) => (
                  <React.Fragment key={i}>
                    <input
                      type="number"
                      className="w-16 bg-transparent border-none font-mono text-4xl font-black text-ink text-center outline-none focus:text-brand disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={String(timer.val).padStart(2, '0')}
                      onChange={(e) => timer.fn(Math.max(0, Math.min(timer.max, parseInt(e.target.value) || 0)))}
                      disabled={isActive}
                    />
                    {i < 2 && <span className="text-3xl font-black text-muted mb-1">:</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex gap-4 w-full">
              {!isActive ? (
                <Button variant="primary" full onClick={handleStart}>
                  {startTime ? "RESUME" : "START SESSION"}
                </Button>
              ) : (
                <div className="flex gap-4 w-full">
                  <Button variant="ghost" full onClick={() => setIsActive(false)}>PAUSE</Button>
                  <Button variant="danger" full onClick={() => processSessionEnd(false)}>STOP</Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Focus Roadmap */}
        <div className="w-full flex-1 min-w-0">
          <h2 className="text-2xl font-black text-ink mb-6 border-l-4 border-brand pl-4">
            Focus Roadmap
          </h2>
          {history.length > 0 ? (
            <Card className="flex flex-col">
              <div className="ff-roadmap-scroll overflow-y-auto pr-2" style={{ maxHeight: 520 }}>
                <div className="relative border-l-4 border-[rgb(var(--ink)/0.1)] ml-5 md:ml-8 py-4 space-y-10">
                  {history.map((item) => {
                    const done = isCompleted(item.status);
                    return (
                      <div key={item.id} className="relative pl-10 group transition-all hover:translate-x-2">
                        <span className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 bg-surface z-10 ${done ? 'border-green-500' : 'border-red-500'}`}></span>
                        <div className="mb-2">
                          <span className="text-xs font-black text-brand uppercase tracking-widest bg-brand/10 px-2 py-1 rounded-token-sm">
                            {item.date} • 🕒 {item.start} — {item.end}
                          </span>
                        </div>
                        <div className="bg-surface-2 p-5 rounded-token-md shadow-neu-sm flex justify-between items-center">
                          <div>
                            <span className={`inline-block px-2 py-1 text-[10px] font-black rounded uppercase mb-2 tracking-tighter ${done ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                              {item.status}
                            </span>
                            <p className="font-bold text-ink text-lg">{item.activity}</p>
                            <p className="text-xs font-bold text-muted mt-1">Goal: {item.durationSet} · Logged: {item.actualDone}</p>
                          </div>
                          {!done && (
                            <div className="flex flex-col gap-2 shrink-0 ml-4">
                              <Button size="sm" variant="primary" onClick={() => handleContinue(item)}>▶</Button>
                              <RepeatButton onClick={() => handleReset(item)} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[rgb(var(--ink)/0.08)] flex justify-center">
                <ClearHistoryButton onClick={clearHistory} />
              </div>
            </Card>
          ) : (
            <Card className="text-center py-10">
              <p className="text-muted font-medium">No focus sessions yet — start one to build your roadmap.</p>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        .ff-roadmap-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        .ff-roadmap-scroll::-webkit-scrollbar { width: 6px; }
        .ff-roadmap-scroll::-webkit-scrollbar-track { background: transparent; }
        .ff-roadmap-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 4px; transition: background-color 0.3s ease; }
        .ff-roadmap-scroll:hover::-webkit-scrollbar-thumb { background-color: rgb(var(--ink) / 0.25); }
        .ff-roadmap-scroll:hover { scrollbar-color: rgb(var(--ink) / 0.25) transparent; }
      `}</style>
    </div>
  );
}
