import React, { useState } from 'react';
import { cx } from '../ui';
import { usePreferences } from '../../preferences/usePreferences';
import { COLOR_COMBOS } from '../../design/themes';
import '../ui/fancyControls.css';

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
      <div>
        <div className="ff-swatches">
          {COLOR_COMBOS.map((combo) => {
            const active = matchesCombo(combo);
            return (
              <button
                key={combo.id}
                type="button"
                onClick={() => selectCombo(combo)}
                data-name={combo.name}
                aria-label={combo.name}
                className={cx('ff-swatch', active && 'ff-swatch-active')}
                style={{ '--sw': combo.brand, '--sw2': combo.accent }}
              />
            );
          })}
        </div>
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
