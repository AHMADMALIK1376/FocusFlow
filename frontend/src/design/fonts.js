export const FONT_OPTIONS = [
  { id: 'poppins',     name: 'Poppins',          stack: `'Poppins', sans-serif` },
  { id: 'inter',       name: 'Inter',             stack: `'Inter', system-ui, sans-serif` },
  { id: 'system',      name: 'System',            stack: `system-ui, -apple-system, 'Segoe UI', sans-serif` },
  { id: 'roboto',      name: 'Roboto',            stack: `'Roboto', sans-serif` },
  { id: 'nunito',      name: 'Nunito',            stack: `'Nunito', sans-serif` },
  { id: 'sourceSerif', name: 'Source Serif',      stack: `'Source Serif 4', Georgia, serif` },
  { id: 'jetbrains',   name: 'JetBrains Mono',   stack: `'JetBrains Mono', ui-monospace, monospace` },
];

export const DEFAULT_FONT = 'poppins';

export function fontStack(id) {
  return (FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0]).stack;
}
