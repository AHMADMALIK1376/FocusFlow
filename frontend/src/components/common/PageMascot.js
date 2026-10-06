import React, { useContext } from 'react';
import { PreferencesContext } from '../../preferences/PreferencesProvider';
import { cx } from '../ui/cx';
import { mascotSrc } from '../ui/mascots';

// Shown until the user picks one in the profile card.
export const DEFAULT_MASCOT = 'sloth';

// The user's mascot, small, in a page header. No card behind it.
export default function PageMascot({ className = '' }) {
  // Read the context directly: a missing provider just means the default mascot.
  const prefs = useContext(PreferencesContext);
  const src = mascotSrc(prefs?.profile?.mascot) || mascotSrc(DEFAULT_MASCOT);
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cx('h-12 sm:h-16 w-auto object-contain shrink-0 select-none pointer-events-none', className)}
    />
  );
}
