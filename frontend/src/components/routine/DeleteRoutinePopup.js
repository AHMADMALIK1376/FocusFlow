// src/components/routine/DeleteRoutinePopup.js
import React, { useState, useEffect } from "react";

export default function DeleteRoutinePopup({ routine, allRoutines, onClose, onDelete }) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [deleteMode, setDeleteMode] = useState('all');
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [routineSelectionMode, setRoutineSelectionMode] = useState('single');

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (routine) setSelectedRoutineId(routine.id);
  }, [routine]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleDelete = () => {
    if (routineSelectionMode === 'allRoutines') {
      onDelete('ALL_ROUTINES', 'entireWeek');
      return;
    }
    if (!selectedRoutineId) return alert("Select a routine to delete!");
    if (deleteMode === 'specific' && selectedDays.length === 0) return alert("Select at least one day to delete!");
    onDelete(selectedRoutineId, deleteMode === 'all' ? 'all' : selectedDays);
  };

  const currentRoutine = allRoutines?.find(r => r.id === selectedRoutineId) || routine;
  const isAllRoutinesMode = routineSelectionMode === 'allRoutines';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${isVisible ? 'bg-[rgb(var(--ink)/0.2)]' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-surface rounded-token-lg shadow-glass p-5 w-full max-w-[440px] z-10 max-h-[85vh] overflow-y-auto border border-[rgb(var(--ink)/0.08)]
          transition-all duration-300 ease-spring
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
      >
        <button onClick={handleClose}
          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-focus text-on-brand text-[10px] flex items-center justify-center shadow-neu-sm hover:scale-110 transition-all z-20">✕
        </button>

        <div className="text-center mb-4">
          <span className="text-xl mb-0.5 block">🗑️</span>
          <h2 className="text-base font-black text-ink">Delete Activity</h2>
          <p className="text-[9px] text-muted mt-0.5">
            {isAllRoutinesMode ? 'Deleting: ALL routines' : `Deleting: ${currentRoutine?.activity?.trim() || 'Select a routine'}`}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-2 block">What to Delete</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setRoutineSelectionMode('single'); setSelectedRoutineId(null); }}
                className={`flex-1 py-2 rounded-token-sm font-bold text-[10px] transition-all border ${routineSelectionMode === 'single' ? 'bg-focus text-on-brand border-focus shadow-neu-sm' : 'bg-surface-2 text-muted border-[rgb(var(--ink)/0.08)]'}`}>
                📋 Single Routine
              </button>
              <button
                onClick={() => setRoutineSelectionMode('allRoutines')}
                className={`flex-1 py-2 rounded-token-sm font-bold text-[10px] transition-all border ${isAllRoutinesMode ? 'bg-focus text-on-brand border-focus shadow-neu-sm' : 'bg-surface-2 text-muted border-[rgb(var(--ink)/0.08)]'}`}>
                🗑️ All Routines
              </button>
            </div>
          </div>

          {!isAllRoutinesMode && allRoutines && allRoutines.length > 0 && (
            <div>
              <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-2 block">Select Routine</label>
              <div className="flex flex-wrap gap-1.5">
                {allRoutines.map((r) => (
                  <button key={r.id} type="button" onClick={() => setSelectedRoutineId(r.id)}
                    className={`px-3 py-2 rounded-token-sm font-bold text-[9px] transition-all border ${selectedRoutineId === r.id ? 'bg-focus text-on-brand border-focus shadow-neu-sm' : 'bg-surface-2 text-muted border-[rgb(var(--ink)/0.08)]'}`}>
                    {r.activity.trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isAllRoutinesMode && (
            <div>
              <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-2 block">Delete Option</label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDeleteMode('all'); setSelectedDays([]); }}
                  className={`flex-1 py-2 rounded-token-sm font-bold text-[10px] transition-all border ${deleteMode === 'all' ? 'bg-focus text-on-brand border-focus shadow-neu-sm' : 'bg-surface-2 text-muted border-[rgb(var(--ink)/0.08)]'}`}>
                  🗑️ Entire Week
                </button>
                <button
                  onClick={() => setDeleteMode('specific')}
                  className={`flex-1 py-2 rounded-token-sm font-bold text-[10px] transition-all border ${deleteMode === 'specific' ? 'bg-warn text-on-brand border-warn shadow-neu-sm' : 'bg-surface-2 text-muted border-[rgb(var(--ink)/0.08)]'}`}>
                  📅 Specific Days
                </button>
              </div>
            </div>
          )}

          {!isAllRoutinesMode && deleteMode === 'specific' && (
            <div>
              <label className="text-[9px] font-black text-muted uppercase tracking-wider mb-1.5 block">Select Days to Remove</label>
              <div className="flex flex-wrap gap-1.5">
                {currentRoutine?.repeatOn?.map((day) => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-token-sm font-bold text-[9px] transition-all border ${selectedDays.includes(day) ? 'bg-focus text-on-brand border-focus shadow-neu-sm' : 'bg-surface-2 text-muted border-[rgb(var(--ink)/0.08)]'}`}>
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
              {selectedDays.length > 0 && (
                <p className="text-[8px] text-focus mt-1">
                  Removing from: {selectedDays.map(d => d.substring(0, 3)).join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="bg-focus/10 border border-focus/20 rounded-token-sm p-3">
            <p className="text-[9px] text-focus font-bold">
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

          <div className="flex gap-2">
            <button onClick={handleClose}
              className="flex-1 py-2.5 rounded-token-sm bg-surface-2 text-muted font-bold text-xs hover:bg-[rgb(var(--ink)/0.08)] transition-all border border-[rgb(var(--ink)/0.08)]">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!isAllRoutinesMode && (!selectedRoutineId || (deleteMode === 'specific' && selectedDays.length === 0))}
              className={`flex-1 py-2.5 rounded-token-sm font-black text-xs transition-all shadow-neu-sm
                ${(!isAllRoutinesMode && (!selectedRoutineId || (deleteMode === 'specific' && selectedDays.length === 0)))
                  ? 'bg-[rgb(var(--ink)/0.1)] text-muted cursor-not-allowed'
                  : 'bg-focus text-on-brand hover:shadow-neu'}`}>
              {isAllRoutinesMode ? '🗑️ Delete Everything' : deleteMode === 'all' ? '🗑️ Delete All' : '🗑️ Delete Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
