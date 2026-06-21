// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { lists: [] };

export function makeId() {
  return `shopping_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeItemId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function listProgress(list) {
  if (!list.items || list.items.length === 0) return { checked: 0, total: 0, pct: 0 };
  const checked = list.items.filter(i => i.checked).length;
  return { checked, total: list.items.length, pct: Math.round((checked / list.items.length) * 100) };
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD_LIST': {
      const { name } = action.payload;
      const list = { id: makeId(), name, items: [] };
      return { ...state, lists: [...state.lists, list] };
    }
    case 'REMOVE_LIST': {
      const { id } = action.payload;
      return { ...state, lists: state.lists.filter(l => l.id !== id) };
    }
    case 'RENAME_LIST': {
      const { id, name } = action.payload;
      return { ...state, lists: state.lists.map(l => l.id === id ? { ...l, name } : l) };
    }
    case 'ADD_ITEM': {
      const { listId, text } = action.payload;
      const item = { id: makeItemId(), text, checked: false };
      return { ...state, lists: state.lists.map(l => l.id === listId ? { ...l, items: [...l.items, item] } : l) };
    }
    case 'TOGGLE_ITEM': {
      const { listId, itemId } = action.payload;
      return {
        ...state,
        lists: state.lists.map(l =>
          l.id === listId
            ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }
            : l
        ),
      };
    }
    case 'REMOVE_ITEM': {
      const { listId, itemId } = action.payload;
      return {
        ...state,
        lists: state.lists.map(l =>
          l.id === listId
            ? { ...l, items: l.items.filter(i => i.id !== itemId) }
            : l
        ),
      };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
