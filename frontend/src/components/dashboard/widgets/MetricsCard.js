import React from 'react';
import { Target, Flame, ClipboardList, Clock } from "lucide-react";
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
          icon={Target}
          label="Completed Goals"
          value={completedGoals || 0}
          tone="brand"
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={streak || 0}
          tone="warn"
        />
        <StatCard
          icon={ClipboardList}
          label="Tasks Pending"
          value={pendingTasksCount || 0}
          tone="info"
        />
        <StatCard
          icon={Clock}
          label="Routines Left"
          value={pendingRoutineCount || 0}
          tone="success"
        />
      </div>
    </div>
  );
}
