import React, { useContext } from 'react';
import { PreferencesContext } from '../../preferences/PreferencesProvider';
import { mascotSheets, mascotName } from '../ui/mascots';
import Mascot from './Mascot';

// Shown until the user picks one in the profile card.
export const DEFAULT_MASCOT = 'sloth';

// The user's mascot in a page header: it follows the cursor, no card behind it.
// The sheet has empty margin around the character, so the negative margins keep
// it from making the header taller.
export default function PageMascot({ size = 116 }) {
  // Read the context directly: a missing provider just means the default mascot.
  const prefs = useContext(PreferencesContext);
  const id = mascotSheets(prefs?.profile?.mascot) ? prefs.profile.mascot : DEFAULT_MASCOT;
  const sheets = mascotSheets(id);
  return (
    <div className="shrink-0 -my-6">
      <Mascot directions={sheets.directions} reactions={sheets.reactions} size={size} label={mascotName(id)} />
    </div>
  );
}
