import { useState, useEffect, useCallback } from 'react';
import { subjectAPI } from '../../services/api';

// Loads + mutates the user's subjects through the API.
export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subjectAPI.getAll();
      setSubjects(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data) => { await subjectAPI.create(data); await refresh(); }, [refresh]);
  const update = useCallback(async (id, data) => { await subjectAPI.update(id, data); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await subjectAPI.remove(id); await refresh(); }, [refresh]);

  return { subjects, loading, error, refresh, create, update, remove };
}
