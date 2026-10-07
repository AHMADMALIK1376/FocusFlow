import React from 'react';
import { BookOpen } from 'lucide-react';
import ThemedMark from '../common/ThemedMark';
import { useActiveTheme } from '../../preferences/useActiveTheme';

// A small static mock of the app. It uses the real tokens, so while the Studio previews a
// draft, it shows the draft. Nothing in it can be clicked.
export default function StudioPreview() {
  const t = useActiveTheme();
  const logoFill = t && t.logo ? 'rgb(var(--logo))' : null;
  return (
    <div>
      <h3 className="text-sm font-black text-ink uppercase tracking-wider mb-2">Preview</h3>
      <p className="sr-only">A small preview of your colours.</p>
      <div aria-hidden="true" className="rounded-token-lg bg-canvas p-3 border border-[rgb(var(--border)/0.5)]">
        <div className="bg-grad-hero text-on-brand rounded-token-md h-10 px-3 flex items-center gap-2 shadow-clay-brand">
          <ThemedMark src="/logo/focusflow-mark.png" fill={logoFill} className="w-5 h-5 object-contain shrink-0" />
          <span className="font-black text-sm">FocusFlow</span>
        </div>
        <div className="bg-surface shadow-neu-sm rounded-token-md p-3 mt-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-grad-sage text-icon grid place-items-center shadow-neu-sm">
              <BookOpen size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-ink">Today</p>
              <p className="text-sm text-ink">Data Structures, 9:00 AM</p>
              <p className="text-xs text-muted">Room 204</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sage text-on-sage text-xs font-bold">Done</span>
            <span className="px-3 py-1 rounded-token-sm bg-grad-hero text-on-brand text-xs font-black">Start focus</span>
          </div>
        </div>
      </div>
    </div>
  );
}
