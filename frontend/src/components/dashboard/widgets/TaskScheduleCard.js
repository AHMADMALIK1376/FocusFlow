import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, Pill, EmptyState } from '../../ui';

export default function TaskScheduleCard() {
  const { tasks } = useApp();

  const pending = (tasks || [])
    .filter((t) => !t.completed)
    .slice(0, 6);

  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">
        Task Schedule
      </h3>
      {pending.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="All caught up!"
          description="No pending tasks right now."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {pending.map((task) => (
            <li
              key={task._id || task.id || task.title}
              className="flex items-center gap-3 py-2 border-b border-[rgb(var(--ink)/0.06)] last:border-0"
            >
              <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
              <span className="flex-1 text-sm font-medium text-ink truncate">
                {task.title || task.name}
              </span>
              {task.priority && (
                <Pill active={task.priority === 'high'} className="text-xs py-0.5 px-2">
                  {task.priority}
                </Pill>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
