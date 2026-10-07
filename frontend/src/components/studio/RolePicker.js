import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { normalizeHex } from '../../design/theme/studio';

// The typed hex box. It reseeds from the current value when that changes (a swatch, Undo, a palette),
// but is never remounted: a remount would drop the keyboard focus out of the dialog after Enter.
function CustomHex({ role, value, onPick }) {
  const [text, setText] = useState(value === 'auto' ? '' : value);
  const [error, setError] = useState(false);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value === 'auto' ? '' : value);
    setError(false);
  }
  const id = `studio-hex-${role}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const commit = () => {
    const hex = normalizeHex(text);
    if (!hex) {
      if (text.trim() !== '') setError(true);
      return;
    }
    setError(false);
    setText(hex);
    if (hex !== value) onPick(hex);
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block mb-1.5 text-sm font-bold text-ink">
        Hex code<span className="sr-only"> for {role}</span>
      </label>
      <Input
        id={id}
        value={text}
        placeholder="#EC706D"
        maxLength={16}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : hintId}
        onChange={(e) => { setText(e.target.value); setError(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        onBlur={commit}
        className="!py-2 !px-3 text-sm font-mono"
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-semibold text-warn-ink">That isn&apos;t a colour code. Try something like #EC706D.</p>
      ) : (
        <p id={hintId} className="mt-1.5 text-xs text-muted">Press Enter to apply.</p>
      )}
    </div>
  );
}

function Swatch({ swatch, selected, onPick }) {
  return (
    <button
      type="button"
      aria-label={`${swatch.name} ${swatch.hex}`}
      aria-pressed={selected}
      onClick={() => onPick(swatch.hex)}
      style={{ backgroundColor: swatch.hex }}
      className={[
        'relative w-8 h-8 rounded-full border border-[rgb(var(--border))] transition-transform motion-reduce:transition-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand',
        selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:scale-110 motion-reduce:hover:scale-100',
      ].join(' ')}
    >
      {selected && (
        <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-surface text-ink grid place-items-center shadow-neu-sm" aria-hidden="true">
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// One colour job (Background, Brand, Accent, Text, Logo or Icon): named swatches, Auto, a hex box
// and the phone's own colour picker. value is 'auto' or a hex; autoHex is shown while on Auto.
export default function RolePicker({
  role, title, description, value, autoAllowed = false, autoHex = '#000000', rows, onPick, onDrag, onDragEnd,
}) {
  const isAuto = value === 'auto';
  const native = (isAuto ? autoHex : value).toLowerCase();
  return (
    <fieldset className="min-w-0 border-0 p-0 m-0">
      <legend className="text-base font-black text-ink p-0">{title}</legend>
      <p className="text-sm text-muted mt-1">{description}</p>
      <p className="text-sm font-bold text-ink mt-2 mb-3">Now: {isAuto ? 'Auto' : value}</p>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="text-xs font-black uppercase tracking-wider text-muted mb-1.5">{row.label}</p>
            <div className="flex flex-wrap gap-2">
              {row.swatches.map((s) => (
                <Swatch key={s.hex + s.name} swatch={s} selected={!isAuto && s.hex === value} onPick={onPick} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {autoAllowed && (
          <Button type="button" variant="neu" size="sm" aria-pressed={isAuto} aria-label={`Auto ${role}`} onClick={() => onPick('auto')}>
            {isAuto && <Check size={14} aria-hidden="true" />}
            Auto
          </Button>
        )}
        <div className="flex-1 min-w-[10rem]">
          <p className="text-xs font-black uppercase tracking-wider text-muted mb-1.5">Custom colour</p>
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <CustomHex role={role} value={value} onPick={onPick} />
            </div>
            <input
              type="color"
              value={native}
              aria-label={`Pick a ${role} colour`}
              onChange={(e) => onDrag(e.target.value)}
              onBlur={onDragEnd}
              className="w-10 h-10 mb-6 p-0 rounded-token-sm border border-[rgb(var(--border))] bg-transparent cursor-pointer shrink-0"
            />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
