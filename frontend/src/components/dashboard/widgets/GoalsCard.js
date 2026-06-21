import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ProgressRing } from '../../ui';
import { useGoals } from '../../../features/goalsx/useGoals';
import { goalProgress, overallProgress } from '../../../features/goalsx/goalsLogic';

export default function GoalsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useGoals();
  const top2 = state.goals.slice(0, 2);
  const overall = overallProgress(state);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">🎯 {t('widgets.goalsx', { defaultValue: 'Goals' })}</h3>
        <div className="flex items-center gap-2">
          <ProgressRing progress={overall} size={36} stroke={4} />
          <Button size="sm" variant="ghost" onClick={() => navigate('/goals')}>{t('goalsx.viewAll', { defaultValue: 'View all' })}</Button>
        </div>
      </div>
      {top2.length === 0 ? (
        <EmptyState icon="🎯" title={t('goalsx.empty', { defaultValue: 'No goals yet' })} />
      ) : (
        <ul className="space-y-3">
          {top2.map(goal => {
            const pct = goalProgress(goal);
            return (
              <li key={goal.id} className="cursor-pointer" onClick={() => navigate('/goals')}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-ink truncate max-w-[75%]">{goal.title}</span>
                  <span className="text-muted">{pct}%</span>
                </div>
                <div className="bg-surface-2 rounded-token-sm h-1.5">
                  <div className="bg-brand h-1.5 rounded-token-sm" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Button size="sm" variant="primary" onClick={() => navigate('/goals')} className="mt-3 w-full">
        {t('goalsx.add', { defaultValue: '+ New Goal' })}
      </Button>
    </div>
  );
}
