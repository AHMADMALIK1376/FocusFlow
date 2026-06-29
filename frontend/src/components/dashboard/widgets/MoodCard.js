import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState } from '../../ui';
import { useMood } from '../../../features/mood/useMood';
import { last7, average } from '../../../features/mood/moodLogic';

const TODAY = new Date().toISOString().slice(0, 10);
const SCORE_EMOJIS = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '😄' };

export default function MoodCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useMood();

  const week = last7(state, TODAY);
  const avg = average(state);
  const todayLog = state.logs.find(l => l.day === TODAY);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">🌤️ {t('widgets.mood', { defaultValue: 'Mood' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/mood')}>{t('mood.open', { defaultValue: 'Open' })}</Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl">{todayLog ? SCORE_EMOJIS[todayLog.score] : '?'}</div>
        <div>
          <p className="font-black text-ink text-lg">{avg > 0 ? avg.toFixed(1) : '—'}</p>
          <p className="text-xs text-muted">{t('mood.avgScore', { defaultValue: '7-day average' })}</p>
        </div>
      </div>

      {/* 7-day mini trend */}
      <div className="flex items-end gap-1 h-10">
        {week.map((log, i) => (
          <div key={i} className="flex-1 flex items-end justify-center" style={{ height: '40px' }}>
            {log ? (
              <div
                className="w-full rounded-token-sm bg-brand/70"
                style={{ height: `${(log.score / 5) * 100}%` }}
                title={SCORE_EMOJIS[log.score]}
              />
            ) : (
              <div className="w-full rounded-token-sm bg-[rgb(var(--ink)/0.06)]" style={{ height: '15%' }} />
            )}
          </div>
        ))}
      </div>

      {state.logs.length === 0 && (
        <EmptyState icon="🌤️" title={t('mood.empty', { defaultValue: 'No mood logs yet' })} />
      )}

      <div className="mt-3 flex justify-center">
        <Button size="sm" variant="primary" onClick={() => navigate('/mood')} className="w-4/5">
          {t('mood.logToday', { defaultValue: "Log today's mood" })}
        </Button>
      </div>
    </div>
  );
}
