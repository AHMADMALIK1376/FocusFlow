import React from 'react';
import { cx } from '../ui';
import { usePreferences } from '../../preferences/usePreferences';
import { COLOR_SCHEMES } from '../../design/themes';

export default function PalettePicker() {
  const { activeDashboard, updateActiveDashboard } = usePreferences();

  if (!activeDashboard) return null;

  const { palette } = activeDashboard;

  function selectScheme(schemeId) {
    updateActiveDashboard({ palette: { scheme: schemeId, customAccent: null } });
  }

  function selectCustomAccent(hex) {
    updateActiveDashboard({ palette: { scheme: null, customAccent: hex } });
  }

  const activeScheme = palette && !palette.customAccent ? palette.scheme : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {COLOR_SCHEMES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => selectScheme(s.id)}
          aria-label={s.name}
          title={s.name}
          className={cx(
            'w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 active:scale-95',
            activeScheme === s.id
              ? 'border-ink scale-110 shadow-[0_0_0_3px_rgb(var(--ink)/0.15)]'
              : 'border-transparent'
          )}
          style={{ backgroundColor: s.swatch }}
        />
      ))}

      {/* Custom accent colour picker */}
      <label
        className={cx(
          'relative w-8 h-8 rounded-full border-2 overflow-hidden cursor-pointer transition-all hover:scale-110',
          palette && palette.customAccent
            ? 'border-ink scale-110'
            : 'border-[rgb(var(--ink)/0.25)]'
        )}
        title="Custom colour"
        aria-label="Custom colour picker"
      >
        <span className="absolute inset-0 flex items-center justify-center text-xs pointer-events-none">
          🎨
        </span>
        <input
          type="color"
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          value={palette && palette.customAccent ? palette.customAccent : '#6c5ce7'}
          onChange={(e) => selectCustomAccent(e.target.value)}
        />
      </label>
    </div>
  );
}
