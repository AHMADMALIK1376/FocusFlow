import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../components/context/AppContext";
import { focusAPI, getToken } from "../services/api";
import { Card, RepeatButton, ClearHistoryButton, CardDeleteButton } from "../components/ui";
import DialTimer from "../components/dashboard/DialTimer";

const isCompleted = (status) => (status || "").toLowerCase() === "completed";

const formatDuration = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m ${s % 60}s`;
};

// Normalizes both freshly-created sessions and ones fetched from the API
// (which use activityName/startTime/endTime instead of activity/start/end)
// into one consistent display shape.
const formatSession = (raw) => {
  const start = raw.startTime ? new Date(raw.startTime) : null;
  const end = raw.endTime ? new Date(raw.endTime) : null;
  const dateSrc = end || start;
  return {
    id: raw.id,
    activity: raw.activityName || "Unnamed Session",
    activityName: raw.activityName || "Unnamed Session",
    durationSet: formatDuration(raw.durationSetSeconds),
    actualDone: formatDuration(raw.actualDoneSeconds),
    start: start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A",
    end: end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A",
    date: dateSrc ? dateSrc.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : "",
    status: raw.status,
    remainingSeconds: raw.remainingSeconds || 0,
    totalSeconds: raw.durationSetSeconds || 0,
  };
};

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
        setHistory(sessions.map(formatSession));
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
      const res = await focusAPI.createSession(sessionData);
      const newEntry = formatSession({ id: res?.sessionId || Date.now(), ...sessionData });
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

  const handlePlayPause = () => {
    if (isActive) setIsActive(false);   // pause
    else handleStart();                 // start (or resume if startTime set)
  };

  const handleDialReset = () => {
    if (isActive || startTime) {
      processSessionEnd(false);          // stop early & save
    } else {
      setHours(0); setMinutes(25); setSeconds(0);
      totalDurationRef.current = 25 * 60;
    }
  };

  const handleRepeat = (item) => {
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

  const handleDeleteSession = async (id) => {
    try {
      await focusAPI.deleteSession(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
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
      <section className="w-full max-w-[1100px] mb-4 flex items-center gap-3">
        <span className="text-[2.8rem] leading-none">💫</span>
        <h1 className="text-4xl font-black text-ink">
          Deep <span className="bg-gradient-to-r from-brand to-brand-soft bg-clip-text text-transparent">Flow</span>
        </h1>
      </section>

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row items-stretch gap-8">
        {/* Left: Timer Card */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col">
          <Card ref={timerCardRef} className="flex flex-col items-center w-full h-[600px]">
            <input
              type="text"
              className="w-full bg-surface-2 shadow-neu-inset rounded-full px-6 py-3.5 text-left text-sm font-bold text-ink placeholder:text-muted placeholder:font-semibold outline-none focus:ring-2 focus:ring-brand/40 mb-6 shrink-0 disabled:opacity-60"
              placeholder="e.g. Morning Gym"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              disabled={isActive}
            />

            <DialTimer
              className="flex-1 w-full"
              hours={hours} minutes={minutes} seconds={seconds}
              setHours={setHours} setMinutes={setMinutes} setSeconds={setSeconds}
              isActive={isActive}
              startTime={startTime}
              editable={!isActive && !startTime}
              onPlayPause={handlePlayPause}
              onReset={handleDialReset}
            />
          </Card>
        </div>

        {/* Right: Focus Roadmap */}
        <div className="w-full flex-1 min-w-0 flex flex-col">
          {history.length > 0 ? (
            <Card className="h-[600px] flex flex-col">
              <h2 className="text-2xl font-black text-ink mb-4 border-l-4 border-brand pl-4 shrink-0">
                Focus Roadmap
              </h2>
              <div className="ff-roadmap-scroll overflow-y-auto pr-2 flex-1 min-h-0">
                <div className="relative border-l-4 border-[rgb(var(--ink)/0.1)] ml-5 md:ml-8 py-4 space-y-10">
                  {history.map((item) => {
                    const done = isCompleted(item.status);
                    return (
                      <div key={item.id} className="relative pl-10 group transition-all hover:translate-x-2">
                        <span className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 bg-surface z-10 ${done ? 'border-green-500' : 'border-red-500'}`}></span>
                        <div className="mb-2">
                          <span className="text-xs font-black text-brand uppercase tracking-widest bg-brand/10 px-2 py-1 rounded-token-sm">
                            🕒 {item.start} — {item.end}
                          </span>
                        </div>
                        <div className="relative bg-surface-2 p-5 rounded-token-md shadow-neu-sm">
                          <CardDeleteButton onClick={() => handleDeleteSession(item.id)} className="absolute top-2 right-2" />
                          <RepeatButton onClick={() => handleRepeat(item)} className="absolute bottom-2 right-2" />
                          <div className="pr-10">
                            <span className={`inline-block px-2 py-1 text-[10px] font-black rounded uppercase mb-2 tracking-tighter ${done ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                              {item.status}
                            </span>
                            <p className="font-bold text-ink text-lg">{item.activity}</p>
                            <p className="text-[11px] font-semibold text-muted mt-0.5">{item.date}</p>
                            <p className="text-xs font-bold text-muted mt-1">Goal: {item.durationSet} · Logged: {item.actualDone}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[rgb(var(--ink)/0.08)] flex justify-center shrink-0">
                <ClearHistoryButton onClick={clearHistory} />
              </div>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center text-center">
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
