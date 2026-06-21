import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, EmptyState } from '../components/ui';
import { useTimetrack } from '../features/timetrack/useTimetrack';
import { totalSeconds, totalsByLabel, formatHMS } from '../features/timetrack/timetrackLogic';

export default function TimeTrackPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useTimetrack();
  const [label, setLabel] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  // Tick elapsed when running
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

  function startTimer() {
    if (!label.trim()) return;
    dispatch({ type: 'START', payload: { label: label.trim() } });
  }

  function stopTimer() {
    dispatch({ type: 'STOP', payload: { now: new Date().toISOString() } });
    setLabel('');
  }

  const total = totalSeconds(state);
  const byLabel = totalsByLabel(state);
  const labelEntries = Object.entries(byLabel).sort((a, b) => b[1] - a[1]);
  const maxSecs = labelEntries.length > 0 ? labelEntries[0][1] : 1;

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-black tracking-tight text-ink mb-8">{t('timetrack.title', { defaultValue: 'Time Tracker' })}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Timer control */}
        <Card>
          <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">{t('timetrack.timer', { defaultValue: 'Timer' })}</h3>
          {state.running ? (
            <div className="text-center space-y-4">
              <div className="text-5xl font-black text-brand tracking-tight">{formatHMS(elapsed)}</div>
              <p className="text-muted text-sm">{state.running.label}</p>
              <Button variant="danger" onClick={stopTimer}>{t('timetrack.stop', { defaultValue: 'Stop' })}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={t('timetrack.labelPlaceholder', { defaultValue: 'What are you working on?' })}
                onKeyDown={e => e.key === 'Enter' && startTimer()}
              />
              <Button variant="primary" onClick={startTimer} disabled={!label.trim()}>
                {t('timetrack.start', { defaultValue: 'Start Timer' })}
              </Button>
            </div>
          )}
        </Card>

        {/* Totals */}
        <Card>
          <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">{t('timetrack.totals', { defaultValue: 'All-time Total' })}</h3>
          <div className="text-4xl font-black text-ink tracking-tight mb-2">{formatHMS(total)}</div>
          <p className="text-muted text-sm">{state.entries.length} {t('timetrack.sessions', { defaultValue: 'sessions' })}</p>

          {/* By label bars */}
          {labelEntries.length > 0 && (
            <div className="mt-4 space-y-2">
              {labelEntries.slice(0, 5).map(([lbl, secs]) => (
                <div key={lbl}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-ink truncate max-w-[70%]">{lbl}</span>
                    <span className="text-muted">{formatHMS(secs)}</span>
                  </div>
                  <div className="bg-surface-2 rounded-token-sm h-1.5">
                    <div className="bg-brand h-1.5 rounded-token-sm" style={{ width: `${(secs / maxSecs) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Entry history */}
      <Card>
        <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-4">{t('timetrack.history', { defaultValue: 'History' })}</h3>
        {state.entries.length === 0 ? (
          <EmptyState icon="⏲️" title={t('timetrack.empty', { defaultValue: 'No sessions yet' })} />
        ) : (
          <ul className="space-y-2">
            {state.entries.map(e => (
              <li key={e.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2">
                <span className="flex-1 text-sm text-ink font-bold">{e.label}</span>
                <span className="text-muted text-xs">{e.start?.slice(0, 10)}</span>
                <span className="text-brand text-sm font-black">{formatHMS(e.seconds)}</span>
                <button onClick={() => dispatch({ type: 'REMOVE_ENTRY', payload: { id: e.id } })} className="text-muted hover:text-focus text-xs transition-colors duration-200">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
