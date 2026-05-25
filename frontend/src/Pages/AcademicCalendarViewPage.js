import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/context/AppContext";
import { calendarAPI, attendanceAPI, getToken } from "../services/api";
import EditEntryPopup from "../components/calendar/EditEntryPopup";

const displayDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const getMinWeekOffset = (calendarCreatedAt) => {
  if (!calendarCreatedAt) return -26;
  const semStart = new Date(calendarCreatedAt);
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + mondayOffset);
  currentMonday.setHours(0, 0, 0, 0);
  const semStartDay = semStart.getDay();
  const semMondayOffset = semStartDay === 0 ? -6 : 1 - semStartDay;
  const semMonday = new Date(semStart);
  semMonday.setDate(semStart.getDate() + semMondayOffset);
  semMonday.setHours(0, 0, 0, 0);
  const diffTime = semMonday.getTime() - currentMonday.getTime();
  return Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
};

const getDateString = (dayName, referenceDate) => {
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
  let targetDay = dayMap[dayName];
  const currentDay = referenceDate.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + mondayOffset);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (targetDay - 1));
  return targetDate.toISOString().split('T')[0];
};

const getDayDate = (dayName, referenceDate) => {
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
  let targetDay = dayMap[dayName];
  const currentDay = referenceDate.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + mondayOffset);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (targetDay - 1));
  return targetDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const formatTimeStr = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  return `${h % 12 || 12}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
};

const smBtn = "magic-btn text-[10px] px-3 py-1.5 rounded-lg";

export default function AcademicCalendarViewPage() {
  const navigate = useNavigate();
  const { setCalendar } = useApp();

  const [calendars, setCalendarsRaw] = useState([]);
  const [activeCalendarId, setActiveCalendarIdRaw] = useState(null);
  const [entriesMap, setEntriesMap] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingCalId, setEditingCalId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [referenceDate, setReferenceDate] = useState(new Date());

  // ========== EDIT ENTRY POPUP STATE ==========
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);

  const activeCalendar = calendars.find(c => c.id === activeCalendarId);
  const inactiveCalendars = calendars.filter(c => c.id !== activeCalendarId);
  const entriesFor = (calId) => entriesMap[calId] || [];
  const minWeekOffset = getMinWeekOffset(activeCalendar?.createdAt);

  useEffect(() => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + (weekOffset * 7));
    setReferenceDate(newDate);
  }, [weekOffset]);

  const getWeekLabel = () => {
    const currentDay = referenceDate.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(referenceDate);
    monday.setDate(referenceDate.getDate() + mondayOffset);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const formatDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (weekOffset === 0) return `This Week (${formatDate(monday)} - ${formatDate(friday)})`;
    if (weekOffset === minWeekOffset) return `Start (${formatDate(monday)} - ${formatDate(friday)})`;
    if (weekOffset === -1) return `Last Week (${formatDate(monday)} - ${formatDate(friday)})`;
    return `${formatDate(monday)} - ${formatDate(friday)}`;
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = getToken();
        if (!token) { setLoading(false); return; }
        const fetchedCalendars = await calendarAPI.getAll();
        setCalendarsRaw(fetchedCalendars);
        const activeCal = fetchedCalendars.find(c => c.isActive === true);
        if (activeCal) setActiveCalendarIdRaw(activeCal.id);
        else if (fetchedCalendars.length > 0) setActiveCalendarIdRaw(fetchedCalendars[0].id);
        const entriesData = {};
        for (const cal of fetchedCalendars) {
          const entries = await calendarAPI.getEntries(cal.id);
          entriesData[cal.id] = entries;
        }
        setEntriesMap(entriesData);
        const allEntries = Object.values(entriesData).flat();
        setCalendar(allEntries);
        await fetchAttendanceData();
      } catch (error) { console.error('Failed to fetch calendar data:', error); }
      finally { setLoading(false); }
    };
    fetchAllData();
  }, [setCalendar]);

  // ✅ FIX: Use attendanceAPI instead of direct fetch
  const fetchAttendanceData = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const data = await attendanceAPI.getSummary();
      const map = {};
      data.forEach(item => { map[item.entryId] = item; });
      setAttendanceMap(map);
    } catch (error) { console.error('Failed to fetch attendance data:', error); }
  };

  const setCalendars = (val) => setCalendarsRaw(typeof val === "function" ? val(calendars) : val);
  const setActiveCalendarId = async (val) => {
    try {
      await calendarAPI.setActive(val);
      setActiveCalendarIdRaw(val);
      const refreshedCalendars = await calendarAPI.getAll();
      setCalendarsRaw(refreshedCalendars);
    } catch (error) { alert('Failed to set active calendar.'); }
  };

  const handleSaveEdit = async (id) => {
    if (!editingTitle.trim()) return alert("Title can't be empty!");
    try {
      await calendarAPI.update(id, editingTitle.trim());
      setCalendars(prev => prev.map(c => c.id === id ? { ...c, title: editingTitle.trim() } : c));
      setEditingCalId(null);
      setEditingTitle("");
    } catch (error) { alert('Failed to update calendar title.'); }
  };

  const handleDeleteCalendar = async (calId) => {
    if (!window.confirm("Delete this calendar and all its subjects?")) return;
    try {
      await calendarAPI.delete(calId);
      setCalendar(prev => prev.filter(e => e.calendarId !== calId));
      setCalendars(prev => {
        const remaining = prev.filter(c => c.id !== calId);
        if (activeCalendarId === calId) setActiveCalendarIdRaw(remaining.length > 0 ? remaining[0].id : null);
        return remaining;
      });
      setEntriesMap(prev => { const newMap = { ...prev }; delete newMap[calId]; return newMap; });
    } catch (error) { alert('Failed to delete calendar.'); }
  };

  const deleteEntry = async (id) => {
    try {
      await calendarAPI.deleteEntry(id);
      setCalendar(prev => prev.filter(e => e.id !== id));
      fetchAttendanceData();
    } catch (error) { alert('Failed to delete subject.'); }
  };

  const toggleDone = async (id) => {
    try {
      const result = await calendarAPI.toggleEntryDone(id);
      setCalendar(prev => prev.map(e => e.id === id ? { ...e, done: !e.done } : e));
      if (result.attendanceUpdated) await fetchAttendanceData();
    } catch (error) { alert('Failed to update subject status.'); }
  };

  // ========== HANDLE EDIT ENTRY SAVE ==========
  const handleEditEntrySave = async (entryId, updatedData, applyToAll) => {
    try {
      await calendarAPI.updateEntry(entryId, updatedData);
      // Refresh data
      const fetchedCalendars = await calendarAPI.getAll();
      const entriesData = {};
      for (const cal of fetchedCalendars) {
        const entries = await calendarAPI.getEntries(cal.id);
        entriesData[cal.id] = entries;
      }
      setEntriesMap(entriesData);
      const allEntries = Object.values(entriesData).flat();
      setCalendar(allEntries);
      setShowEditPopup(false);
      setEditingEntry(null);
    } catch (error) {
      alert('Failed to update entry: ' + error.message);
    }
  };

  const isToday = (dayName) => {
    if (weekOffset !== 0) return false;
    const today = new Date();
    return today.toLocaleDateString("en-US", { weekday: "short" }) === dayName;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-screen bg-[#F1F5F9]">
        <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 min-h-screen bg-[#F1F5F9]">
        <span className="text-6xl mb-6">📭</span>
        <h2 className="text-2xl font-black text-[#1E293B] mb-2">No Calendars Yet</h2>
        <p className="text-gray-400 text-sm font-bold mb-8 uppercase tracking-widest">Go create one first</p>
        <button onClick={() => navigate("/academic")} className="magic-btn">← Back to Timetable</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">

      <header className="w-full max-w-[1100px] mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-[#7C3AED] tracking-[0.2em] uppercase mb-3 drop-shadow-sm">My Calendars</h1>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
          <p className="text-sm font-bold tracking-[0.3em] text-gray-400 uppercase">Spring <span className="text-[#7C3AED]">( 2026 )</span></p>
          <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
        </div>
      </header>

      {activeCalendar && (
        <CalendarTable
          cal={activeCalendar}
          entries={entriesFor(activeCalendar.id)}
          attendanceMap={attendanceMap}
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
          referenceDate={referenceDate}
          weekOffset={weekOffset}
          isToday={isToday}
          onPrevWeek={() => { if (weekOffset > minWeekOffset) setWeekOffset(prev => prev - 1); }}
          onNextWeek={() => { if (weekOffset < 0) setWeekOffset(prev => prev + 1); }}
          minWeekOffset={minWeekOffset}
          currentWeekOffset={weekOffset}
          getWeekLabel={getWeekLabel}
          onEditEntry={(entry, day) => { setEditingEntry({ ...entry, day }); setShowEditPopup(true); }}
        />
      )}

      {inactiveCalendars.map(cal => (
        <CalendarTable
          key={cal.id}
          cal={cal}
          entries={entriesFor(cal.id)}
          attendanceMap={attendanceMap}
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
          referenceDate={referenceDate}
          weekOffset={weekOffset}
          isToday={isToday}
          onPrevWeek={() => { if (weekOffset > minWeekOffset) setWeekOffset(prev => prev - 1); }}
          onNextWeek={() => { if (weekOffset < 0) setWeekOffset(prev => prev + 1); }}
          minWeekOffset={minWeekOffset}
          currentWeekOffset={weekOffset}
          getWeekLabel={getWeekLabel}
          onEditEntry={(entry, day) => { setEditingEntry({ ...entry, day }); setShowEditPopup(true); }}
        />
      ))}

      {/* ========== EDIT ENTRY POPUP ========== */}
      {showEditPopup && editingEntry && (
        <EditEntryPopup
          entry={editingEntry}
          onClose={() => { setShowEditPopup(false); setEditingEntry(null); }}
          onSave={handleEditEntrySave}
        />
      )}

      <footer className="w-full flex justify-center gap-6 px-4 mt-4 flex-wrap">
        <button onClick={() => navigate("/academic")} className="magic-btn flex items-center gap-2">← Back to Timetable</button>
        <button onClick={() => navigate("/dashboard")} className="magic-btn flex items-center gap-2">🏠 Dashboard</button>
      </footer>
    </div>
  );
}

// ── Calendar table component ──────────────────────────────────────────────────
function CalendarTable({
  cal, entries, attendanceMap, deleteEntry, toggleDone, onDelete,
  editingCalId, editingTitle, setEditingTitle,
  onStartEdit, onSaveEdit, onCancelEdit,
  onMakeActive, isActive, referenceDate, weekOffset, isToday,
  onPrevWeek, onNextWeek, minWeekOffset, currentWeekOffset, getWeekLabel,
  onEditEntry
}) {
  
  const getAttendanceColor = (percentage) => {
    if (!percentage && percentage !== 0) return { bg: 'bg-gray-100', text: 'text-gray-400', bar: 'bg-gray-300', border: 'border-gray-300' };
    if (percentage >= 80) return { bg: 'bg-green-50', text: 'text-green-600', bar: 'bg-gradient-to-r from-green-400 to-green-500', border: 'border-green-400' };
    if (percentage >= 60) return { bg: 'bg-yellow-50', text: 'text-yellow-600', bar: 'bg-gradient-to-r from-yellow-400 to-yellow-500', border: 'border-yellow-400' };
    return { bg: 'bg-red-50', text: 'text-red-600', bar: 'bg-gradient-to-r from-red-400 to-red-500', border: 'border-red-400' };
  };

  const getStatusBadge = (percentage) => {
    if (!percentage && percentage !== 0) return null;
    if (percentage >= 80) return '🟢';
    if (percentage >= 60) return '🟡';
    return '🔴';
  };

  const MiniSparkline = ({ entryId, width = 60, height = 20 }) => {
    const [trendData, setTrendData] = useState([]);
    useEffect(() => {
      const fetchTrend = async () => {
        try {
          // ✅ FIX: Use attendanceAPI instead of direct fetch
          const data = await attendanceAPI.getTrend(entryId);
          setTrendData(data || []);
        } catch (error) {
          console.error('Failed to fetch trend:', error);
        }
      };
      fetchTrend();
    }, [entryId]);
    if (!trendData || trendData.length < 2) return null;
    const points = trendData.map((d, i) => ({
      x: (i / (trendData.length - 1)) * width,
      y: height - (d.runningPercentage / 100) * height
    }));
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const lastValue = trendData[trendData.length - 1]?.runningPercentage || 0;
    const color = lastValue >= 80 ? '#10b981' : lastValue >= 60 ? '#f59e0b' : '#ef4444';
    return (
      <svg width={width} height={height} className="inline-block">
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" y1={height * 0.4} x2={width} y2={height * 0.4} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
      </svg>
    );
  };

  return (
    <div className={`w-full overflow-x-auto rounded-[40px] border bg-[#F1F5F9] mb-10 transition-all
      ${isActive ? "shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] border-white/50"
        : "shadow-[12px_12px_30px_#d1d9e6,-12px_-12px_30px_#ffffff] border-white/30 opacity-80"}`}
    >
      {/* Title Bar */}
      <div className="px-6 pt-4 pb-3 border-b-2 border-[#7C3AED]/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <button onClick={onPrevWeek} disabled={currentWeekOffset <= minWeekOffset}
            className={`w-8 h-8 rounded-lg bg-white shadow-[3px_3px_6px_#d1d9e6,-3px_-3px_6px_#ffffff] flex items-center justify-center text-focusPurple font-bold transition-all
              ${currentWeekOffset <= minWeekOffset ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}`}>←</button>
          <button onClick={onNextWeek} disabled={currentWeekOffset === 0}
            className={`w-8 h-8 rounded-lg bg-white shadow-[3px_3px_6px_#d1d9e6,-3px_-3px_6px_#ffffff] flex items-center justify-center text-focusPurple font-bold transition-all
              ${currentWeekOffset === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}`}>→</button>
        </div>
        <div className="flex-1 flex flex-col items-center min-w-0">
          {editingCalId === cal.id ? (
            <input autoFocus value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
              className="text-center bg-[#F1F5F9] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] rounded-xl px-4 py-2 font-black text-[#7C3AED] uppercase tracking-widest text-sm outline-none max-w-[300px]" />
          ) : (
            <div className="group cursor-pointer flex items-center gap-2" onClick={onStartEdit} title="Click to edit">
              <span className="text-base">📋</span>
              <h3 className="text-sm font-black text-[#7C3AED] uppercase tracking-[0.1em] truncate group-hover:text-[#5b21b6]">{cal.title}</h3>
              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400">✎</span>
              {isActive && <span className="text-[8px] bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 rounded-full font-black tracking-widest">ACTIVE</span>}
            </div>
          )}
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{getWeekLabel ? getWeekLabel() : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editingCalId === cal.id ? (
            <>
              <button onClick={onSaveEdit} className={`${smBtn} text-green-500`}>✓ Save</button>
              <button onClick={onCancelEdit} className={`${smBtn} text-gray-400`}>✕ Cancel</button>
            </>
          ) : (
            <>
              {!isActive && <button onClick={onMakeActive} className={smBtn}>↑ Set Active</button>}
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
            <div className={`p-6 text-center border-b-2 border-[#7C3AED]/20 ${isToday(day) ? 'bg-purple-50' : ''}`}>
              <div className="font-black text-gray-800 uppercase tracking-[0.2em] text-sm">{day}{isToday(day) && <span className="ml-1 text-[10px] text-focusPurple">●</span>}</div>
              <div className="text-[10px] font-bold text-[#7C3AED] mt-1 opacity-70">{getDayDate(day, referenceDate)}</div>
            </div>
            <div className="p-4 space-y-4 min-h-[420px]">
              {entries.filter(e => e.days?.includes(day))
                .sort((a, b) => {
                  const aDetail = a.dayDetails?.find(d => d.day === day);
                  const bDetail = b.dayDetails?.find(d => d.day === day);
                  return (aDetail?.startTime || a.startTime || "").localeCompare(bDetail?.startTime || b.startTime || "");
                })
                .map(item => {
                  const attendance = attendanceMap[item.id];
                  const percentage = attendance?.percentage;
                  const colors = getAttendanceColor(percentage);
                  const statusBadge = getStatusBadge(percentage);
                  const showToggle = isToday(day);
                  
                  const dayDetail = item.dayDetails?.find(d => d.day === day);
                  const displayStartTime = dayDetail?.startTime || item.startTime;
                  const displayEndTime = dayDetail?.endTime || item.endTime;
                  const displayRoom = dayDetail?.room || item.lrNo;
                  
                  const dateStr = getDateString(day, referenceDate);
                  const dateAttendance = item.dateAttendance || {};
                  const dateRecord = dateAttendance[dateStr];
                  const isPresent = dateRecord?.status === 'Present';
                  const isAbsent = dateRecord?.status === 'Absent';
                  const isPending = !isPresent && !isAbsent;
                  
                  const cardBg = isPresent
                    ? "bg-green-50/60 shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] border border-green-200"
                    : isAbsent
                      ? "bg-red-50/60 shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] border border-red-200"
                      : "bg-[#F1F5F9] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]";
                  
                  return (
                    <div key={item.id} className={`group relative p-4 rounded-2xl transition-all duration-300 ${cardBg}`}>
                      {/* Edit button - only on PENDING cards (not attended/absent) */}
                      {isPending && (
                        <button 
                          onClick={() => onEditEntry && onEditEntry(item, day)}
                          className="absolute -top-2 -right-2 bg-blue-500 text-white w-5 h-5 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10 hover:scale-110"
                          title="Edit this class"
                        >✎</button>
                      )}
                      
                      {showToggle && (
                        <>
                          <button onClick={() => deleteEntry(item.id)} 
                            className="absolute -top-2 right-6 bg-red-500 text-white w-5 h-5 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10 hover:scale-110">✕</button>
                          <button onClick={() => toggleDone(item.id)}
                            className={`absolute -top-2 -left-2 w-6 h-6 rounded-full text-[10px] flex items-center justify-center transition-all shadow-lg z-10 hover:scale-110
                              ${isPresent ? "bg-green-500 text-white opacity-100" : "bg-white border-2 border-green-500 text-green-500 opacity-0 group-hover:opacity-100"}`}>✓</button>
                        </>
                      )}
                      
                      {isPresent && <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">Attended</div>}
                      {isAbsent && <div className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">Absent</div>}
                      
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-black text-[11px] leading-tight uppercase transition-all flex-1 min-w-0 ${isPresent ? "text-green-600" : isAbsent ? "text-red-600" : "text-[#1E293B]"}`}>{item.subject}</h4>
                        {statusBadge && <span className="text-[10px] ml-1 flex-shrink-0">{statusBadge}</span>}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${isPresent ? "text-green-400" : isAbsent ? "text-red-400" : "text-gray-400"}`}>
                          <span className={isPresent ? "text-green-500" : isAbsent ? "text-red-500" : "text-[#7C3AED]"}>●</span>
                          {formatTimeStr(displayStartTime)} - {formatTimeStr(displayEndTime)}
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] font-black self-start px-2 py-1 rounded-md border
                          ${isPresent ? "bg-green-100/50 text-green-700 border-green-200" : isAbsent ? "bg-red-100/50 text-red-700 border-red-200" : "bg-white/40 text-[#1E293B] border-white/60"}`}>
                          <div className="flex flex-col items-center justify-center translate-y-[1px]">
                            <div className={`w-1.5 h-1.5 rounded-full ${isPresent ? "bg-green-500" : isAbsent ? "bg-red-500" : "bg-red-500"}`}></div>
                            <div className="w-[1.5px] h-2 bg-gray-400"></div>
                          </div>
                          <span className="tracking-wider uppercase">{displayRoom}</span>
                        </div>
                      </div>
                      
                      {attendance && (
                        <div className="mt-3 pt-2 border-t border-gray-200/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Attendance</span>
                            <div className="flex items-center gap-1">
                              <MiniSparkline entryId={item.id} />
                              <span className={`text-[10px] font-black ${colors.text}`}>{percentage?.toFixed(1) || 0}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${Math.min(percentage || 0, 100)}%` }} />
                          </div>
                          <div className="flex justify-between mt-1 text-[7px] text-gray-400 font-medium">
                            <span>✅ {attendance.attendedSessions || 0}</span>
                            <span>❌ {attendance.absentSessions || 0}</span>
                            <span>📅 {attendance.upcomingSessions || 0}</span>
                          </div>
                          {attendance.isWarning && (
                            <div className="mt-1.5 p-1.5 bg-red-50 rounded-lg border-l-2 border-red-500">
                              <p className="text-[7px] text-red-600 font-bold leading-tight">⚠️ Below 60% - Exam eligibility at risk!</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}