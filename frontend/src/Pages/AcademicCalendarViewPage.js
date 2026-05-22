import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/AppContext";
import { calendarAPI, getToken } from "../services/api";

const displayDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const getDayDate = (dayName) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + mondayOffset + dayMap[dayName]);
  return targetDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const formatTimeStr = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  return `${h % 12 || 12}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
};

// Small variant for title bar action buttons
const smBtn = "magic-btn text-[10px] px-3 py-1.5 rounded-lg";

export default function AcademicCalendarViewPage() {
  const navigate = useNavigate();
  const { setCalendar } = useApp();  // Removed unused 'calendar'

  const [calendars, setCalendarsRaw] = useState([]);
  const [activeCalendarId, setActiveCalendarIdRaw] = useState(null);
  const [entriesMap, setEntriesMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [editingCalId, setEditingCalId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Load calendars and entries from API
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Fetch calendars
        const fetchedCalendars = await calendarAPI.getAll();
        setCalendarsRaw(fetchedCalendars);
        
        // Find active calendar
        const activeCal = fetchedCalendars.find(c => c.isActive === true);
        if (activeCal) {
          setActiveCalendarIdRaw(activeCal.id);
        } else if (fetchedCalendars.length > 0) {
          setActiveCalendarIdRaw(fetchedCalendars[0].id);
        }
        
        // Fetch entries for each calendar
        const entriesData = {};
        for (const cal of fetchedCalendars) {
          const entries = await calendarAPI.getEntries(cal.id);
          entriesData[cal.id] = entries;
        }
        setEntriesMap(entriesData);
        
        // Update global calendar state
        const allEntries = Object.values(entriesData).flat();
        setCalendar(allEntries);
        
      } catch (error) {
        console.error('Failed to fetch calendar data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [setCalendar]);

  const setCalendars = (val) => {
    const next = typeof val === "function" ? val(calendars) : val;
    setCalendarsRaw(next);
  };

  const setActiveCalendarId = async (val) => {
    try {
      await calendarAPI.setActive(val);
      setActiveCalendarIdRaw(val);
      // Refresh calendars to update active status
      const refreshedCalendars = await calendarAPI.getAll();
      setCalendarsRaw(refreshedCalendars);
    } catch (error) {
      console.error('Failed to set active calendar:', error);
      alert('Failed to set active calendar. Please try again.');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editingTitle.trim()) return alert("Title can't be empty!");
    try {
      await calendarAPI.update(id, editingTitle.trim());
      setCalendars(prev => prev.map(c => c.id === id ? { ...c, title: editingTitle.trim() } : c));
      setEditingCalId(null);
      setEditingTitle("");
    } catch (error) {
      console.error('Failed to update calendar:', error);
      alert('Failed to update calendar title. Please try again.');
    }
  };

  const handleDeleteCalendar = async (calId) => {
    if (!window.confirm("Delete this calendar and all its subjects?")) return;
    try {
      await calendarAPI.delete(calId);
      
      setCalendar(prev => prev.filter(e => e.calendarId !== calId));
      setCalendars(prev => {
        const remaining = prev.filter(c => c.id !== calId);
        if (activeCalendarId === calId) {
          const newActiveId = remaining.length > 0 ? remaining[0].id : null;
          setActiveCalendarIdRaw(newActiveId);
        }
        return remaining;
      });
      
      // Update entries map
      setEntriesMap(prev => {
        const newMap = { ...prev };
        delete newMap[calId];
        return newMap;
      });
      
    } catch (error) {
      console.error('Failed to delete calendar:', error);
      alert('Failed to delete calendar. Please try again.');
    }
  };

  const deleteEntry = async (id) => {
    try {
      await calendarAPI.deleteEntry(id);
      setCalendar(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete subject. Please try again.');
    }
  };

  const toggleDone = async (id) => {
    try {
      await calendarAPI.toggleEntryDone(id);
      setCalendar(prev =>
        prev.map(e => e.id === id ? { ...e, done: !e.done } : e)
      );
    } catch (error) {
      console.error('Failed to toggle entry status:', error);
      alert('Failed to update subject status. Please try again.');
    }
  };

  const activeCalendar = calendars.find(c => c.id === activeCalendarId);
  const inactiveCalendars = calendars.filter(c => c.id !== activeCalendarId);
  const entriesFor = (calId) => entriesMap[calId] || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-screen bg-[#F1F5F9]">
        <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ── No calendars ──────────────────────────────────────────────────
  if (calendars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-screen bg-[#F1F5F9]">
        <span className="text-6xl mb-6">📭</span>
        <h2 className="text-2xl font-black text-[#1E293B] mb-2">No Calendars Yet</h2>
        <p className="text-gray-400 text-sm font-bold mb-8 uppercase tracking-widest">Go create one first</p>
        <button onClick={() => navigate("/academic")} className="magic-btn">
          ← Back to Timetable
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">

      {/* Header */}
      <header className="w-full max-w-[1100px] mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-[#7C3AED] tracking-[0.2em] uppercase mb-3 drop-shadow-sm">
          My Calendars
        </h1>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
          <p className="text-sm font-bold tracking-[0.3em] text-gray-400 uppercase">
            Spring <span className="text-[#7C3AED]">( 2026 )</span>
          </p>
          <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
        </div>
      </header>

      {/* Active calendar table */}
      {activeCalendar && (
        <CalendarTable
          cal={activeCalendar}
          entries={entriesFor(activeCalendar.id)}
          deleteEntry={deleteEntry}
          toggleDone={toggleDone}
          onDelete={() => handleDeleteCalendar(activeCalendar.id)}
          editingCalId={editingCalId}
          editingTitle={editingTitle}
          setEditingTitle={setEditingTitle}
          onStartEdit={() => { setEditingCalId(activeCalendar.id); setEditingTitle(activeCalendar.title); }}
          onSaveEdit={() => handleSaveEdit(activeCalendar.id)}
          onCancelEdit={() => setEditingCalId(null)}
          isActive
        />
      )}

      {/* Inactive calendar tables */}
      {inactiveCalendars.map(cal => (
        <CalendarTable
          key={cal.id}
          cal={cal}
          entries={entriesFor(cal.id)}
          deleteEntry={deleteEntry}
          toggleDone={toggleDone}
          onDelete={() => handleDeleteCalendar(cal.id)}
          editingCalId={editingCalId}
          editingTitle={editingTitle}
          setEditingTitle={setEditingTitle}
          onStartEdit={() => { setEditingCalId(cal.id); setEditingTitle(cal.title); }}
          onSaveEdit={() => handleSaveEdit(cal.id)}
          onCancelEdit={() => setEditingCalId(null)}
          onMakeActive={() => setActiveCalendarId(cal.id)}
          isActive={false}
        />
      ))}

      {/* Footer */}
      <footer className="w-full flex justify-center gap-6 px-4 mt-4 flex-wrap">
        <button onClick={() => navigate("/academic")} className="magic-btn flex items-center gap-2">
          ← Back to Timetable
        </button>
        <button onClick={() => navigate("/dashboard")} className="magic-btn flex items-center gap-2">
          🏠 Dashboard
        </button>
      </footer>
    </div>
  );
}

// ── Calendar table component ──────────────────────────────────────────────────
function CalendarTable({
  cal, entries, deleteEntry, toggleDone, onDelete,
  editingCalId, editingTitle, setEditingTitle,
  onStartEdit, onSaveEdit, onCancelEdit,
  onMakeActive, isActive
}) {
  return (
    <div className={`w-full overflow-x-auto rounded-[40px] border bg-[#F1F5F9] mb-10 transition-all
      ${isActive
        ? "shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] border-white/50"
        : "shadow-[12px_12px_30px_#d1d9e6,-12px_-12px_30px_#ffffff] border-white/30 opacity-80"}`}
    >
      {/* Title bar */}
      <div className="px-8 pt-5 pb-4 border-b-2 border-[#7C3AED]/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg">📋</span>
          {editingCalId === cal.id ? (
            <input
              autoFocus
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
              className="flex-1 bg-[#F1F5F9] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] rounded-xl px-4 py-2 font-black text-[#7C3AED] uppercase tracking-widest text-sm outline-none min-w-0"
            />
          ) : (
            <h3 className="text-base font-black text-[#7C3AED] uppercase tracking-[0.15em] truncate">
              {cal.title}
              {isActive && (
                <span className="ml-3 text-[9px] bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 rounded-full font-black tracking-widest align-middle">
                  ACTIVE
                </span>
              )}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {editingCalId === cal.id ? (
            <>
              <button onClick={onSaveEdit} className={`${smBtn} text-green-500`}>✓ Save</button>
              <button onClick={onCancelEdit} className={`${smBtn} text-gray-400`}>✕ Cancel</button>
            </>
          ) : (
            <>
              {!isActive && (
                <button onClick={onMakeActive} className={smBtn}>↑ Set Active</button>
              )}
              <button onClick={onStartEdit} className={`${smBtn} text-gray-400`}>✎ Edit</button>
              <button onClick={onDelete} className={`${smBtn} text-red-400`}>🗑 Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="min-w-[1000px] grid grid-cols-5">
        {displayDays.map((day, index) => (
          <div key={day} className={`flex flex-col ${index !== 4 ? "border-r-2 border-[#7C3AED]/10" : ""}`}>
            <div className="p-6 text-center border-b-2 border-[#7C3AED]/20">
              <div className="font-black text-gray-800 uppercase tracking-[0.2em] text-sm">{day}</div>
              <div className="text-[10px] font-bold text-[#7C3AED] mt-1 opacity-70">{getDayDate(day)}</div>
            </div>
            <div className="p-4 space-y-4 min-h-[420px]">
              {entries
                .filter(e => e.days?.includes(day))
                .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                .map(item => (
                  <div key={item.id}
                    className={`group relative p-4 rounded-2xl bg-[#F1F5F9] transition-all duration-300
                      ${item.done
                        ? "shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]"
                        : "shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]"}`}
                  >
                    <button onClick={() => deleteEntry(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10">✕</button>
                    <button onClick={() => toggleDone(item.id)}
                      className={`absolute -top-2 -left-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center transition-all shadow-lg z-10
                        ${item.done ? "bg-green-500 text-white opacity-100" : "bg-white border border-gray-200 text-green-500 opacity-0 group-hover:opacity-100"}`}
                    >✓</button>
                    <h4 className={`font-black text-[11px] leading-tight mb-3 uppercase border-b border-gray-200/50 pb-1 transition-all ${item.done ? "text-green-500 line-through opacity-60" : "text-[#1E293B]"}`}>
                      {item.subject}
                    </h4>
                    <div className="flex flex-col gap-2">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${item.done ? "text-gray-300" : "text-gray-400"}`}>
                        <span className={item.done ? "text-green-400" : "text-[#7C3AED]"}>●</span>
                        {formatTimeStr(item.startTime)} - {formatTimeStr(item.endTime)}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-[#1E293B] bg-white/40 self-start px-2 py-1 rounded-md border border-white/60">
                        <div className="flex flex-col items-center justify-center translate-y-[1px]">
                          <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.5)] ${item.done ? "bg-green-400" : "bg-red-500"}`}></div>
                          <div className="w-[1.5px] h-2 bg-gray-400"></div>
                        </div>
                        <span className="tracking-wider uppercase text-gray-500">{item.lrNo}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}