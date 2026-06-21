// Tiny className combiner (no dependency). Filters falsy, joins with spaces.
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
