import { useState, useEffect, useCallback, useMemo } from 'react';
import { subjectAPI } from '../../services/api';

// The fields PUT /api/subjects/:id expects — the server clears any it isn't sent.
export const subjectPayload = (s) => ({
  name: s.name,
  code: s.code || null,
  color: s.color || null,
  instructor: s.instructor || null,
  creditHours: s.creditHours ?? 0,
  term: s.term || null,
  targetGrade: s.targetGrade || null,
});

// Loads + mutates the user's subjects through the API. `subjects` are the
// current ones; `archived` are past terms (kept for their grades/attendance).
export function useSubjects() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subjectAPI.getAll();
      setAll(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const subjects = useMemo(() => all.filter((s) => !s.isArchived), [all]);
  const archived = useMemo(() => all.filter((s) => s.isArchived), [all]);

  const create = useCallback(async (data) => { await subjectAPI.create(data); await refresh(); }, [refresh]);
  const update = useCallback(async (id, data) => { await subjectAPI.update(id, data); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await subjectAPI.remove(id); await refresh(); }, [refresh]);
  const setArchived = useCallback(async (s, isArchived) => {
    await subjectAPI.update(s.id, { ...subjectPayload(s), isArchived });
    await refresh();
  }, [refresh]);

  return { subjects, archived, loading, error, refresh, create, update, remove, setArchived };
}
