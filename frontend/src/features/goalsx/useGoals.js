import { useState, useEffect, useCallback } from 'react';
import { goalAPI } from '../../services/api';

// API-backed goals + milestones (migrated from localStorage).
export function useGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setGoals(await goalAPI.getAll());
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createGoal = useCallback(async (title) => { await goalAPI.createGoal({ title }); await refresh(); }, [refresh]);
  const removeGoal = useCallback(async (id) => { await goalAPI.deleteGoal(id); await refresh(); }, [refresh]);
  const createMilestone = useCallback(async (goalId, title) => { await goalAPI.addMilestone(goalId, { title }); await refresh(); }, [refresh]);
  const toggleMilestone = useCallback(async (milestoneId) => { await goalAPI.toggleMilestone(milestoneId); await refresh(); }, [refresh]);
  const removeMilestone = useCallback(async (milestoneId) => { await goalAPI.removeMilestone(milestoneId); await refresh(); }, [refresh]);

  return { state: { goals }, goals, loading, refresh, createGoal, removeGoal, createMilestone, toggleMilestone, removeMilestone };
}
