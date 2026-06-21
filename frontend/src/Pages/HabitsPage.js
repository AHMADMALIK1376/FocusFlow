import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, EmptyState } from '../components/ui';
import { useHabits } from '../features/habits/useHabits';
import { streakFor, weekGrid } from '../features/habits/habitsLogic';

const TODAY = new Date().toISOString().slice(0, 10);
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

const COLOR_CLASSES = {
  brand: 'bg-brand',
  success: 'bg-success',
  info: 'bg-info',
  warn: 'bg-warn',
  focus: 'bg-focus',
};

export default function HabitsPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useHabits();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('brand');
  const [renaming, setRenaming] = useState(null); // habit id being renamed
  const [renameVal, setRenameVal] = useState('');

  const { habits } = state;
  const weekStart = getWeekStart();

  function addHabit() {
    if (!newName.trim()) return;
    dispatch({ type: 'ADD', payload: { name: newName.trim(), color: newColor } });
    setNewName('');
  }

  function startRename(habit) {
    setRenaming(habit.id);
    setRenameVal(habit.name);
  }

  function commitRename(id) {
    if (renameVal.trim()) {
      dispatch({ type: 'RENAME', payload: { id, name: renameVal.trim() } });
    }
    setRenaming(null);
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-black tracking-tight text-ink mb-8">{t('habits.title', { defaultValue: 'Habits' })}</h1>

      {/* Add habit */}
      <Card className="mb-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('habits.add', { defaultValue: 'New Habit' })}</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t('habits.namePlaceholder', { defaultValue: 'Habit name...' })}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            className="flex-1 min-w-[180px]"
          />
          <select
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            className="bg-surface-2 border border-[rgb(var(--ink)/0.12)] text-ink rounded-token-md px-3 py-2 text-sm"
          >
            {Object.keys(COLOR_CLASSES).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button variant="primary" onClick={addHabit}>{t('habits.addBtn', { defaultValue: 'Add' })}</Button>
        </div>
      </Card>

      {/* Habit list */}
      {habits.length === 0 ? (
        <Card>
          <EmptyState icon="🔁" title={t('habits.empty', { defaultValue: 'No habits tracked yet' })} description={t('habits.emptyHint', { defaultValue: 'Add a habit above to get started' })} />
        </Card>
      ) : (
        <div className="space-y-4">
          {habits.map(habit => {
            const grid = weekGrid(habit, weekStart);
            const streak = streakFor(habit, TODAY);
            const colorClass = COLOR_CLASSES[habit.color] || 'bg-brand';
            return (
              <Card key={habit.id}>
                <div className="flex items-center justify-between mb-3">
                  {renaming === habit.id ? (
                    <div className="flex gap-2 flex-1 mr-2">
                      <Input
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(habit.id); if (e.key === 'Escape') setRenaming(null); }}
                        autoFocus
                      />
                      <Button size="sm" variant="primary" onClick={() => commitRename(habit.id)}>{t('habits.save', { defaultValue: 'Save' })}</Button>
                    </div>
                  ) : (
                    <h3 className="text-base font-black text-ink flex-1">{habit.name}</h3>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">🔥 {streak}</span>
                    <Button size="sm" variant="ghost" onClick={() => startRename(habit)}>{t('habits.rename', { defaultValue: '✏️' })}</Button>
                    <Button size="sm" variant="danger" onClick={() => dispatch({ type: 'REMOVE', payload: { id: habit.id } })}>{t('habits.delete', { defaultValue: '✕' })}</Button>
                  </div>
                </div>

                {/* Week grid */}
                <div className="flex gap-1 flex-wrap">
                  {WEEK_DAYS.map((day, i) => {
                    const d = new Date(weekStart);
                    d.setDate(d.getDate() + i);
                    const dayKey = d.toISOString().slice(0, 10);
                    return (
                      <button
                        key={i}
                        onClick={() => dispatch({ type: 'TOGGLE_DAY', payload: { id: habit.id, day: dayKey } })}
                        title={dayKey}
                        className={`flex flex-col items-center gap-0.5 rounded-token-sm p-1.5 w-9 transition-all duration-200 ${grid[i] ? `${colorClass} shadow-neu-sm` : 'bg-surface-2 hover:bg-[rgb(var(--ink)/0.1)]'}`}
                      >
                        <span className={`text-[10px] font-black ${grid[i] ? 'text-on-brand' : 'text-muted'}`}>{day}</span>
                        <span className={`text-xs ${grid[i] ? 'text-on-brand' : 'text-ink/40'}`}>{grid[i] ? '✓' : '·'}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Today toggle prominent button */}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={habit.log && habit.log[TODAY] ? 'primary' : 'neu'}
                    onClick={() => dispatch({ type: 'TOGGLE_DAY', payload: { id: habit.id, day: TODAY } })}
                  >
                    {habit.log && habit.log[TODAY] ? t('habits.doneToday', { defaultValue: '✓ Done today' }) : t('habits.markToday', { defaultValue: 'Mark today' })}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
