import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui';
import { useNotes } from '../../../features/notes/useNotes';
import { selectSorted } from '../../../features/notes/notesLogic';
import WidgetShell, { WidgetEmpty } from './WidgetShell';

// Pastel clay sticky notes (sunshine / sage / coral / cream).
const TINTS = ['bg-[rgb(255_243_196)]', 'bg-[rgb(220_238_226)]', 'bg-[rgb(255_222_220)]', 'bg-[rgb(250_240_225)]'];

export default function NotesCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useNotes();
  const notes = selectSorted(state).slice(0, 3);

  return (
    <WidgetShell
      icon="📝"
      title={t('widgets.notes', { defaultValue: 'Notes' })}
      linkLabel={t('notes.viewAll', { defaultValue: 'View all' })}
      onLink={() => navigate('/notes')}
      footer={<Button size="sm" variant="primary" full onClick={() => navigate('/notes')}>{t('notes.add', { defaultValue: '+ New Note' })}</Button>}
    >
      {notes.length === 0 ? (
        <WidgetEmpty emoji="🗒️" title="No notes yet" hint="Jot down lecture points, formulas or to-dos." />
      ) : (
        <div className="space-y-2.5">
          {notes.map((note, i) => (
            <button
              key={note.id}
              onClick={() => navigate('/notes')}
              className={`block w-full text-left rounded-token-md px-3.5 py-2.5 shadow-neu-sm hover:-translate-y-0.5 transition-transform ${TINTS[i % TINTS.length]}`}
            >
              <p className="text-sm font-black text-ink line-clamp-1">{note.title || t('notes.untitled', { defaultValue: 'Untitled' })}</p>
              <p className="text-[11px] text-ink/70 mt-0.5 line-clamp-2">{note.body?.slice(0, 120)}</p>
            </button>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
