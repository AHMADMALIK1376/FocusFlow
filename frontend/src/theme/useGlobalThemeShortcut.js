import { useEffect } from 'react';
import { useTheme } from './useTheme';
import { isEditableTarget } from './isEditableTarget';

/**
 * Mounts a window 'keydown' listener that toggles dark/light mode when the
 * user presses "t" (or "T") — but ONLY outside of editable elements and
 * without modifier keys.
 */
export function useGlobalThemeShortcut() {
  const { toggleMode } = useTheme();

  useEffect(() => {
    function handleKeyDown(e) {
      // Only 't' / 'T'
      if (e.key !== 't' && e.key !== 'T') return;
      // Ignore with modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Ignore auto-repeat
      if (e.repeat) return;
      // Ignore if already handled
      if (e.defaultPrevented) return;
      // Ignore if typing in an editable element
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      toggleMode();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode]);
}
