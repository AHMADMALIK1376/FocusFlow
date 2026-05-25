// src/components/routine/DeleteRoutinePopup.js
import React, { useState, useEffect } from "react";

// ✅ FIX: Use SHORT day names for backend compatibility
const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DeleteRoutinePopup({ routine, allRoutines, onClose, onDelete }) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [deleteMode, setDeleteMode] = useState('all'); // 'all' | 'specific' | 'entireWeek'
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [routineSelectionMode, setRoutineSelectionMode] = useState('single'); // 'single' | 'allRoutines'

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (routine) {
      setSelectedRoutineId(routine.id);
    }
  }, [routine]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleDelete = () => {
    if (routineSelectionMode === 'allRoutines') {
      // Delete ALL routines for all days
      onDelete('ALL_ROUTINES', 'entireWeek');
      return;
    }
    
    if (!selectedRoutineId) return alert("Select a routine to delete!");
    if (deleteMode === 'specific' && selectedDays.length === 0) {
      return alert("Select at least one day to delete!");
    }
    
    onDelete(selectedRoutineId, deleteMode === 'all' ? 'all' : selectedDays);
  };

  const currentRoutine = allRoutines?.find(r => r.id === selectedRoutineId) || routine;
  const isAllRoutinesMode = routineSelectionMode === 'allRoutines';

  // Helper to format day for display (convert short to full if needed)
  const formatDayForDisplay = (day) => {
    const dayMap = {
      'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
      'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
    };
    return dayMap[day] || day;
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out
        ${isVisible ? 'bg-black/20' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-[#f0f2f5] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-5 w-full max-w-[440px] z-10 max-h-[85vh] overflow-y-auto
          transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
      >
        <button onClick={handleClose}
          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow-lg hover:scale-110 transition-all z-20">✕</button>

        <div className="text-center mb-4">
          <span className="text-xl mb-0.5 block">🗑️</span>
          <h2 className="text-base font-black text-gray-800">Delete Activity</h2>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {isAllRoutinesMode 
              ? 'Deleting: ALL routines'
              : `Deleting: ${currentRoutine?.activity?.trim() || 'Select a routine'}`
            }
          </p>
        </div>

        <div className="space-y-4">
          {/* Routine Selection Mode */}
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-2 block">
              What to Delete
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => { setRoutineSelectionMode('single'); setSelectedRoutineId(null); }}
                className={`flex-1 py-2 rounded-xl font-bold text-[10px] transition-all
                  ${routineSelectionMode === 'single' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-500 shadow-sm'}`}>
                📋 Single Routine
              </button>
              <button 
                onClick={() => { setRoutineSelectionMode('allRoutines'); }}
                className={`flex-1 py-2 rounded-xl font-bold text-[10px] transition-all
                  ${isAllRoutinesMode ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 shadow-sm'}`}>
                🗑️ All Routines
              </button>
            </div>
          </div>

          {/* Single routine selector */}
          {!isAllRoutinesMode && allRoutines && allRoutines.length > 0 && (
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-2 block">
                Select Routine
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allRoutines.map((r) => (
                  <button key={r.id} type="button" onClick={() => setSelectedRoutineId(r.id)}
                    className={`px-3 py-2 rounded-lg font-bold text-[9px] transition-all
                      ${selectedRoutineId === r.id
                        ? "bg-red-500 text-white shadow-md"
                        : "bg-white text-gray-500 shadow-sm hover:shadow-md"}`}
                  >
                    {r.activity.trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delete Mode - only for single routine */}
          {!isAllRoutinesMode && (
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-2 block">Delete Option</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setDeleteMode('all'); setSelectedDays([]); }}
                  className={`flex-1 py-2 rounded-xl font-bold text-[10px] transition-all
                    ${deleteMode === 'all' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-500 shadow-sm'}`}>
                  🗑️ Entire Week
                </button>
                <button 
                  onClick={() => setDeleteMode('specific')}
                  className={`flex-1 py-2 rounded-xl font-bold text-[10px] transition-all
                    ${deleteMode === 'specific' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-500 shadow-sm'}`}>
                  📅 Specific Days
                </button>
              </div>
            </div>
          )}

          {/* Day Selection */}
          {!isAllRoutinesMode && deleteMode === 'specific' && (
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">
                Select Days to Remove
              </label>
              <div className="flex flex-wrap gap-1.5">
                {currentRoutine?.repeatOn?.map((day) => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[9px] transition-all
                      ${selectedDays.includes(day)
                        ? "bg-red-500 text-white shadow-md"
                        : "bg-white text-gray-400 shadow-sm hover:shadow-md"}`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
              {selectedDays.length > 0 && (
                <p className="text-[8px] text-red-400 mt-1">
                  Removing from: {selectedDays.map(d => d.substring(0, 3)).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Warning message */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-[9px] text-red-600 font-bold">
              {isAllRoutinesMode 
                ? '⚠️ This will DELETE ALL routines from ALL days! This action cannot be undone!'
                : !selectedRoutineId 
                  ? '⚠️ Select a routine above to delete!'
                  : deleteMode === 'all' 
                    ? `⚠️ This will permanently delete "${currentRoutine?.activity?.trim()}" from ALL days!`
                    : selectedDays.length > 0
                      ? `⚠️ This will remove "${currentRoutine?.activity?.trim()}" from ${selectedDays.length} day(s)!`
                      : '⚠️ Select days above to remove from specific days'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl bg-white text-gray-500 font-bold text-xs hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              disabled={!isAllRoutinesMode && (!selectedRoutineId || (deleteMode === 'specific' && selectedDays.length === 0))}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg
                ${(!isAllRoutinesMode && (!selectedRoutineId || (deleteMode === 'specific' && selectedDays.length === 0)))
                  ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600 hover:shadow-xl'}`}>
              {isAllRoutinesMode ? '🗑️ Delete Everything' : deleteMode === 'all' ? '🗑️ Delete All' : '🗑️ Delete Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}