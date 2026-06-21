import React, { Suspense } from 'react';
import { usePreferences } from '../../preferences/usePreferences';
import { WIDGET_BY_ID } from '../../dashboard/registry';
import { Skeleton } from '../ui';

function WidgetSkeleton() {
  return (
    <div className="bg-surface rounded-token-lg shadow-neu p-6">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function DashboardGrid() {
  const { activeDashboard } = usePreferences();

  if (!activeDashboard) return null;

  const { order, enabled } = activeDashboard.widgets;

  const visibleIds = order.filter((id) => enabled[id] && WIDGET_BY_ID[id]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1000px] w-full mx-auto items-stretch">
      {visibleIds.map((id) => {
        const widget = WIDGET_BY_ID[id];
        const Comp = widget.component;
        return (
          <Suspense key={id} fallback={<WidgetSkeleton />}>
            <Comp />
          </Suspense>
        );
      })}
    </div>
  );
}
