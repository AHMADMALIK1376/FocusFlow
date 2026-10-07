import React from 'react';
import { cx } from './cx';
import { renderIcon } from './renderIcon';

// icon: a lucide icon component, shown in a soft clay tile.
export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={cx('text-center py-12 px-6', className)}>
      {icon != null && (
        <span className="mx-auto mb-4 w-16 h-16 rounded-3xl bg-sage/50 shadow-neu-sm flex items-center justify-center text-icon">
          {renderIcon(icon, { size: 28 })}
        </span>
      )}
      {title && <h3 className="text-lg font-black text-ink">{title}</h3>}
      {description && (
        <p className="mt-1 text-sm text-muted max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;
