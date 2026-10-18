import { useContext, useState } from 'react';
import { PreferencesContext } from './PreferencesProvider';
import { DEFAULT_SUBJECTS_VIEW, sanitizeSubjectsView } from './migrate';

// [view, setView] for the Subjects page. Saved with the student's preferences (and so on their account);
// without a provider (a bare page in a test) it just remembers the choice until the page closes.
export function useSubjectsView() {
  const ctx = useContext(PreferencesContext);
  const [local, setLocal] = useState(DEFAULT_SUBJECTS_VIEW);
  if (ctx && ctx.setSubjectsView) return [sanitizeSubjectsView(ctx.subjectsView), ctx.setSubjectsView];
  return [local, (v) => setLocal(sanitizeSubjectsView(v))];
}
