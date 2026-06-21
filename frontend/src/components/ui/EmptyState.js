import React from 'react';
import { cx } from './cx';

export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={cx('text-center py-12 px-6', className)}>
      {icon != null && <div className="text-5xl mb-4">{icon}</div>}
      {title && <h3 className="text-lg font-black text-ink">{title}</h3>}
      {description && (
        <p className="mt-1 text-sm text-muted max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;
