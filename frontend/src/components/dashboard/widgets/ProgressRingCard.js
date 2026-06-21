import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, ProgressRing } from '../../ui';

export default function ProgressRingCard() {
  const { completedGoals, pendingTasksCount } = useApp();

  const total = (completedGoals || 0) + (pendingTasksCount || 0);
  const pct = total > 0 ? Math.round(((completedGoals || 0) / total) * 100) : 0;

  return (
    <Card className="flex flex-col items-center justify-center gap-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-muted self-start">
        Goal Progress
      </h3>
      <ProgressRing value={pct} size={140} stroke={12}>
        <div className="text-center">
          <p className="text-3xl font-black text-ink leading-none">{pct}%</p>
          <p className="text-xs text-muted font-bold mt-1">Complete</p>
        </div>
      </ProgressRing>
      <p className="text-xs text-muted font-medium">
        {completedGoals || 0} of {total} goals completed
      </p>
    </Card>
  );
}
