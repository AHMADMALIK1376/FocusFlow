import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, EmptyState, Avatar, Badge } from '../components/ui';
import { useContacts } from '../features/contacts/useContacts';
import { search, allTags } from '../features/contacts/contactsLogic';

export default function ContactsPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useContacts();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', phone: '', email: '', tags: '' });
  const [editId, setEditId] = useState(null);

  const filtered = search(state, query);
  const selected = state.contacts.find(c => c.id === selectedId) || null;
  const tags = allTags(state);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit() {
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    if (!payload.name) return;
    if (editId) {
      dispatch({ type: 'UPDATE', payload: { id: editId, patch: payload } });
      setEditId(null);
    } else {
      dispatch({ type: 'ADD', payload });
    }
    setForm({ name: '', role: '', phone: '', email: '', tags: '' });
    setShowForm(false);
  }

  function startEdit(contact) {
    setForm({
      name: contact.name || '',
      role: contact.role || '',
      phone: contact.phone || '',
      email: contact.email || '',
      tags: (contact.tags || []).join(', '),
    });
    setEditId(contact.id);
    setShowForm(true);
  }

  function remove(id) {
    dispatch({ type: 'REMOVE', payload: { id } });
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black tracking-tight text-ink">{t('contacts.title', { defaultValue: 'Contacts' })}</h1>
        <Button variant="primary" onClick={() => { setShowForm(s => !s); setEditId(null); setForm({ name: '', role: '', phone: '', email: '', tags: '' }); }}>
          {showForm ? t('contacts.cancel', { defaultValue: 'Cancel' }) : t('contacts.add', { defaultValue: '+ Contact' })}
        </Button>
      </div>

      {/* Add/edit form */}
      {showForm && (
        <Card className="mb-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{editId ? t('contacts.editContact', { defaultValue: 'Edit Contact' }) : t('contacts.newContact', { defaultValue: 'New Contact' })}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder={t('contacts.namePlaceholder', { defaultValue: 'Name *' })} />
            <Input value={form.role} onChange={e => setField('role', e.target.value)} placeholder={t('contacts.rolePlaceholder', { defaultValue: 'Role / relation' })} />
            <Input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder={t('contacts.phonePlaceholder', { defaultValue: 'Phone' })} />
            <Input value={form.email} onChange={e => setField('email', e.target.value)} placeholder={t('contacts.emailPlaceholder', { defaultValue: 'Email' })} type="email" />
            <Input value={form.tags} onChange={e => setField('tags', e.target.value)} placeholder={t('contacts.tagsPlaceholder', { defaultValue: 'Tags (comma separated)' })} className="md:col-span-2" />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>{t('contacts.cancel', { defaultValue: 'Cancel' })}</Button>
            <Button variant="primary" onClick={submit}>{editId ? t('contacts.save', { defaultValue: 'Save' }) : t('contacts.create', { defaultValue: 'Create' })}</Button>
          </div>
        </Card>
      )}

      <div className="md:grid md:grid-cols-[300px_1fr] gap-6">
        {/* Contact list */}
        <div>
          <Card>
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('contacts.searchPlaceholder', { defaultValue: 'Search...' })}
              className="mb-3"
            />
            {/* Tag filter pills */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {tags.map(tag => (
                  <button key={tag} onClick={() => setQuery(query === tag ? '' : tag)} className={`text-xs rounded-token-sm px-2 py-0.5 transition-colors duration-200 ${query === tag ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted hover:text-ink'}`}>{tag}</button>
                ))}
              </div>
            )}
            {filtered.length === 0 ? (
              <EmptyState icon="👤" title={t('contacts.empty', { defaultValue: 'No contacts found' })} />
            ) : (
              <ul className="space-y-1">
                {filtered.map(c => (
                  <li
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex items-center gap-3 rounded-token-md px-3 py-2 cursor-pointer transition-colors duration-200 ${selectedId === c.id ? 'bg-grad-hero shadow-neu-sm' : 'hover:bg-surface-2'}`}
                  >
                    <Avatar name={c.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${selectedId === c.id ? 'text-on-brand' : 'text-ink'}`}>{c.name}</p>
                      <p className={`text-xs truncate ${selectedId === c.id ? 'text-on-brand/80' : 'text-muted'}`}>{c.role || c.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Contact detail */}
        <div>
          {!selected ? (
            <Card>
              <EmptyState icon="👤" title={t('contacts.selectHint', { defaultValue: 'Select a contact to view details' })} />
            </Card>
          ) : (
            <Card>
              <div className="flex items-start gap-4 mb-6">
                <Avatar name={selected.name} size={56} />
                <div className="flex-1">
                  <h2 className="text-xl font-black text-ink">{selected.name}</h2>
                  {selected.role && <p className="text-muted text-sm">{selected.role}</p>}
                  {(selected.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selected.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(selected)}>{t('contacts.edit', { defaultValue: 'Edit' })}</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(selected.id)}>{t('contacts.delete', { defaultValue: 'Delete' })}</Button>
                </div>
              </div>

              <div className="space-y-3">
                {selected.phone && (
                  <div className="bg-surface-2 rounded-token-md px-4 py-3">
                    <p className="text-xs text-muted uppercase tracking-wider mb-0.5">{t('contacts.phone', { defaultValue: 'Phone' })}</p>
                    <p className="text-ink font-bold">{selected.phone}</p>
                  </div>
                )}
                {selected.email && (
                  <div className="bg-surface-2 rounded-token-md px-4 py-3">
                    <p className="text-xs text-muted uppercase tracking-wider mb-0.5">{t('contacts.email', { defaultValue: 'Email' })}</p>
                    <p className="text-ink font-bold">{selected.email}</p>
                  </div>
                )}
                {selected.createdAt && (
                  <p className="text-xs text-muted">{t('contacts.added', { defaultValue: 'Added' })} {selected.createdAt.slice(0, 10)}</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
