import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState } from '../../ui';
import { useKanban } from '../../../features/kanban/useKanban';
import { cardsByColumn } from '../../../features/kanban/kanbanLogic';

export default function KanbanCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useKanban();
  const { columns, cards } = state;

  // 3 most-recent active (non-done) cards
  const activeCards = [...cards]
    .filter(c => c.columnId !== 'col-done')
    .sort((a, b) => (b.id > a.id ? 1 : -1))
    .slice(0, 3);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">🗂️ {t('widgets.kanban', { defaultValue: 'Kanban' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/projects')}>{t('kanban.open', { defaultValue: 'Open board' })}</Button>
      </div>

      {/* Column counts */}
      <div className="flex gap-2 mb-4">
        {columns.map(col => (
          <div key={col.id} className="flex-1 bg-surface-2 rounded-token-md px-2 py-1.5 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-muted truncate">{col.title}</p>
            <p className="text-base font-black text-ink">{cardsByColumn(state, col.id).length}</p>
          </div>
        ))}
      </div>

      {activeCards.length === 0 ? (
        <EmptyState icon="🗂️" title={t('kanban.empty', { defaultValue: 'No active cards' })} />
      ) : (
        <ul className="space-y-1.5">
          {activeCards.map(card => (
            <li key={card.id} className="bg-surface-2 rounded-token-md px-3 py-2 cursor-pointer hover:bg-[rgb(var(--ink)/0.06)] transition-colors duration-200" onClick={() => navigate('/projects')}>
              <p className="text-sm font-bold text-ink truncate">{card.title}</p>
              <p className="text-xs text-muted">{columns.find(c => c.id === card.columnId)?.title || ''}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
