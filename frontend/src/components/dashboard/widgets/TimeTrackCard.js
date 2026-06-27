import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui';
import { useTimetrack } from '../../../features/timetrack/useTimetrack';
import { totalSeconds, formatHMS } from '../../../features/timetrack/timetrackLogic';

export default function TimeTrackCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useTimetrack();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const total = totalSeconds(state);

  useEffect(() => {
    if (state.running) {
      const tick = () => {
        const startMs = new Date(state.running.startedAt).getTime();
        setElapsed(Math.max(0, Math.round((Date.now() - startMs) / 1000)));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [state.running]);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">⏲️ {t('widgets.timetrack', { defaultValue: 'Time Tracker' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/time')}>{t('timetrack.open', { defaultValue: 'Open' })}</Button>
      </div>

      {state.running ? (
        <div className="text-center py-2">
          <div className="text-3xl font-black text-brand tracking-tight">{formatHMS(elapsed)}</div>
          <p className="text-muted text-sm mt-1">{state.running.label}</p>
          <p className="text-xs text-muted mt-0.5">{t('timetrack.running', { defaultValue: 'Timer running...' })}</p>
        </div>
      ) : (
        <div className="text-center py-2">
          <div className="text-3xl font-black text-ink tracking-tight">{formatHMS(total)}</div>
          <p className="text-muted text-sm mt-1">{t('timetrack.totalTracked', { defaultValue: 'Total tracked' })}</p>
          <p className="text-xs text-muted">{state.entries.length} {t('timetrack.sessions', { defaultValue: 'sessions' })}</p>
        </div>
      )}

      <Button size="sm" variant="soft" onClick={() => navigate('/time')} className="mt-3">
        {state.running ? t('timetrack.manage', { defaultValue: 'Manage timer' }) : t('timetrack.start', { defaultValue: 'Start Timer' })}
      </Button>
    </div>
  );
}
