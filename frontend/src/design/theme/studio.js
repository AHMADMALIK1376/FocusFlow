// Pure helpers for the Design Studio (no React): hex cleaning, draft edits, the undo
// reducer, and the plain-English readability notes built from the guard's flags.
import { isDefaultPalette, sanitizeTheme } from './theme';
import { contrastFailures } from './deriveTokens';
import { contrastRatio, hexToRgb, relativeLuminance, tripletToRgb } from './color';
import { paletteTheme } from './palettes';

export const UNDO_LIMIT = 20;

const COLOUR_KEYS = ['background', 'brand', 'accent', 'text', 'logo', 'icon'];

// '#EC706D', 'ec706d', ' #abc ' -> '#RRGGBB' (uppercase), or null when it is not a colour code.
export function normalizeHex(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(s)) return null;
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length !== 6) return null;
  return `#${s.toUpperCase()}`;
}

// Same colours (the preset name does not matter; a missing logo/icon means Auto).
export function sameColours(a, b) {
  const x = sanitizeTheme(a);
  const y = sanitizeTheme(b);
  if (!x || !y) return !x && !y;
  return COLOUR_KEYS.every((k) => x[k] === y[k]);
}

export function withPalette(draft, palette) {
  return paletteTheme(palette);
}

// Change one colour. value is 'auto' or a hex. Returns the same object when nothing can change.
export function withRole(draft, role, value) {
  if (!COLOUR_KEYS.includes(role)) return draft;
  const auto = value === 'auto';
  const hex = auto ? null : normalizeHex(value);
  if (!auto && !hex) return draft;
  if (auto && ['background', 'brand', 'accent'].includes(role)) return draft;
  const next = { ...draft, presetId: 'custom' };
  if (auto) {
    if (role === 'text') next.text = 'auto';
    else delete next[role];
  } else {
    next[role] = hex;
  }
  return next;
}

export function isPaletteSelected(draft, palette) {
  const t = sanitizeTheme(draft);
  return !!t
    && t.background === palette.background
    && t.brand === palette.brand
    && t.accent === palette.accent
    && t.text === palette.text
    && !('logo' in t)
    && !('icon' in t);
}

// How the guard's flags are grouped into sentences, in display order.
export const FLAG_GROUPS = [
  { id: 'text', tokens: ['--ink', '--muted', '--ink-strong'] },
  { id: 'buttons', tokens: ['--on-brand', '--grad-hero'] },
  { id: 'pills', tokens: ['--on-sage', '--grad-sage', '--grad-sage-deep'] },
  { id: 'cards', tokens: ['--surface', '--surface-2', '--highlight', '--blush', '--grad-blush', '--grad-sage-card', '--note-1', '--note-2', '--note-3', '--note-4'] },
  { id: 'icons', tokens: ['--sage-deep', '--icon', '--chart-label', '--chart-axis'] },
  { id: 'status', tokens: ['--success', '--info', '--focus', '--warn', '--warn-ink'] },
];

const lum = (triplet) => relativeLuminance(tripletToRgb(triplet));

// result = deriveTokens(draft). status: default | clear | adjusted | unreadable.
export function readabilityNotes(draft, result) {
  if (isDefaultPalette(draft)) return { status: 'default', notes: [] };
  if (contrastFailures(result.tokens).length > 0) return { status: 'unreadable', notes: [] };

  const flags = result.flags || [];
  const known = FLAG_GROUPS.flatMap((g) => g.tokens);
  const has = (group) => group.tokens.some((t) => flags.includes(t));
  const notes = [];
  const darkerOrLighter = (token, chosen) => (lum(result.tokens[token]) < relativeLuminance(hexToRgb(chosen)) ? 'darker' : 'lighter');

  FLAG_GROUPS.forEach((group) => {
    if (!has(group)) return;
    let text;
    if (group.id === 'text') {
      text = flags.includes('--ink') && /^#/.test(draft.text)
        ? `We made your text a little ${darkerOrLighter('--ink', draft.text)} so it stays readable.`
        : 'We tuned the text shades so everything stays readable on your background.';
    } else if (group.id === 'buttons') {
      text = "Button and navbar labels got a clearer shade so they're easy to read.";
    } else if (group.id === 'pills') {
      text = "Labels on pills and done states got a clearer shade so they're easy to read.";
    } else if (group.id === 'cards') {
      text = 'We nudged a few card shades so text on them stays readable.';
    } else if (group.id === 'icons') {
      text = flags.includes('--icon') && draft.icon
        ? `We made your icon colour a little ${darkerOrLighter('--icon', draft.icon)} so icons stay visible.`
        : 'Icons and chart labels got a little stronger so they stand out.';
    } else {
      text = 'Status colours (done, info, warnings) got a small tweak so they show up on your background.';
    }
    notes.push({ id: group.id, text });
  });
  if (flags.some((f) => !known.includes(f))) {
    notes.push({ id: 'other', text: 'We adjusted a few shades so everything stays readable.' });
  }
  if (draft.logo && contrastRatio(hexToRgb(draft.logo), hexToRgb(draft.brand)) < 3) {
    notes.push({ id: 'logo', text: 'Your logo colour is hard to see on your Brand colour. A lighter or darker shade will stand out more.' });
  }
  return { status: notes.length ? 'adjusted' : 'clear', notes };
}

// state { draft, past }. Actions: open, change (draft, merge), undo.
export function studioReducer(state, action) {
  switch (action.type) {
    case 'open':
      return { draft: action.theme, past: [] };
    case 'change': {
      const cur = state.draft;
      const next = action.draft;
      if (sameColours(next, cur) && next.presetId === cur.presetId) return state;
      const past = action.merge ? state.past : [...state.past, cur].slice(-UNDO_LIMIT);
      return { draft: next, past };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      return { draft: state.past[state.past.length - 1], past: state.past.slice(0, -1) };
    }
    default:
      return state;
  }
}
