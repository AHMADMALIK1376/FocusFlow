import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search } from 'lucide-react';
import { AVAILABLE_LANGUAGES, setLanguage } from '../../i18n';
import { cx } from './cx';

export function LanguageSelect({ className = '' }) {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'en').split('-')[0];
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  const currentLang = AVAILABLE_LANGUAGES.find((l) => l.code === current) || AVAILABLE_LANGUAGES[0];

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(''); }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return AVAILABLE_LANGUAGES;
    return AVAILABLE_LANGUAGES.filter(
      (l) => l.native.toLowerCase().includes(s) || l.label.toLowerCase().includes(s) || l.code.includes(s)
    );
  }, [q]);

  function pick(code) { setLanguage(code); setOpen(false); setQ(''); }

  return (
    <div className={cx('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2.5 h-11 px-4 rounded-token-md bg-surface text-ink font-bold text-sm shadow-neu-sm hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="text-base leading-none">{currentLang.flag}</span>
        <span className="truncate">{currentLang.native}</span>
        <ChevronDown size={15} className={cx('text-muted transition-transform duration-300 ml-1', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-[2000] mt-2 left-0 w-64 max-w-[82vw] bg-surface border border-[rgb(var(--ink)/0.08)] rounded-token-md shadow-glass overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-2.5 border-b border-[rgb(var(--ink)/0.06)]">
            <div className="flex items-center gap-2 h-9 px-3 rounded-token-sm bg-surface-2">
              <Search size={15} className="text-muted shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search language…"
                className="bg-transparent outline-none text-sm flex-1 min-w-0 text-ink placeholder:text-muted"
              />
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1.5" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted text-center">No language found</li>
            ) : (
              filtered.map((l) => {
                const active = l.code === current;
                return (
                  <li key={l.code} role="option" aria-selected={active}>
                    <button
                      onClick={() => pick(l.code)}
                      className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors', active ? 'bg-brand/10' : 'hover:bg-surface-2')}
                    >
                      <span className="text-lg leading-none">{l.flag}</span>
                      <span className="flex-1 min-w-0">
                        <span className={cx('block text-sm font-bold truncate', active ? 'text-brand' : 'text-ink')}>{l.native}</span>
                        <span className="block text-[11px] text-muted truncate">{l.label}</span>
                      </span>
                      {active && <Check size={16} className="text-brand shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LanguageSelect;
