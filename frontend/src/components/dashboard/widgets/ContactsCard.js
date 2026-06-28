import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Avatar, StatCard, EmptyState } from '../../ui';
import { useContacts } from '../../../features/contacts/useContacts';

export default function ContactsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useContacts();
  const { contacts } = state;
  const recent = contacts.slice(0, 3);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">👤 {t('widgets.contacts', { defaultValue: 'Contacts' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/contacts')}>{t('contacts.viewAll', { defaultValue: 'View all' })}</Button>
      </div>

      <div className="mb-3">
        <StatCard icon="👤" label={t('contacts.total', { defaultValue: 'Total contacts' })} value={contacts.length} tone="info" />
      </div>

      {recent.length === 0 ? (
        <EmptyState icon="👤" title={t('contacts.empty', { defaultValue: 'No contacts yet' })} />
      ) : (
        <ul className="space-y-2">
          {recent.map(c => (
            <li key={c.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2 cursor-pointer hover:bg-[rgb(var(--ink)/0.06)] transition-colors duration-200" onClick={() => navigate('/contacts')}>
              <Avatar name={c.name} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate">{c.name}</p>
                <p className="text-xs text-muted truncate">{c.role || c.email || ''}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" variant="primary" onClick={() => navigate('/contacts')} className="mt-3">
        {t('contacts.add', { defaultValue: '+ Add contact' })}
      </Button>
    </div>
  );
}
