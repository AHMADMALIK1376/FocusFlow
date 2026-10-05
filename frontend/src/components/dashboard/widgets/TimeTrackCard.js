import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Timer } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui';
import { useTimetrack } from '../../../features/timetrack/useTimetrack';
import { formatHMS } from '../../../features/timetrack/timetrackLogic';
import WidgetShell from './WidgetShell';

const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hm = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

// Study time this week as clay columns (one per day), today highlighted.
export default function TimeTrackCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useTimetrack();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (state.running) {
      const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - new Date(state.running.startedAt).getTime()) / 1000)));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [state.running]);

  const week = useMemo(() => {
    const byDay = {};
    for (const e of state.entries) {
      if (!e.start) continue;
      const k = localKey(new Date(e.start));
      byDay[k] = (byDay[k] || 0) + (e.seconds || 0);
    }
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: localKey(d), label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), secs: byDay[localKey(d)] || 0, today: i === 0 });
    }
    return days;
  }, [state.entries]);
  const max = Math.max(1, ...week.map((d) => d.secs));
  const weekTotal = week.reduce((a, d) => a + d.secs, 0);
  const today = week[6].secs + elapsed;

  return (
    <WidgetShell
      icon={Timer}
      title={t('widgets.timetrack', { defaultValue: 'Study time' })}
      linkLabel={t('timetrack.open', { defaultValue: 'Open' })}
      onLink={() => navigate('/time')}
      footer={
        <Button size="sm" variant={state.running ? 'soft' : 'primary'} full onClick={() => navigate('/time')}>
          {state.running ? t('timetrack.manage', { defaultValue: 'Manage timer' }) : t('timetrack.start', { defaultValue: 'Start timer' })}
        </Button>
      }
    >
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{state.running ? `Running · ${state.running.label}` : 'Today'}</p>
          <p className={`text-2xl font-black leading-tight ${state.running ? 'text-brand' : 'text-ink'}`}>{state.running ? formatHMS(elapsed) : hm(today)}</p>
        </div>
        <p className="text-xs text-muted text-right">This week<br /><b className="text-ink">{hm(weekTotal)}</b></p>
      </div>
      <div className="flex items-end justify-between gap-1.5 h-20" aria-label="Study time over the last 7 days">
        {week.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${d.key}: ${hm(d.secs)}`}>
            <div
              className={`w-full max-w-[22px] rounded-t-lg rounded-b-md ${d.secs ? (d.today ? 'bg-grad-sun' : 'bg-grad-hero') : 'bg-surface-2 shadow-neu-inset'} shadow-[inset_0_2px_3px_rgb(255_255_255/0.45)]`}
              style={{ height: d.secs ? `${Math.max(12, (d.secs / max) * 100)}%` : '10%' }}
            />
            <span className={`text-[10px] font-bold ${d.today ? 'text-ink' : 'text-muted'}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
