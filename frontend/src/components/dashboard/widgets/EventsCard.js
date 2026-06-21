import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState } from '../../ui';
import { useEvents } from '../../../features/eventsx/useEvents';
import { upcoming } from '../../../features/eventsx/eventsLogic';

const TODAY = new Date().toISOString().slice(0, 10);

export default function EventsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useEvents();
  const nextUp = upcoming(state, TODAY, 3);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">📆 {t('widgets.eventsx', { defaultValue: 'Events' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/events')}>{t('eventsx.open', { defaultValue: 'Open' })}</Button>
      </div>

      {nextUp.length === 0 ? (
        <EmptyState icon="📆" title={t('eventsx.noUpcoming', { defaultValue: 'No upcoming events' })} />
      ) : (
        <ul className="space-y-2">
          {nextUp.map(ev => (
            <li key={ev.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2 cursor-pointer hover:bg-[rgb(var(--ink)/0.06)] transition-colors duration-200" onClick={() => navigate('/events')}>
              <div className="w-1.5 h-8 rounded-token-sm bg-brand flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate">{ev.title}</p>
                <p className="text-xs text-muted">{ev.date}{ev.time ? ` — ${ev.time}` : ''}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" variant="primary" onClick={() => navigate('/events')} className="mt-3 w-full">
        {t('eventsx.addEvent', { defaultValue: '+ Add event' })}
      </Button>
    </div>
  );
}
