// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { contacts: [] };

export function makeId() {
  return `contacts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function search(state, query) {
  if (!query) return state.contacts;
  const q = query.toLowerCase();
  return state.contacts.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.role || '').toLowerCase().includes(q) ||
    (c.tags || []).some(t => t.toLowerCase().includes(q))
  );
}

export function allTags(state) {
  const tags = new Set();
  for (const c of state.contacts) {
    for (const t of (c.tags || [])) tags.add(t);
  }
  return [...tags];
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD': {
      const { name, role, phone, email, tags } = action.payload;
      const contact = { id: makeId(), name, role: role || '', phone: phone || '', email: email || '', tags: tags || [], createdAt: new Date().toISOString() };
      return { ...state, contacts: [contact, ...state.contacts] };
    }
    case 'UPDATE': {
      const { id, patch } = action.payload;
      return { ...state, contacts: state.contacts.map(c => c.id === id ? { ...c, ...patch } : c) };
    }
    case 'REMOVE': {
      const { id } = action.payload;
      return { ...state, contacts: state.contacts.filter(c => c.id !== id) };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
