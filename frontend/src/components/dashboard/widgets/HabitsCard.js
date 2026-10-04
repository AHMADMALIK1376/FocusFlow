import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui';
import { useHabits } from '../../../features/habits/useHabits';
import { streakFor } from '../../../features/habits/habitsLogic';
import WidgetShell, { WidgetEmpty } from './WidgetShell';

const keyOf = (d) => d.toISOString().slice(0, 10);

// Last 7 days as dots (today last, bigger and tappable) instead of numbers.
function lastWeek() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: keyOf(d), label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), today: i === 0 });
  }
  return days;
}

export default function HabitsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, toggleDay } = useHabits();
  const habits = state.habits.slice(0, 4);
  const week = lastWeek();
  const today = week[6].key;

  return (
    <WidgetShell
      tone="sage"
      icon="🔁"
      title={t('widgets.habits', { defaultValue: 'Habits' })}
      linkLabel={t('habits.viewAll', { defaultValue: 'View all' })}
      onLink={() => navigate('/habits')}
      footer={<Button size="sm" variant="neu" full onClick={() => navigate('/habits')}>{t('habits.manage', { defaultValue: 'Manage habits' })}</Button>}
    >
      {habits.length === 0 ? (
        <WidgetEmpty emoji="🌱" title="No habits yet" hint="Build a study streak — e.g. revise 30 minutes a day." />
      ) : (
        <ul className="space-y-3.5">
          {habits.map((habit) => {
            const streak = streakFor(habit, today);
            return (
              <li key={habit.id}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-bold text-ink truncate">{habit.name}</span>
                  <span className={`text-xs font-black shrink-0 ${streak ? 'text-ink' : 'text-muted'}`}>{streak ? `🔥 ${streak}` : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {week.map((d) => {
                    const done = !!(habit.log && habit.log[d.key]);
                    const cls = done
                      ? 'bg-[linear-gradient(160deg,rgb(150_206_170),rgb(118_184_142))] shadow-neu-sm'  // deeper sage: stands out on the sage card
                      : 'bg-surface-2 shadow-neu-inset';
                    return d.today ? (
                      <button
                        key={d.key}
                        onClick={() => toggleDay(habit.id, d.key)}
                        title={done ? 'Done today — tap to undo' : 'Tap when done today'}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-transform active:scale-90 ring-2 ring-sun ring-offset-1 ring-offset-surface ${cls} ${done ? 'text-on-sage' : 'text-muted'}`}
                      >
                        {done ? '✓' : d.label}
                      </button>
                    ) : (
                      <span key={d.key} title={d.key} className={`w-5 h-5 rounded-full ${cls}`} />
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetShell>
  );
}
