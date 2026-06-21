/**
 * Returns true if the given DOM element is an editable target where
 * global keyboard shortcuts should NOT fire.
 */
export function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
}
