import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useKanban } from '../../../features/kanban/useKanban';
import { cardsByColumn } from '../../../features/kanban/kanbanLogic';
import WidgetShell, { WidgetEmpty } from './WidgetShell';

const COL_STYLE = {
  'col-todo': { fill: 'bg-surface-2 shadow-neu-inset', dot: 'bg-[rgb(var(--muted))]' },
  'col-doing': { fill: 'bg-grad-sun', dot: 'bg-sun' },
  'col-done': { fill: 'bg-grad-sage', dot: 'bg-sage' },
};

// Board progress as one segmented clay bar (to do / doing / done) plus the
// next active cards — instead of three bare counters.
export default function KanbanCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useKanban();
  const { columns, cards } = state;
  const counts = columns.map((c) => ({ ...c, n: cardsByColumn(state, c.id).length }));
  const total = counts.reduce((a, c) => a + c.n, 0);
  const done = counts.find((c) => c.id === 'col-done')?.n || 0;
  const active = [...cards].filter((c) => c.columnId !== 'col-done').sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 3);

  return (
    <WidgetShell icon="🗂️" title={t('widgets.kanban', { defaultValue: 'Assignment board' })} linkLabel={t('kanban.open', { defaultValue: 'Open board' })} onLink={() => navigate('/projects')}>
      {total === 0 ? (
        <WidgetEmpty emoji="🗂️" title="No cards yet" hint="Add assignments and projects, then drag them from To do → Done." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink">{done} of {total} done</span>
            <span className="text-muted">{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="flex h-4 rounded-full bg-surface-2 shadow-neu-inset overflow-hidden gap-0.5 p-0.5">
            {counts.filter((c) => c.n).map((c) => (
              <div key={c.id} className={`h-full rounded-full ${COL_STYLE[c.id]?.fill || 'bg-brand'}`} style={{ width: `${(c.n / total) * 100}%` }} title={`${c.title}: ${c.n}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {counts.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <span className={`w-2.5 h-2.5 rounded-full ${COL_STYLE[c.id]?.dot || 'bg-brand'}`} /> {c.title} <b className="text-ink">{c.n}</b>
              </span>
            ))}
          </div>
          {active.length > 0 && (
            <ul className="grid sm:grid-cols-3 gap-2 pt-1">
              {active.map((card) => (
                <li key={card.id} onClick={() => navigate('/projects')} className="cursor-pointer rounded-token-md bg-surface-2 shadow-neu-sm px-3 py-2 hover:-translate-y-0.5 transition-transform">
                  <p className="text-xs font-bold text-ink truncate">{card.title}</p>
                  <p className="text-[10px] text-muted">{columns.find((c) => c.id === card.columnId)?.title || ''}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
