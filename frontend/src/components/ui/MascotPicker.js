import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Modal } from './Modal';
import { cx } from './cx';
import { MASCOTS, mascotSrc } from './mascots';
import { fileToAvatar } from './avatarImage';

// `onPhoto` is optional: when given, an "Add a picture" button lets the person use their own photo instead.
export function MascotPicker({ open, onClose, value, onPick, onPhoto }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // so choosing the same file again still fires
    if (!file) return;
    try {
      onPhoto(await fileToAvatar(file));
      setError('');
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose your mascot" showClose trapFocus maxWidthClassName="max-w-md">
      {onPhoto && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            className="w-full flex items-center justify-center gap-2 rounded-token-md bg-surface-2 px-3 py-2.5 text-sm font-bold text-brand hover:-translate-y-0.5 transition-transform"
          >
            <ImagePlus size={16} aria-hidden="true" /> Add a picture of yourself
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden data-testid="photo-input" onChange={onFile} />
          {error && <p role="alert" className="mt-1.5 text-xs font-bold text-focus">{error}</p>}
          <p className="mt-2 text-center text-[11px] text-muted">or pick a mascot</p>
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {MASCOTS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => { onPick(m.id); onClose(); }}
            aria-pressed={value === m.id}
            className={cx(
              'rounded-token-md bg-surface-2 p-2 flex flex-col items-center gap-1 transition-transform hover:-translate-y-0.5',
              value === m.id && 'ring-2 ring-focus-ring'
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
