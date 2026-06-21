import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState } from '../../ui';
import { useHabits } from '../../../features/habits/useHabits';
import { streakFor } from '../../../features/habits/habitsLogic';

const TODAY = new Date().toISOString().slice(0, 10);

export default function HabitsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useHabits();
  const { habits } = state;

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">🔁 {t('widgets.habits', { defaultValue: 'Habits' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/habits')}>{t('habits.viewAll', { defaultValue: 'View all' })}</Button>
      </div>
      {habits.length === 0 ? (
        <EmptyState icon="🔁" title={t('habits.empty', { defaultValue: 'No habits tracked' })} />
      ) : (
        <ul className="space-y-2">
          {habits.slice(0, 5).map(habit => {
            const done = !!(habit.log && habit.log[TODAY]);
            const streak = streakFor(habit, TODAY);
            return (
              <li key={habit.id} className="flex items-center gap-3">
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_DAY', payload: { id: habit.id, day: TODAY } })}
                  className={`w-6 h-6 rounded-token-sm border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${done ? 'bg-success border-success' : 'border-[rgb(var(--ink)/0.3)] hover:border-brand'}`}
                >
                  {done && <span className="text-on-brand text-xs">✓</span>}
                </button>
                <span className={`flex-1 text-sm ${done ? 'line-through text-muted' : 'text-ink font-bold'}`}>{habit.name}</span>
                <span className="text-xs text-muted">🔥 {streak}</span>
              </li>
            );
          })}
        </ul>
      )}
      <Button size="sm" variant="ghost" onClick={() => navigate('/habits')} className="mt-3 w-full">
        {t('habits.manage', { defaultValue: 'Manage habits' })}
      </Button>
    </div>
  );
}
