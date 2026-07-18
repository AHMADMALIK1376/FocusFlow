import React from 'react';
import { Trash2 } from 'lucide-react';
import { cx } from './cx';

// Small icon button meant to live inside a `group` card — invisible until the
// card is hovered, then turns solid red (icon goes white) on its own hover.
export function CardDeleteButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Delete"
      className={cx(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
        'text-muted bg-[rgb(var(--ink)/0.08)]',
        'opacity-0 group-hover:opacity-100 transition-all duration-200',
        'hover:bg-red-500 hover:text-white',
        className
      )}
    >
      <Trash2 size={13} />
    </button>
  );
}

export default CardDeleteButton;
