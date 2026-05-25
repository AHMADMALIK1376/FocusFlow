// src/components/routine/EditRoutinePopup.js
import React, { useState, useEffect } from "react";

// ✅ FIX: Use SHORT day names for backend compatibility
const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const COLOR_PALETTE = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Rose', color: '#e11d48' },
  { name: 'Violet Dark', color: '#7c3aed' },
];

export default function EditRoutinePopup({ routine, onClose, onSave }) {
  const [isVisible, setIsVisible] = useState(false);
  const [activity, setActivity] = useState("");
  const [time, setTime] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [dayColors, setDayColors] = useState({});
  const [activeDayForColor, setActiveDayForColor] = useState(null);
  const [applyAllSame, setApplyAllSame] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (routine) {
      setActivity(routine.activity || "");
      setTime(routine.time || "");
      // routine.repeatOn should already be in short format from API
      setSelectedDays(routine.repeatOn || []);
      const colors = routine.dayColors || {};
      (routine.repeatOn || []).forEach(day => {
        if (!colors[day]) colors[day] = '#6366f1';
      });
      setDayColors({ ...colors });
    }
  }, [routine]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      if (!prev.includes(day)) {
        setDayColors(prevColors => ({ ...prevColors, [day]: '#6366f1' }));
      }
      return newDays;
    });
  };

  const handleColorSelect = (color) => {
    if (applyAllSame) {
      const newColors = { ...dayColors };
      selectedDays.forEach(day => { newColors[day] = color; });
      setDayColors(newColors);
    } else if (activeDayForColor) {
      setDayColors(prev => ({ ...prev, [activeDayForColor]: color }));
    }
  };

  const handleSave = () => {
    if (!activity.trim()) return alert("Activity name is required!");
    if (selectedDays.length === 0) return alert("Select at least one day!");
    onSave(routine.id, { activity: activity.trim(), time, repeatOn: selectedDays, dayColors });
  };

  const getDayColor = (day) => dayColors[day] || '#6366f1';

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out
        ${isVisible ? 'bg-black/20' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-[#f0f2f5] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-5 w-full max-w-[420px] z-10 max-h-[85vh] overflow-y-auto
          transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
      >
        <button onClick={handleClose}
          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow-lg hover:scale-110 transition-all z-20">✕</button>

        <div className="text-center mb-4">
          <span className="text-xl mb-0.5 block">🕒</span>
          <h2 className="text-base font-black text-gray-800">Edit Activity</h2>
          <p className="text-[9px] text-gray-400 mt-0.5">Editing: {routine.activity}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Activity Name</label>
            <input type="text" value={activity} onChange={(e) => setActivity(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] outline-none font-bold text-gray-700 text-xs" />
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] outline-none font-bold text-gray-700 text-xs" />
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Repeat Days</label>
            <div className="flex flex-wrap gap-1.5">
              {allDays.map((day) => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[9px] transition-all flex items-center gap-1
                    ${selectedDays.includes(day) ? "bg-[#7C3AED] text-white shadow-md" : "bg-white text-gray-400 shadow-sm hover:shadow-md"}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getDayColor(day) }}></span>
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">🎨 Colors</label>
            
            <div className="flex items-center gap-1.5 mb-2">
              <button onClick={() => { setApplyAllSame(true); setActiveDayForColor(null); }}
                className={`text-[8px] px-2.5 py-1 rounded-lg font-bold transition-all
                  ${applyAllSame ? 'bg-[#7C3AED] text-white' : 'bg-white text-gray-500'}`}>
                All Same
              </button>
              <button onClick={() => setApplyAllSame(false)}
                className={`text-[8px] px-2.5 py-1 rounded-lg font-bold transition-all
                  ${!applyAllSame ? 'bg-[#7C3AED] text-white' : 'bg-white text-gray-500'}`}>
                Per Day
              </button>
            </div>

            {!applyAllSame && selectedDays.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedDays.map(day => (
                  <button key={day} onClick={() => setActiveDayForColor(day)}
                    className={`text-[8px] px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1
                      ${activeDayForColor === day ? 'ring-2 ring-[#7C3AED] bg-white scale-105 shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getDayColor(day) }}></span>
                    {day}
                  </button>
                ))}
              </div>
            )}
            
            {!applyAllSame && activeDayForColor && (
              <p className="text-[9px] text-[#7C3AED] font-bold mb-1.5 flex items-center gap-1">
                🎨 <span className="uppercase">{activeDayForColor}</span>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getDayColor(activeDayForColor) }}></span>
              </p>
            )}
            {applyAllSame && selectedDays.length > 0 && (
              <p className="text-[9px] text-[#7C3AED] font-bold mb-1.5">🎨 All {selectedDays.length} days</p>
            )}

            {/* Smaller color palette */}
            <div className="grid grid-cols-6 gap-1.5">
              {COLOR_PALETTE.map((colorOption) => {
                let isSelected = false;
                if (applyAllSame && selectedDays.length > 0) {
                  isSelected = selectedDays.every(day => getDayColor(day) === colorOption.color);
                } else if (activeDayForColor) {
                  isSelected = getDayColor(activeDayForColor) === colorOption.color;
                }
                
                return (
                  <button key={colorOption.color} type="button" onClick={() => handleColorSelect(colorOption.color)}
                    className={`w-full aspect-square rounded-lg transition-all duration-200 flex items-center justify-center
                      ${isSelected ? 'scale-110 shadow-lg ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-105 shadow-sm'}`}
                    style={{ backgroundColor: colorOption.color, maxHeight: '32px' }}
                    title={colorOption.name}>
                    {isSelected && <span className="text-white text-sm font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white font-black text-xs hover:bg-[#6d28d9] transition-all shadow-lg hover:shadow-xl">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}