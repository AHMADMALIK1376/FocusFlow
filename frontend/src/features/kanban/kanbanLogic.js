// Pure reducer/helpers — no React, no storage, import-safe for Jest.

const DEFAULT_COLUMNS = [
  { id: 'col-todo', title: 'To Do' },
  { id: 'col-doing', title: 'In Progress' },
  { id: 'col-done', title: 'Done' },
];

export const EMPTY_STATE = { columns: DEFAULT_COLUMNS, cards: [] };

export function makeId() {
  return `kanban_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function cardsByColumn(state, columnId) {
  return [...state.cards.filter(c => c.columnId === columnId)].sort((a, b) => a.order - b.order);
}

export function moveCard(state, id, toColumnId, toIndex) {
  // Remove card from current position, place at toIndex in toColumn
  const card = state.cards.find(c => c.id === id);
  if (!card) return state;
  const colCards = cardsByColumn(state, toColumnId).filter(c => c.id !== id);
  colCards.splice(toIndex, 0, { ...card, columnId: toColumnId });
  // Re-assign order
  const reordered = colCards.map((c, i) => ({ ...c, order: i }));
  const otherCards = state.cards.filter(c => c.columnId !== toColumnId && c.id !== id);
  return { ...state, cards: [...otherCards, ...reordered] };
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD_CARD': {
      const { columnId, title } = action.payload;
      const colCards = cardsByColumn(state, columnId);
      const card = { id: makeId(), columnId, title, note: '', order: colCards.length };
      return { ...state, cards: [...state.cards, card] };
    }
    case 'UPDATE_CARD': {
      const { id, patch } = action.payload;
      return { ...state, cards: state.cards.map(c => c.id === id ? { ...c, ...patch } : c) };
    }
    case 'REMOVE_CARD': {
      const { id } = action.payload;
      return { ...state, cards: state.cards.filter(c => c.id !== id) };
    }
    case 'MOVE_CARD': {
      const { id, toColumnId, toIndex } = action.payload;
      return moveCard(state, id, toColumnId, toIndex);
    }
    case 'ADD_COLUMN': {
      const { title } = action.payload;
      const col = { id: makeId(), title };
      return { ...state, columns: [...state.columns, col] };
    }
    case 'RENAME_COLUMN': {
      const { id, title } = action.payload;
      return { ...state, columns: state.columns.map(c => c.id === id ? { ...c, title } : c) };
    }
    case 'REMOVE_COLUMN': {
      const { id } = action.payload;
      return {
        ...state,
        columns: state.columns.filter(c => c.id !== id),
        cards: state.cards.filter(c => c.columnId !== id),
      };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
