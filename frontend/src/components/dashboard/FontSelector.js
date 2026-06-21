import React from 'react';
import { usePreferences } from '../../preferences/usePreferences';
import { FONT_OPTIONS } from '../../design/fonts';
import { Select, Field } from '../ui';

export default function FontSelector() {
  const { activeDashboard, updateActiveDashboard } = usePreferences();

  if (!activeDashboard) return null;

  function handleChange(e) {
    updateActiveDashboard({ fontFamily: e.target.value });
  }

  return (
    <Field label="Font family" htmlFor="font-select">
      <Select
        id="font-select"
        value={activeDashboard.fontFamily || 'poppins'}
        onChange={handleChange}
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
            {f.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
