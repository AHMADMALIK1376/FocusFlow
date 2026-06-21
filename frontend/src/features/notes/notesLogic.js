// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { notes: [] };

export function makeId() {
  return `notes_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Markdown-lite inline renderer — returns an array of React-safe segments.
 * Pure function, no imports.
 * Handles: **bold**, *italic*, # heading (line-start), - list item (line-start)
 */
export function renderInline(text) {
  if (!text) return [];
  // Split into segments: [{ type, content }]
  const segments = [];
  // Process line by line
  const lines = text.split('\n');
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) segments.push({ type: 'br', content: '' });
    // Check heading
    if (/^#{1,3}\s/.test(line)) {
      segments.push({ type: 'heading', content: line.replace(/^#{1,3}\s/, '') });
      return;
    }
    // Check list item
    if (/^-\s/.test(line)) {
      segments.push({ type: 'li', content: line.slice(2) });
      return;
    }
    // Inline bold/italic
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    parts.forEach((part) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        segments.push({ type: 'bold', content: part.slice(2, -2) });
      } else if (/^\*[^*]+\*$/.test(part)) {
        segments.push({ type: 'italic', content: part.slice(1, -1) });
      } else if (part) {
        segments.push({ type: 'text', content: part });
      }
    });
  });
  return segments;
}

export function selectSorted(state) {
  return [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD': {
      const { title, body } = action.payload;
      const note = { id: makeId(), title, body, updatedAt: new Date().toISOString() };
      return { ...state, notes: [note, ...state.notes] };
    }
    case 'UPDATE': {
      const { id, patch } = action.payload;
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
        ),
      };
    }
    case 'REMOVE': {
      const { id } = action.payload;
      return { ...state, notes: state.notes.filter(n => n.id !== id) };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
