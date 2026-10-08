import React from 'react';
import { Modal } from './Modal';
import { cx } from './cx';
import { MASCOTS, mascotSrc } from './mascots';

export function MascotPicker({ open, onClose, value, onPick }) {
  return (
    <Modal open={open} onClose={onClose} title="Choose your mascot" showClose trapFocus maxWidthClassName="max-w-md">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {MASCOTS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => { onPick(m.id); onClose(); }}
            aria-pressed={value === m.id}
            className={cx(
              'rounded-token-md bg-surface-2 p-2 flex flex-col items-center gap-1 transition-transform hover:-translate-y-0.5',
              value === m.id && 'ring-2 ring-[rgb(var(--brand))]'
            )}
          >
            <img src={mascotSrc(m.id)} alt="" className="w-16 h-16 object-contain" />
            <span className="text-[11px] font-bold text-ink">{m.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default MascotPicker;
