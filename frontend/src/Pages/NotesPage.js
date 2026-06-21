import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Textarea, EmptyState } from '../components/ui';
import { useNotes } from '../features/notes/useNotes';
import { selectSorted, renderInline } from '../features/notes/notesLogic';

export default function NotesPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useNotes();
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [preview, setPreview] = useState(false);

  const notes = selectSorted(state);
  const selected = notes.find(n => n.id === selectedId) || null;

  function startNew() {
    dispatch({ type: 'ADD', payload: { title: t('notes.untitled', { defaultValue: 'Untitled' }), body: '' } });
    // Select the newly added note (it will be first after re-render)
    setTimeout(() => {
      setSelectedId(null); // will be corrected after re-render
    }, 0);
    setEditing(true);
    setEditTitle(t('notes.untitled', { defaultValue: 'Untitled' }));
    setEditBody('');
    setPreview(false);
  }

  function selectNote(note) {
    setSelectedId(note.id);
    setEditing(false);
    setEditTitle(note.title);
    setEditBody(note.body);
    setPreview(false);
  }

  function startEdit(note) {
    setSelectedId(note.id);
    setEditing(true);
    setEditTitle(note.title);
    setEditBody(note.body);
    setPreview(false);
  }

  function saveEdit() {
    if (!selectedId) return;
    dispatch({ type: 'UPDATE', payload: { id: selectedId, patch: { title: editTitle, body: editBody } } });
    setEditing(false);
  }

  function deleteNote(id) {
    dispatch({ type: 'REMOVE', payload: { id } });
    if (selectedId === id) {
      setSelectedId(null);
      setEditing(false);
    }
  }

  function renderSegments(segs) {
    return segs.map((seg, i) => {
      switch (seg.type) {
        case 'heading': return <strong key={i} className="block text-base font-black text-ink">{seg.content}</strong>;
        case 'bold': return <strong key={i} className="font-bold text-ink">{seg.content}</strong>;
        case 'italic': return <em key={i} className="italic text-muted">{seg.content}</em>;
        case 'li': return <span key={i} className="block pl-3 text-ink before:content-['•'] before:mr-2 before:text-brand">{seg.content}</span>;
        case 'br': return <br key={i} />;
        default: return <span key={i} className="text-ink">{seg.content}</span>;
      }
    });
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black tracking-tight text-ink">{t('notes.title', { defaultValue: 'Notes' })}</h1>
        <Button variant="primary" onClick={startNew}>
          {t('notes.add', { defaultValue: '+ New Note' })}
        </Button>
      </div>

      <div className="md:grid md:grid-cols-[320px_1fr] gap-6">
        {/* Left list */}
        <div className="mb-4 md:mb-0">
          <Card>
            {notes.length === 0 ? (
              <EmptyState icon="📝" title={t('notes.empty', { defaultValue: 'No notes yet' })} description={t('notes.emptyHint', { defaultValue: 'Create your first note' })} />
            ) : (
              <ul className="space-y-1">
                {notes.map(note => (
                  <li
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={`rounded-token-md px-3 py-3 cursor-pointer transition-colors duration-200 ${selectedId === note.id ? 'bg-grad-hero text-on-brand' : 'hover:bg-surface-2'}`}
                  >
                    <p className={`font-bold text-sm truncate ${selectedId === note.id ? 'text-on-brand' : 'text-ink'}`}>{note.title || t('notes.untitled', { defaultValue: 'Untitled' })}</p>
                    <p className={`text-xs truncate mt-0.5 ${selectedId === note.id ? 'text-on-brand/80' : 'text-muted'}`}>{note.body?.slice(0, 50) || ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right editor/preview */}
        <div>
          {!selected && !editing ? (
            <Card>
              <EmptyState icon="📝" title={t('notes.selectHint', { defaultValue: 'Select or create a note' })} />
            </Card>
          ) : editing ? (
            <Card>
              <div className="space-y-3">
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder={t('notes.titlePlaceholder', { defaultValue: 'Note title' })}
                />
                <Textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  placeholder={t('notes.bodyPlaceholder', { defaultValue: 'Write your note here...' })}
                  rows={14}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => { setEditing(false); setPreview(false); }}>{t('notes.cancel', { defaultValue: 'Cancel' })}</Button>
                  <Button variant="primary" onClick={saveEdit}>{t('notes.save', { defaultValue: 'Save' })}</Button>
                </div>
              </div>
            </Card>
          ) : selected ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-ink">{selected.title}</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPreview(p => !p)}>
                    {preview ? t('notes.raw', { defaultValue: 'Raw' }) : t('notes.preview', { defaultValue: 'Preview' })}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(selected)}>{t('notes.edit', { defaultValue: 'Edit' })}</Button>
                  <Button variant="danger" size="sm" onClick={() => deleteNote(selected.id)}>{t('notes.delete', { defaultValue: 'Delete' })}</Button>
                </div>
              </div>
              {preview ? (
                <div className="prose max-w-none leading-relaxed">
                  {renderSegments(renderInline(selected.body || ''))}
                </div>
              ) : (
                <pre className="text-ink text-sm font-mono whitespace-pre-wrap bg-surface-2 rounded-token-md p-4">{selected.body}</pre>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
