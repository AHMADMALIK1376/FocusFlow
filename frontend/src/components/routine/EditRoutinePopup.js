// src/components/routine/EditRoutinePopup.js
import React, { useState, useEffect } from "react";

// Use SHORT day names for backend compatibility
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
        className={`relative bg-surface rounded-token-lg shadow-glass p-5 w-full max-w-[420px] z-10 max-h-[85vh] overflow-y-auto
          transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
      >
        <button onClick={handleClose}
          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-focus text-on-brand text-[10px] flex items-center justify-center shadow-neu-sm hover:scale-110 transition-all z-20">✕</button>

        <div className="text-center mb-4">
          <span className="text-xl mb-0.5 block">🕒</span>
          <h2 className="text-base font-black text-ink">Edit Activity</h2>
          <p className="text-[9px] text-muted mt-0.5">Editing: {routine.activity}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block">Activity Name</label>
            <input type="text" value={activity} onChange={(e) => setActivity(e.target.value)}
              className="w-full p-2.5 rounded-token-sm bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-xs" />
          </div>

          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full p-2.5 rounded-token-sm bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-xs" />
          </div>

          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1 block">Repeat Days</label>
            <div className="flex flex-wrap gap-1.5">
              {allDays.map((day) => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1.5 rounded-token-sm font-bold text-[9px] transition-all flex items-center gap-1
                    ${selectedDays.includes(day) ? "bg-grad-hero text-on-brand shadow-neu-sm" : "bg-surface-2 text-muted hover:shadow-neu-sm"}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getDayColor(day) }}></span>
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1.5 block">🎨 Colors</label>

            <div className="flex items-center gap-1.5 mb-2">
              <button onClick={() => { setApplyAllSame(true); setActiveDayForColor(null); }}
                className={`text-[8px] px-2.5 py-1 rounded-token-sm font-bold transition-all
                  ${applyAllSame ? 'bg-grad-hero text-on-brand' : 'bg-surface-2 text-muted'}`}>
                All Same
              </button>
              <button onClick={() => setApplyAllSame(false)}
                className={`text-[8px] px-2.5 py-1 rounded-token-sm font-bold transition-all
                  ${!applyAllSame ? 'bg-grad-hero text-on-brand' : 'bg-surface-2 text-muted'}`}>
                Per Day
              </button>
            </div>

            {!applyAllSame && selectedDays.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedDays.map(day => (
                  <button key={day} onClick={() => setActiveDayForColor(day)}
                    className={`text-[8px] px-2 py-1 rounded-token-sm font-bold transition-all flex items-center gap-1
                      ${activeDayForColor === day ? 'ring-2 ring-brand bg-surface scale-105 shadow-neu-sm' : 'bg-surface-2 text-muted hover:bg-[rgb(var(--ink)/0.06)]'}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getDayColor(day) }}></span>
                    {day}
                  </button>
                ))}
              </div>
            )}

            {!applyAllSame && activeDayForColor && (
              <p className="text-[9px] text-brand font-bold mb-1.5 flex items-center gap-1">
                🎨 <span className="uppercase">{activeDayForColor}</span>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getDayColor(activeDayForColor) }}></span>
              </p>
            )}
            {applyAllSame && selectedDays.length > 0 && (
              <p className="text-[9px] text-brand font-bold mb-1.5">🎨 All {selectedDays.length} days</p>
            )}

            {/* Color palette — swatches use inline style (functional UI, not theme surface) */}
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
                    className={`w-full aspect-square rounded-token-sm transition-all duration-200 flex items-center justify-center
                      ${isSelected ? 'scale-110 shadow-neu ring-2 ring-offset-1 ring-muted' : 'hover:scale-105 shadow-neu-sm'}`}
                    style={{ backgroundColor: colorOption.color, maxHeight: '32px' }}
                    title={colorOption.name}>
                    {isSelected && <span className="text-on-brand text-sm font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={handleSave}
            className="w-full py-2.5 rounded-token-md bg-grad-hero text-on-brand font-black text-xs hover:opacity-90 transition-all shadow-neu-sm hover:shadow-neu">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
