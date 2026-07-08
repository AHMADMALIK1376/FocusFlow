import { useState, useEffect, useCallback } from 'react';
import { habitAPI } from '../../services/api';

// API-backed study-streak habits (migrated from localStorage). Compat `state`
// keeps the dashboard HabitsCard working (it reads state.habits).
export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setHabits(await habitAPI.getAll());
    } catch {
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addHabit = useCallback(async (name, color) => { await habitAPI.create({ name, color }); await refresh(); }, [refresh]);
  const renameHabit = useCallback(async (id, name) => { await habitAPI.rename(id, { name }); await refresh(); }, [refresh]);
  const removeHabit = useCallback(async (id) => { await habitAPI.remove(id); await refresh(); }, [refresh]);
  const toggleDay = useCallback(async (id, day) => { await habitAPI.toggleDay(id, day); await refresh(); }, [refresh]);

  return { state: { habits }, loading, addHabit, renameHabit, removeHabit, toggleDay, refresh };
}
