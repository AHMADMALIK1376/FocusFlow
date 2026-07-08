import { useState, useEffect, useCallback } from 'react';
import { noteAPI } from '../../services/api';

// API-backed notes (migrated from localStorage). Returns notes sorted by the
// server (pinned first, then most-recently-updated).
export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await noteAPI.getAll());
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (d) => { const r = await noteAPI.create(d); await refresh(); return r.id; }, [refresh]);
  const update = useCallback(async (id, d) => { await noteAPI.update(id, d); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await noteAPI.remove(id); await refresh(); }, [refresh]);

  return { state: { notes }, notes, loading, refresh, create, update, remove };
}
