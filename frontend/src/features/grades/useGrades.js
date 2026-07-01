import { useState, useEffect, useCallback } from 'react';
import { gradeAPI } from '../../services/api';

// Loads + mutates a single subject's grade items through the API.
export function useGrades(subjectId) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!subjectId) { setGrades([]); setLoading(false); return; }
    setLoading(true);
    try {
      setGrades(await gradeAPI.getForSubject(subjectId));
    } catch {
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (d) => { await gradeAPI.create(d); await refresh(); }, [refresh]);
  const update = useCallback(async (id, d) => { await gradeAPI.update(id, d); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await gradeAPI.remove(id); await refresh(); }, [refresh]);

  return { grades, loading, refresh, create, update, remove };
}
