import React, { useState } from 'react';
import { cx } from '../ui';
import { usePreferences } from '../../preferences/usePreferences';
import { COLOR_COMBOS } from '../../design/themes';

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-muted uppercase tracking-wide">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border border-[rgb(var(--ink)/0.15)] bg-transparent p-0.5"
        />
        <span className="font-mono text-xs text-ink uppercase">{value}</span>
      </span>
    </label>
  );
}

export default function PalettePicker() {
  const { activeDashboard, updateActiveDashboard } = usePreferences();
  const palette = activeDashboard?.palette || {};
  const custom = palette.custom || null;

  const [draftBrand, setDraftBrand] = useState(custom?.brand || '#2D4759');
  const [draftAccent, setDraftAccent] = useState(custom?.accent || '#D6C6F7');

  if (!activeDashboard) return null;

  const matchesCombo = (combo) =>
    custom &&
    (custom.brand || '').toLowerCase() === combo.brand.toLowerCase() &&
    (custom.accent || '').toLowerCase() === combo.accent.toLowerCase();

  const isCustom = Boolean(custom) && !COLOR_COMBOS.some(matchesCombo);

  const selectCombo = (combo) => {
    updateActiveDashboard({
      palette: { scheme: combo.id, custom: { brand: combo.brand, accent: combo.accent }, customAccent: null },
    });
  };

  const applyCustom = (brand, accent) => {
    updateActiveDashboard({
      palette: { scheme: null, custom: { brand, accent }, customAccent: null },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {COLOR_COMBOS.map((combo) => {
          const active = matchesCombo(combo);
          return (
            <button
              key={combo.id}
              type="button"
              onClick={() => selectCombo(combo)}
              title={combo.name}
              className={cx(
                'group flex items-center gap-2.5 p-2.5 rounded-token-md border transition-all text-left',
                active
                  ? 'border-brand shadow-[0_0_0_3px_rgb(var(--brand)/0.14)]'
                  : 'border-[rgb(var(--ink)/0.1)] hover:border-[rgb(var(--ink)/0.3)]'
              )}
            >
              <span className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 ring-1 ring-black/5">
                <span className="absolute inset-0" style={{ background: combo.brand }} />
                <span className="absolute bottom-0 right-0 w-1/2 h-full" style={{ background: combo.accent }} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-ink truncate">{combo.name}</span>
                <span className={cx('block text-[10px] font-semibold', active ? 'text-brand' : 'text-muted')}>
                  {active ? 'Active' : 'Tap to apply'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom two-colour combination */}
      <div className={cx('rounded-token-md border p-4', isCustom ? 'border-brand shadow-[0_0_0_3px_rgb(var(--brand)/0.14)]' : 'border-[rgb(var(--ink)/0.1)]')}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-wider text-ink">Custom combination</p>
          {isCustom && <span className="text-[10px] font-bold text-brand">Active</span>}
        </div>
        <div className="flex flex-wrap items-end gap-5">
          <ColorField
            label="Primary"
            value={draftBrand}
            onChange={(v) => { setDraftBrand(v); applyCustom(v, draftAccent); }}
          />
          <ColorField
            label="Accent"
            value={draftAccent}
            onChange={(v) => { setDraftAccent(v); applyCustom(draftBrand, v); }}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wide">Preview</span>
            <span
              className="w-24 h-10 rounded-lg ring-1 ring-black/5"
              style={{ background: `linear-gradient(135deg, ${draftBrand}, ${draftAccent})` }}
            />
          </div>
        </div>
        <p className="text-[11px] text-muted mt-3">Pick any two colours — they apply across the sidebar, navbar, buttons and charts instantly.</p>
      </div>
    </div>
  );
}
