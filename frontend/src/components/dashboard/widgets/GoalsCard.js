import React from 'react';
import { Target, Trophy } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, ProgressRing } from '../../ui';
import { useGoals } from '../../../features/goalsx/useGoals';
import { goalProgress, overallProgress } from '../../../features/goalsx/goalsLogic';
import WidgetShell, { WidgetEmpty, ClayBar } from './WidgetShell';

export default function GoalsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useGoals();
  const goals = state.goals.slice(0, 3);
  const overall = overallProgress(state);

  return (
    <WidgetShell
      tone="coral"
      icon={Target}
      title={t('widgets.goalsx', { defaultValue: 'Goals' })}
      linkLabel={t('goalsx.viewAll', { defaultValue: 'View all' })}
      onLink={() => navigate('/goals')}
      footer={<Button size="sm" variant="neu" full onClick={() => navigate('/goals')}>{t('goalsx.add', { defaultValue: '+ New Goal' })}</Button>}
    >
      {goals.length === 0 ? (
        <WidgetEmpty icon={Target} title="No goals yet" hint="Set an academic goal, like a GPA target or finishing a course." />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-surface shadow-neu-sm p-1">
              <ProgressRing value={overall} size={54} stroke={7}>
                <span className="text-[11px] font-black text-ink">{overall}%</span>
              </ProgressRing>
            </span>
            <p className="text-xs text-muted">
              <b className="text-ink">{state.goals.length}</b> goal{state.goals.length === 1 ? '' : 's'} · overall progress
            </p>
          </div>
          <ul className="space-y-3">
            {goals.map((goal) => {
              const pct = goalProgress(goal);
              return (
                <li key={goal.id} className="cursor-pointer" onClick={() => navigate('/goals')}>
                  <div className="flex justify-between gap-2 text-sm mb-1.5">
                    <span className="font-bold text-ink truncate">{goal.title}</span>
                    {pct >= 100 && <Trophy size={14} aria-label="done" className="text-brand shrink-0" />}
                  </div>
                  <ClayBar value={pct} height="h-3" fillClassName={pct >= 100 ? 'bg-grad-sage' : 'bg-grad-hero'} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </WidgetShell>
  );
}
