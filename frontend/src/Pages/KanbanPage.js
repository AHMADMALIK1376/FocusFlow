import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Button, Input } from '../components/ui';
import { useKanban } from '../features/kanban/useKanban';
import { cardsByColumn } from '../features/kanban/kanbanLogic';

function SortableCard({ card, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface rounded-token-md shadow-neu-sm p-3 mb-2 cursor-default"
    >
      <div className="flex items-start gap-2">
        <span className="text-muted cursor-grab active:cursor-grabbing py-0.5" {...attributes} {...listeners}>⠿</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">{card.title}</p>
          {card.note && <p className="text-xs text-muted mt-0.5">{card.note}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(card)} className="text-muted hover:text-ink text-xs p-1 transition-colors duration-200">✏️</button>
          <button onClick={() => onRemove(card.id)} className="text-muted hover:text-focus text-xs p-1 transition-colors duration-200">✕</button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useKanban();
  const [newCardText, setNewCardText] = useState({});
  const [editCard, setEditCard] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [editNote, setEditNote] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which column each card is in
    let toColumnId = null;
    for (const col of state.columns) {
      const cards = cardsByColumn(state, col.id);
      if (cards.some(c => c.id === over.id)) {
        toColumnId = col.id;
        const toIndex = cards.findIndex(c => c.id === over.id);
        dispatch({ type: 'MOVE_CARD', payload: { id: active.id, toColumnId, toIndex } });
        return;
      }
    }
  }

  function addCard(colId) {
    const text = (newCardText[colId] || '').trim();
    if (!text) return;
    dispatch({ type: 'ADD_CARD', payload: { columnId: colId, title: text } });
    setNewCardText(prev => ({ ...prev, [colId]: '' }));
  }

  function startEdit(card) {
    setEditCard(card);
    setEditVal(card.title);
    setEditNote(card.note || '');
  }

  function saveEdit() {
    if (!editCard) return;
    dispatch({ type: 'UPDATE_CARD', payload: { id: editCard.id, patch: { title: editVal, note: editNote } } });
    setEditCard(null);
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-black tracking-tight text-ink mb-8">{t('kanban.title', { defaultValue: 'Kanban Board' })}</h1>

      {/* Edit card modal */}
      {editCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--ink)/0.2)] backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('kanban.editCard', { defaultValue: 'Edit Card' })}</h3>
            <div className="space-y-2">
              <Input value={editVal} onChange={e => setEditVal(e.target.value)} placeholder={t('kanban.titlePlaceholder', { defaultValue: 'Card title...' })} />
              <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder={t('kanban.notePlaceholder', { defaultValue: 'Note (optional)' })} />
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={() => setEditCard(null)}>{t('kanban.cancel', { defaultValue: 'Cancel' })}</Button>
                <Button variant="primary" onClick={saveEdit}>{t('kanban.save', { defaultValue: 'Save' })}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.columns.map(col => {
            const cards = cardsByColumn(state, col.id);
            return (
              <div key={col.id} className="bg-surface-2 rounded-token-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted">{col.title}</h3>
                  <span className="text-xs bg-surface rounded-token-sm px-2 py-0.5 text-muted shadow-neu-sm">{cards.length}</span>
                </div>

                <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {cards.length === 0 ? (
                    <div className="text-center py-6 text-muted text-sm">{t('kanban.empty', { defaultValue: 'No cards' })}</div>
                  ) : (
                    cards.map(card => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        onEdit={startEdit}
                        onRemove={(id) => dispatch({ type: 'REMOVE_CARD', payload: { id } })}
                      />
                    ))
                  )}
                </SortableContext>

                {/* Add card input */}
                <div className="flex gap-1 mt-2">
                  <Input
                    value={newCardText[col.id] || ''}
                    onChange={e => setNewCardText(prev => ({ ...prev, [col.id]: e.target.value }))}
                    placeholder={t('kanban.addCard', { defaultValue: '+ Add card...' })}
                    onKeyDown={e => e.key === 'Enter' && addCard(col.id)}
                    size="sm"
                  />
                  <Button size="sm" variant="primary" onClick={() => addCard(col.id)}>+</Button>
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
