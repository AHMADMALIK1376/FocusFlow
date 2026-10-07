import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '../../ui';
import { renderIcon } from '../../ui/renderIcon';

// Shared clay card for dashboard widgets: icon chip + title + link on top,
// content in the middle (grows so cards in a grid row line up), optional
// footer action at the bottom. `tone` tints the whole card sage or pink.
export const CARD_TONES = { plain: 'bg-surface shadow-neu', sage: 'bg-grad-sage-card shadow-neu', blush: 'bg-grad-blush shadow-neu', coral: 'tone-coral bg-grad-hero shadow-clay-brand' };

export default function WidgetShell({ icon, title, linkLabel, onLink, footer, children, className, tone = 'plain' }) {
  const tinted = tone !== 'plain';
  return (
    <section className={cx(CARD_TONES[tone] || CARD_TONES.plain, 'text-ink rounded-token-lg p-5 h-full flex flex-col', className)}>
      <header className="flex items-center gap-3 mb-4">
        <span className={cx('w-10 h-10 rounded-2xl shadow-neu-sm flex items-center justify-center shrink-0', tinted ? 'bg-surface text-brand' : 'bg-grad-sage text-on-sage')} aria-hidden="true">
          {renderIcon(icon, { size: 19 })}
        </span>
        <h3 className="flex-1 min-w-0 text-sm font-black uppercase tracking-wide text-ink leading-tight break-words">{title}</h3>
        {onLink && (
          // Round arrow instead of a text link, so long titles never collide with it.
          <button onClick={onLink} title={linkLabel} aria-label={linkLabel} className={cx("w-8 h-8 rounded-full shadow-neu-sm flex items-center justify-center shrink-0 hover:-translate-y-0.5 transition-transform", tinted ? "bg-surface text-brand" : "bg-grad-sage text-on-sage")}>
            <ChevronRight size={16} />
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}

// Friendly empty state used inside widgets. icon: a lucide icon component.
export function WidgetEmpty({ icon, title, hint }) {
  return (
    <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center py-3">
      <span className="w-14 h-14 rounded-3xl bg-sage/50 shadow-neu-sm flex items-center justify-center text-icon mb-2.5">{renderIcon(icon, { size: 24 })}</span>
      <p className="text-sm font-black text-ink">{title}</p>
      {hint && <p className="text-xs text-muted mt-0.5 max-w-[16rem]">{hint}</p>}
    </div>
  );
}

// Inset clay track with a puffy fill — used instead of bare numbers.
export function ClayBar({ value, className, fillClassName = 'bg-grad-hero', height = 'h-3.5' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cx('w-full rounded-full bg-surface-2 shadow-neu-inset overflow-hidden', height, className)}>
      <div
        className={cx('h-full rounded-full shadow-[inset_0_2px_3px_rgb(255_255_255/0.45)] transition-[width] duration-700 ease-spring', fillClassName)}
        style={{ width: `${pct}%`, minWidth: pct > 0 ? '0.75rem' : 0 }}
      />
    </div>
  );
}

// Rs 950 · Rs 12.5k · Rs 1.2M
export function compactRs(n) {
  const v = Math.abs(Number(n) || 0);
  const sign = n < 0 ? '−' : '';
  if (v < 1000) return `${sign}Rs ${Math.round(v)}`;
  if (v < 1e6) return `${sign}Rs ${(v / 1000).toFixed(v < 10000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${sign}Rs ${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
}
