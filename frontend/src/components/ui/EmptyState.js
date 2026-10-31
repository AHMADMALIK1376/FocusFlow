import React from 'react';
import { cx } from './cx';
import { renderIcon } from './renderIcon';

// icon: a lucide icon component, shown in a soft clay tile.
export function EmptyState({ icon, title, description, action, className = '', compact = false }) {
  return (
    <div className={cx('text-center', compact ? 'py-3 px-3' : 'py-12 px-6', className)}>
      {icon != null && (
        <span className={cx('mx-auto bg-sage/50 shadow-neu-sm flex items-center justify-center text-icon', compact ? 'mb-2 w-10 h-10 rounded-2xl' : 'mb-4 w-16 h-16 rounded-3xl')}>
          {renderIcon(icon, { size: compact ? 20 : 28 })}
        </span>
      )}
      {title && <h3 className={cx('font-black text-ink', compact ? 'text-sm' : 'text-lg')}>{title}</h3>}
      {description && (
        <p className={cx('mt-1 text-muted max-w-sm mx-auto', compact ? 'text-xs' : 'text-sm')}>{description}</p>
      )}
      {action && <div className={cx('flex justify-center', compact ? 'mt-3' : 'mt-5')}>{action}</div>}
    </div>
  );
}

export default EmptyState;
