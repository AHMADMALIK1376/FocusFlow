// src/components/calendar/EditEntryPopup.js
import React, { useState, useEffect } from "react";

const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function EditEntryPopup({ entry, onClose, onSave }) {
  const [isVisible, setIsVisible] = useState(false);
  const [subject, setSubject] = useState(entry.subject || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [applyToAll, setApplyToAll] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (entry) {
      const dayDetail = entry.dayDetails?.find(d => d.day === entry.day);
      setStartTime(dayDetail?.startTime || entry.startTime || "");
      setEndTime(dayDetail?.endTime || entry.endTime || "");
      setRoom(dayDetail?.room || entry.lrNo || "");
      setSelectedDays(entry.days || []);
    }
  }, [entry]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const toggleDay = (day) => {
    if (day === "All") {
      if (selectedDays.length === allDays.length) {
        setSelectedDays([]);
      } else {
        setSelectedDays([...allDays]);
      }
    } else {
      setSelectedDays(prev => {
        let newDays = prev.includes(day)
          ? prev.filter(d => d !== day)
          : [...prev, day];
        return newDays;
      });
    }
  };

  const isAllSelected = selectedDays.length === allDays.length;

  const handleSave = () => {
    if (!subject.trim()) return alert("Subject name is required!");
    if (selectedDays.length === 0) return alert("Select at least one day!");

    onSave(entry.id, {
      subject: subject.trim(),
      startTime,
      endTime,
      lrNo: room,
      days: selectedDays,
      applyToAll
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out
        ${isVisible ? 'bg-black/20' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-surface rounded-token-lg shadow-glass p-5 w-full max-w-[450px] z-10
          transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
      >
        {/* Close button */}
        <button onClick={handleClose}
          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-focus text-on-brand text-[10px] flex items-center justify-center shadow-neu-sm hover:scale-110 transition-all z-20">✕</button>

        <div className="text-center mb-3">
          <span className="text-xl mb-0.5 block">✏️</span>
          <h2 className="text-base font-black text-ink">Edit Class</h2>
          <p className="text-[9px] text-muted mt-0.5">Editing: {entry.subject}</p>
        </div>

        <div className="space-y-3">
          {/* Subject Name */}
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-0.5 block">Subject Name</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 rounded-token-sm bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm" />
          </div>

          {/* Days */}
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block">Days</label>
            <div className="flex flex-wrap gap-1.5">
              {/* ALL DAYS BUTTON */}
              <button
                type="button"
                onClick={() => toggleDay("All")}
                className={`px-3 py-1.5 rounded-token-sm font-bold text-[10px] transition-all
                  ${isAllSelected
                    ? "bg-grad-hero text-on-brand shadow-neu-sm"
                    : "bg-surface-2 text-muted hover:shadow-neu-sm border border-[rgb(var(--ink)/0.08)]"}`}
              >
                All
              </button>

              {/* Individual day buttons */}
              {allDays.map((day) => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-token-sm font-bold text-[10px] transition-all
                    ${selectedDays.includes(day)
                      ? "bg-grad-hero text-on-brand shadow-neu-sm"
                      : "bg-surface-2 text-muted hover:shadow-neu-sm"}`}
                >
                  {day}
                </button>
              ))}
            </div>
            {isAllSelected && (
              <p className="text-[8px] text-brand mt-1">All days selected</p>
            )}
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-0.5 block">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 rounded-token-sm bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm" />
            </div>
            <div>
              <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-0.5 block">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 rounded-token-sm bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm" />
            </div>
          </div>

          {/* Room */}
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-0.5 block">Room / Lab</label>
            <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. LR32"
              className="w-full p-2 rounded-token-sm bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-sm uppercase" />
          </div>

          {/* Apply to all upcoming weeks */}
          <div className="bg-surface-2 rounded-token-sm p-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-3.5 h-3.5 accent-brand" />
              <div>
                <p className="text-[10px] font-black text-ink">Apply to all upcoming weeks</p>
                <p className="text-[8px] text-muted">If unchecked, changes only apply to this week</p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <button onClick={handleSave}
            className="w-full py-2 rounded-token-md bg-grad-hero text-on-brand font-black text-xs hover:opacity-90 transition-all shadow-neu-sm hover:shadow-neu">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
