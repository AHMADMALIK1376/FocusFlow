import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState } from '../../ui';
import { useNotes } from '../../../features/notes/useNotes';
import { selectSorted } from '../../../features/notes/notesLogic';

export default function NotesCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useNotes();
  const notes = selectSorted(state).slice(0, 3);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">📝 {t('widgets.notes', { defaultValue: 'Notes' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/notes')}>{t('notes.viewAll', { defaultValue: 'View all' })}</Button>
      </div>
      {notes.length === 0 ? (
        <EmptyState icon="📝" title={t('notes.empty', { defaultValue: 'No notes yet' })} />
      ) : (
        <ul className="space-y-2">
          {notes.map(note => (
            <li key={note.id} className="bg-surface-2 rounded-token-md px-3 py-2 cursor-pointer hover:bg-[rgb(var(--ink)/0.06)] transition-colors duration-200" onClick={() => navigate('/notes')}>
              <p className="text-sm font-bold text-ink truncate">{note.title || t('notes.untitled', { defaultValue: 'Untitled' })}</p>
              <p className="text-xs text-muted truncate mt-0.5">{note.body?.slice(0, 60)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex justify-center">
        <Button size="sm" variant="primary" onClick={() => navigate('/notes')} className="w-4/5">
          {t('notes.add', { defaultValue: '+ New Note' })}
        </Button>
      </div>
    </div>
  );
}
