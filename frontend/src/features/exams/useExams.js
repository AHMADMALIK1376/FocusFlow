import { useState, useEffect, useCallback } from 'react';
import { examAPI } from '../../services/api';

// Loads + mutates exam/deadline items (all, or scoped to one subject).
export function useExams(subjectId) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setExams(subjectId ? await examAPI.getForSubject(subjectId) : await examAPI.getAll());
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (d) => { await examAPI.create(d); await refresh(); }, [refresh]);
  const update = useCallback(async (id, d) => { await examAPI.update(id, d); await refresh(); }, [refresh]);
  const toggle = useCallback(async (id) => { await examAPI.toggle(id); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await examAPI.remove(id); await refresh(); }, [refresh]);

  return { exams, loading, refresh, create, update, toggle, remove };
}
