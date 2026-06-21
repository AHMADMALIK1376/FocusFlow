import React from 'react';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_LANGUAGES, setLanguage } from '../../i18n';
import { cx } from './cx';

export function LanguageSelect({ className = '' }) {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'en').split('-')[0];

  return (
    <div className={cx('relative', className)}>
      <select
        aria-label="Language"
        value={current}
        onChange={(e) => setLanguage(e.target.value)}
        className="appearance-none h-11 pl-4 pr-9 rounded-token-md bg-surface text-ink font-bold text-sm shadow-neu-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {AVAILABLE_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">
        ▾
      </span>
    </div>
  );
}

export default LanguageSelect;
