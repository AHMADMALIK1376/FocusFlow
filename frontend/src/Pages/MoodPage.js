import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Textarea, EmptyState } from '../components/ui';
import { useMood } from '../features/mood/useMood';
import { last7, average } from '../features/mood/moodLogic';

const TODAY = new Date().toISOString().slice(0, 10);

const SCORE_EMOJIS = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '😄' };
const SCORE_LABELS = { 1: 'Terrible', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' };

export default function MoodPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useMood();
  const [selectedScore, setSelectedScore] = useState(3);
  const [note, setNote] = useState('');
  const [selectedDay, setSelectedDay] = useState(TODAY);

  const week = last7(state, TODAY);
  const avg = average(state);
  const todayLog = state.logs.find(l => l.day === TODAY);

  function logMood() {
    dispatch({ type: 'SET_MOOD', payload: { day: selectedDay, score: selectedScore, note } });
    setNote('');
  }

  function get7DayDates() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() - i);
      result.push(d.toISOString().slice(0, 10));
    }
    return result;
  }

  const days7 = get7DayDates();
  const barMax = 5;

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black tracking-tight text-ink">{t('mood.title', { defaultValue: 'Mood & Wellness' })}</h1>
        <div className="text-center">
          <div className="text-3xl">{todayLog ? SCORE_EMOJIS[todayLog.score] : '?'}</div>
          <div className="text-xs text-muted mt-0.5">{t('mood.today', { defaultValue: "Today's mood" })}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Log mood */}
        <Card>
          <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">{t('mood.logMood', { defaultValue: 'Log Mood' })}</h3>

          <div className="mb-3">
            <label className="text-xs text-muted mb-1 block">{t('mood.date', { defaultValue: 'Date' })}</label>
            <input
              type="date"
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
              className="bg-surface-2 border border-[rgb(var(--ink)/0.12)] text-ink rounded-token-md px-3 py-2 text-sm w-full"
            />
          </div>

          <div className="flex justify-between mb-4">
            {[1, 2, 3, 4, 5].map(score => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                title={SCORE_LABELS[score]}
                className={`flex flex-col items-center gap-1 rounded-token-md px-3 py-2 transition-all duration-200 ${selectedScore === score ? 'bg-grad-hero shadow-neu-sm scale-110' : 'bg-surface-2 hover:bg-surface'}`}
              >
                <span className="text-2xl">{SCORE_EMOJIS[score]}</span>
                <span className={`text-xs font-bold ${selectedScore === score ? 'text-on-brand' : 'text-muted'}`}>{score}</span>
              </button>
            ))}
          </div>

          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('mood.notePlaceholder', { defaultValue: 'Optional note...' })}
            rows={3}
          />
          <Button variant="primary" onClick={logMood} className="mt-3 w-full">{t('mood.log', { defaultValue: 'Log Mood' })}</Button>
        </Card>

        {/* 7-day summary */}
        <Card>
          <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">{t('mood.last7', { defaultValue: 'Last 7 Days' })}</h3>
          <div className="text-3xl font-black text-ink mb-1">{avg > 0 ? avg.toFixed(1) : '—'}</div>
          <div className="text-xs text-muted mb-4">{t('mood.average', { defaultValue: 'Average score' })}</div>

          {/* 7-day bars */}
          <div className="flex items-end gap-1.5 h-20">
            {week.map((log, i) => {
              const date = days7[i];
              const shortDate = date.slice(5); // MM-DD
              return (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <div className="flex items-end justify-center w-full" style={{ height: '60px' }}>
                    {log ? (
                      <div
                        className="w-full rounded-token-sm bg-brand transition-all duration-300"
                        style={{ height: `${(log.score / barMax) * 100}%` }}
                        title={`${date}: ${SCORE_EMOJIS[log.score]} ${log.score}`}
                      />
                    ) : (
                      <div className="w-full rounded-token-sm bg-[rgb(var(--ink)/0.06)]" style={{ height: '15%' }} />
                    )}
                  </div>
                  <span className="text-[9px] text-muted">{shortDate}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Log list */}
      <Card>
        <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">{t('mood.history', { defaultValue: 'History' })}</h3>
        {state.logs.length === 0 ? (
          <EmptyState icon="🌤️" title={t('mood.empty', { defaultValue: 'No mood logs yet' })} />
        ) : (
          <ul className="space-y-2">
            {[...state.logs].sort((a, b) => b.day.localeCompare(a.day)).map(log => (
              <li key={log.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2">
                <span className="text-2xl">{SCORE_EMOJIS[log.score]}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{log.day}</p>
                  {log.note && <p className="text-xs text-muted">{log.note}</p>}
                </div>
                <span className="text-brand font-black text-sm">{log.score}/5</span>
                <button onClick={() => dispatch({ type: 'REMOVE', payload: { day: log.day } })} className="text-muted hover:text-focus text-xs transition-colors duration-200">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
