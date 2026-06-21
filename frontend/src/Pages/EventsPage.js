import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Calendar from 'react-calendar';
import { Card, Button, Input, EmptyState } from '../components/ui';
import { useEvents } from '../features/eventsx/useEvents';
import { eventsOn, upcoming } from '../features/eventsx/eventsLogic';

const TODAY = new Date().toISOString().slice(0, 10);

function toYMD(date) {
  return date.toISOString().slice(0, 10);
}

export default function EventsPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useEvents();
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [calDate, setCalDate] = useState(new Date());
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');

  const dayEvents = eventsOn(state, selectedDay);
  const nextUp = upcoming(state, TODAY, 5);

  function addEvent() {
    if (!newTitle.trim()) return;
    dispatch({ type: 'ADD', payload: { date: selectedDay, title: newTitle.trim(), time: newTime, color: 'brand' } });
    setNewTitle('');
    setNewTime('');
  }

  function tileContent({ date, view }) {
    if (view !== 'month') return null;
    const dayStr = toYMD(date);
    const dayEvs = eventsOn(state, dayStr);
    if (dayEvs.length === 0) return null;
    return (
      <div className="flex justify-center mt-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-brand" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-black tracking-tight text-ink mb-8">{t('eventsx.title', { defaultValue: 'Calendar & Events' })}</h1>

      <div className="md:grid md:grid-cols-[340px_1fr] gap-6">
        {/* Calendar + add */}
        <div className="space-y-4">
          <Card>
            <Calendar
              value={calDate}
              onChange={date => { setCalDate(date); setSelectedDay(toYMD(date)); }}
              tileContent={tileContent}
              className="w-full"
            />
          </Card>

          <Card>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">
              {t('eventsx.addEvent', { defaultValue: 'Add Event' })} — {selectedDay}
            </h3>
            <div className="space-y-2">
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t('eventsx.titlePlaceholder', { defaultValue: 'Event title...' })} onKeyDown={e => e.key === 'Enter' && addEvent()} />
              <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
              <Button variant="primary" onClick={addEvent} className="w-full">{t('eventsx.addBtn', { defaultValue: 'Add Event' })}</Button>
            </div>
          </Card>
        </div>

        {/* Day events + upcoming */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{selectedDay}</h3>
            {dayEvents.length === 0 ? (
              <EmptyState icon="📆" title={t('eventsx.noEvents', { defaultValue: 'No events on this day' })} />
            ) : (
              <ul className="space-y-2">
                {dayEvents.map(ev => (
                  <li key={ev.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2">
                    <div className="w-1.5 h-8 rounded-token-sm bg-brand flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-ink">{ev.title}</p>
                      {ev.time && <p className="text-xs text-muted">{ev.time}</p>}
                    </div>
                    <button onClick={() => dispatch({ type: 'REMOVE', payload: { id: ev.id } })} className="text-muted hover:text-focus text-xs transition-colors duration-200">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('eventsx.upcoming', { defaultValue: 'Upcoming' })}</h3>
            {nextUp.length === 0 ? (
              <EmptyState icon="📅" title={t('eventsx.noUpcoming', { defaultValue: 'No upcoming events' })} />
            ) : (
              <ul className="space-y-2">
                {nextUp.map(ev => (
                  <li key={ev.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2">
                    <div className="w-1.5 h-8 rounded-token-sm bg-info flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-ink">{ev.title}</p>
                      <p className="text-xs text-muted">{ev.date}{ev.time ? ` — ${ev.time}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
