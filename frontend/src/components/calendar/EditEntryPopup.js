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
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

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
        className={`relative bg-[#f0f2f5] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-6 w-full max-w-[500px] z-10
          transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
      >
        {/* Close button */}
        <button onClick={handleClose}
          className="absolute top-4 right-4 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg hover:scale-110 transition-all z-20">✕</button>

        <div className="text-center mb-5">
          <span className="text-2xl mb-1 block">✏️</span>
          <h2 className="text-lg font-black text-gray-800">Edit Class</h2>
          <p className="text-[10px] text-gray-400 mt-1">Editing: {entry.subject}</p>
        </div>

        <div className="space-y-4">
          {/* Subject Name */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Subject Name</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl bg-white shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] outline-none font-bold text-gray-700 text-sm" />
          </div>

          {/* Days */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Days</label>
            <div className="flex flex-wrap gap-2">
              {allDays.map((day) => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all
                    ${selectedDays.includes(day)
                      ? "bg-[#7C3AED] text-white shadow-md"
                      : "bg-white text-gray-400 shadow-sm hover:shadow-md"}`}
                >{day}</button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 rounded-xl bg-white shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] outline-none font-bold text-gray-700 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-3 rounded-xl bg-white shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] outline-none font-bold text-gray-700 text-sm" />
            </div>
          </div>

          {/* Room */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Room / Lab</label>
            <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. LR32"
              className="w-full p-3 rounded-xl bg-white shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] outline-none font-bold text-gray-700 text-sm uppercase" />
          </div>

          {/* Apply to all upcoming weeks */}
          <div className="bg-white/60 rounded-xl p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-4 h-4 accent-[#7C3AED]" />
              <div>
                <p className="text-xs font-black text-gray-700">Apply to all upcoming weeks</p>
                <p className="text-[9px] text-gray-400">If unchecked, changes only apply to this week</p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <button onClick={handleSave}
            className="w-full py-3 rounded-xl bg-[#7C3AED] text-white font-black text-sm hover:bg-[#6d28d9] transition-all shadow-lg hover:shadow-xl">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}