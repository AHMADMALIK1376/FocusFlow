import { useState, useEffect, useCallback } from 'react';
import { assignmentAPI } from '../../services/api';
import { EMPTY_STATE } from './kanbanLogic';

// Fixed board columns (To Do / In Progress / Done).
const COLUMNS = EMPTY_STATE.columns;

// API-backed Assignment board (migrated from localStorage Kanban). The compat
// `state:{columns,cards}` keeps the dashboard KanbanCard + cardsByColumn working.
export function useKanban(subjectId) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCards(subjectId ? await assignmentAPI.getForSubject(subjectId) : await assignmentAPI.getAll());
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addCard = useCallback(async (columnId, data) => { await assignmentAPI.create({ columnId, ...data }); await refresh(); }, [refresh]);
  const updateCard = useCallback(async (id, patch) => { await assignmentAPI.update(id, patch); await refresh(); }, [refresh]);
  const removeCard = useCallback(async (id) => { await assignmentAPI.remove(id); await refresh(); }, [refresh]);
  const moveCard = useCallback(async (id, toColumnId, toIndex) => { await assignmentAPI.move(id, { columnId: toColumnId, order: toIndex }); await refresh(); }, [refresh]);

  return { state: { columns: COLUMNS, cards }, loading, addCard, updateCard, removeCard, moveCard, refresh };
}
