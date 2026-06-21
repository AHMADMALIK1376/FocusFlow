import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../ui';

export default function MetricsCard() {
  const { completedGoals, streak, pendingTasksCount, pendingRoutineCount } = useApp();

  return (
    <div className="bg-surface rounded-token-lg shadow-neu p-6">
      <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">
        Metrics
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="🎯"
          label="Completed Goals"
          value={completedGoals || 0}
          tone="brand"
        />
        <StatCard
          icon="🔥"
          label="Day Streak"
          value={streak || 0}
          tone="warn"
        />
        <StatCard
          icon="📋"
          label="Tasks Pending"
          value={pendingTasksCount || 0}
          tone="info"
        />
        <StatCard
          icon="🕒"
          label="Routines Left"
          value={pendingRoutineCount || 0}
          tone="success"
        />
      </div>
    </div>
  );
}
