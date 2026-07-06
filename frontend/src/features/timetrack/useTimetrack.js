import { useState, useEffect, useCallback } from 'react';
import { studyHoursAPI } from '../../services/api';

// API-backed study hours. The running stopwatch stays client-side (ephemeral);
// only completed sessions persist. Compat `state` keeps the dashboard card working.
export function useTimetrack() {
  const [entries, setEntries] = useState([]);
  const [running, setRunning] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await studyHoursAPI.getAll());
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const start = useCallback((label) => { setRunning({ label, startedAt: new Date().toISOString() }); }, []);

  const stop = useCallback(async (nowIso) => {
    if (!running) return;
    const secs = Math.max(0, Math.round((new Date(nowIso).getTime() - new Date(running.startedAt).getTime()) / 1000));
    setRunning(null);
    await studyHoursAPI.create({ label: running.label, seconds: secs, start: running.startedAt, end: nowIso });
    await refresh();
  }, [running, refresh]);

  const removeEntry = useCallback(async (id) => { await studyHoursAPI.remove(id); await refresh(); }, [refresh]);

  return { state: { running, entries }, loading, start, stop, removeEntry, refresh };
}
