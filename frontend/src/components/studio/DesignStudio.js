import React, {
  useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import {
  Check, CircleCheck, Info, RotateCcw, TriangleAlert, Undo2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useAppTheme } from '../../preferences/useAppTheme';
import { AUTH_EVENT } from '../../services/api';
import { DEFAULT_THEME } from '../../design/theme/theme';
import { deriveTokens } from '../../design/theme/deriveTokens';
import { rgbToHex, tripletToRgb } from '../../design/theme/color';
import {
  PALETTE_GROUPS, PALETTES, SWATCHES, TEXT_SWATCHES,
} from '../../design/theme/palettes';
import {
  isPaletteSelected, readabilityNotes, sameColours, studioReducer, withPalette, withRole,
} from '../../design/theme/studio';
import RolePicker from './RolePicker';
import StudioPreview from './StudioPreview';

const ROLES = [
  { id: 'background', label: 'Background', description: 'The page behind everything. Cards and borders are shaded from it.' },
  { id: 'brand', label: 'Brand', description: 'Buttons, the navbar, the sidebar and highlights.' },
  { id: 'accent', label: 'Accent', description: 'Pills, icon tiles, done states and status badges.' },
  { id: 'text', label: 'Text', description: 'The words on the page and on cards. Auto picks a readable colour for you.' },
];
const SWATCH_ROWS = [
  { label: 'Soft', swatches: SWATCHES.soft },
  { label: 'Bold', swatches: SWATCHES.bold },
  { label: 'Dark', swatches: SWATCHES.dark },
];
const TEXT_ROWS = [
  { label: 'Dark text', swatches: TEXT_SWATCHES.dark },
  { label: 'Light text', swatches: TEXT_SWATCHES.light },
];
const ADVANCED = [
  { id: 'logo', title: 'Logo colour', description: 'The FocusFlow mark in the navbar. Auto keeps the original.', token: '--logo' },
  { id: 'icon', title: 'Icon colour', description: 'The small icon tiles on cards. Auto follows your Accent.', token: '--icon' },
];

const raf = (f) => (window.requestAnimationFrame ? window.requestAnimationFrame(f) : setTimeout(f, 16));
const cancelRaf = (id) => (window.cancelAnimationFrame ? window.cancelAnimationFrame(id) : clearTimeout(id));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const hexOf = (triplet) => rgbToHex(tripletToRgb(triplet));

function Section({ title, subtitle, children }) {
  return (
    <section className="mb-6">
      <h3 className="text-sm font-black text-ink uppercase tracking-wider">{title}</h3>
      <p className="text-sm text-muted mt-1 mb-4">{subtitle}</p>
      {children}
    </section>
  );
}

function PaletteTile({ palette, selected, onPick }) {
  return (
    <button
      type="button"
      aria-label={`${palette.name} palette`}
      aria-pressed={selected}
      onClick={() => onPick(palette)}
      className={[
        'relative text-left rounded-token-md bg-surface-2 p-2 transition-transform motion-reduce:transition-none',
        'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        selected ? 'ring-2 ring-ink' : '',
      ].join(' ')}
    >
      <span aria-hidden="true" className="flex h-9 rounded-token-sm overflow-hidden border border-[rgb(var(--border))]">
        <span className="flex-1" style={{ backgroundColor: palette.background }} />
        <span className="flex-1" style={{ backgroundColor: palette.brand }} />
        <span className="flex-1" style={{ backgroundColor: palette.accent }} />
      </span>
      <span className="block mt-1.5 text-sm font-bold text-ink truncate">{palette.name}</span>
      {selected && (
        <span aria-hidden="true" className="absolute top-1 right-1 w-5 h-5 rounded-full bg-surface text-ink grid place-items-center shadow-neu-sm">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export default function DesignStudio({ open, onClose, onReopen }) {
  const { theme, setTheme, previewTheme } = useAppTheme();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(studioReducer, { draft: theme, past: [] });
  const [role, setRole] = useState('background');
  const [confirming, setConfirming] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const dirty = !sameColours(state.draft, theme);

  // What the notes and the Save button are based on may lag a frame behind the draft.
  const deferred = useDeferredValue(state.draft);
  const result = useMemo(() => deriveTokens(deferred), [deferred]);
  const check = useMemo(() => readabilityNotes(deferred, result), [deferred, result]);

  const wasOpen = useRef(open);
  const closingByUs = useRef(false);
  const reopening = useRef(false);
  const skipPreview = useRef(false);
  const keepRef = useRef(null);
  const wasConfirming = useRef(false);
  const saveRef = useRef(null);
  const pending = useRef(null);
  const frame = useRef(null);
  const dragRole = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const latest = useRef({});
  latest.current = { dirty, theme, onReopen };

  // Open and close. Closing with unsaved changes by some way other than ours (the Back
  // button) puts the Studio back and asks first.
  useEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;
    const { dirty: isDirty, theme: saved, onReopen: reopen } = latest.current;
    if (open) {
      if (reopening.current) {
        reopening.current = false;
        return;
      }
      skipPreview.current = true;
      dispatch({ type: 'open', theme: saved });
      wasConfirming.current = false; // a question left showing when it closed must not steal the new start focus
      setConfirming(false);
      setRole('background');
      setAdvancedOpen(false);
      closingByUs.current = false;
    } else if (!closingByUs.current && isDirty) {
      reopening.current = true;
      setConfirming(true);
      if (reopen) reopen();
    } else {
      previewTheme(null);
    }
  }, [open, previewTheme]);

  // While open, the app behind shows the draft. It is shown again if the saved theme changes
  // underneath (a save, or a change arriving from the server), because that ends a preview.
  useEffect(() => {
    if (!open) return;
    if (skipPreview.current) {
      skipPreview.current = false;
      return;
    }
    previewTheme(state.draft);
  }, [open, state.draft, theme, previewTheme]);

  // Signing out resets the saved colours to the defaults, so a draft built on the old ones is
  // dropped: the Studio starts again from the defaults instead of bringing the old preview back.
  useEffect(() => {
    const onAuth = (e) => {
      if (e.detail && e.detail.signedIn) return;
      dispatch({ type: 'open', theme: { ...DEFAULT_THEME } });
      setConfirming(false);
    };
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, []);

  // A preview can never get stuck: leaving the page ends it.
  useEffect(() => () => previewTheme(null), [previewTheme]);

  // Closing the tab with unsaved changes gets the browser's own question.
  useEffect(() => {
    if (!open || !dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, dirty]);

  // Focus follows the question: into it when it opens, and back to Save when it closes while the
  // Studio stays open (its Keep editing button has just disappeared).
  useEffect(() => {
    if (confirming && keepRef.current) keepRef.current.focus();
    else if (wasConfirming.current && !confirming && saveRef.current) saveRef.current.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  // A server update that lands while the draft is untouched becomes the new starting point,
  // so Save cannot overwrite it and Escape does not ask about changes nobody made.
  const prevTheme = useRef(theme);
  useEffect(() => {
    const before = prevTheme.current;
    prevTheme.current = theme;
    if (open && before !== theme && stateRef.current.past.length === 0 && sameColours(stateRef.current.draft, before)) {
      dispatch({ type: 'open', theme });
    }
  }, [theme, open]);

  // Never dispatch after unmount.
  useEffect(() => () => {
    if (frame.current !== null) cancelRaf(frame.current);
  }, []);

  const commit = useCallback((next, msg, merge = false) => {
    dispatch({ type: 'change', draft: next, merge });
    setAnnounce(msg);
  }, []);
  const change = (next, msg) => {
    dragRole.current = null;
    commit(next, msg, false);
  };

  const onDrag = useCallback((r, hex) => {
    pending.current = { role: r, hex };
    if (frame.current !== null) return;
    frame.current = raf(() => {
      frame.current = null;
      const p = pending.current;
      pending.current = null;
      if (!p) return;
      const merge = dragRole.current === p.role;
      dragRole.current = p.role;
      const next = withRole(stateRef.current.draft, p.role, p.hex);
      commit(next, `${cap(p.role)} set to ${next[p.role] || p.hex}`, merge);
    });
  }, [commit]);
  const onDragEnd = useCallback(() => { dragRole.current = null; }, []);

  const finish = () => {
    closingByUs.current = true;
    previewTheme(null);
    onClose();
  };
  const requestClose = () => {
    if (confirming) setConfirming(false);
    else if (dirty) setConfirming(true);
    else finish();
  };
  const save = () => {
    const live = stateRef.current.draft;
    if (readabilityNotes(live, deriveTokens(live)).status === 'unreadable') return;
    if (setTheme(live) === false) return;
    closingByUs.current = true;
    toast('Colours saved', { tone: 'success' });
    onClose();
  };
  const undo = () => {
    if (stateRef.current.past.length === 0) return;
    dragRole.current = null;
    dispatch({ type: 'undo' });
    setAnnounce('Undid the last change');
  };

  const pickPalette = (palette) => {
    if (isPaletteSelected(state.draft, palette)) return;
    change(withPalette(state.draft, palette), `${palette.name} palette applied`);
  };
  const pickRole = (r, value) => {
    const next = withRole(state.draft, r, value);
    change(next, value === 'auto' ? `${cap(r)} set to Auto` : `${cap(r)} set to ${next[r]}`);
  };

  const draft = state.draft;
  const valueOf = (r) => (r === 'logo' || r === 'icon' ? draft[r] || 'auto' : draft[r]);
  const autoHexOf = (token) => hexOf(result.tokens[token]);
  const unreadable = check.status === 'unreadable';
  const current = ROLES.find((r) => r.id === role);

  let StatusIcon = Info;
  let statusText = null;
  if (check.status === 'default') statusText = 'These are the original FocusFlow colours.';
  else if (check.status === 'clear') { StatusIcon = CircleCheck; statusText = 'Everything reads clearly. No tweaks needed.'; }
  else if (unreadable) { StatusIcon = TriangleAlert; statusText = "This mix can't be made readable. Try a different background or text colour."; }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title="Design your dashboard"
      showClose
      trapFocus
      fullHeightOnMobile
      maxWidthClassName="max-w-4xl"
      className="scroll-pb-40"
    >
      <p className="text-sm text-muted -mt-2 mb-5">
        Pick a palette or mix your own. The app behind this window changes as you go, and nothing is saved until you press Save.
      </p>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="order-first md:order-none md:col-start-2 md:row-start-1 md:sticky md:top-0 self-start">
          <StudioPreview />
        </div>

        <div className="min-w-0 md:col-start-1 md:row-start-1">
          <Section title="Ready-made palettes" subtitle="Hand-picked sets that are easy to read.">
            {PALETTE_GROUPS.map((g) => (
              <div key={g.id} className="mb-4 last:mb-0">
                <h4 className="text-sm font-black text-ink">{g.name}</h4>
                <p className="text-xs text-muted mb-2">{g.blurb}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PALETTES.filter((p) => p.group === g.id).map((p) => (
                    <PaletteTile key={p.id} palette={p} selected={isPaletteSelected(draft, p)} onPick={pickPalette} />
                  ))}
                </div>
              </div>
            ))}
          </Section>

          <Section title="Your colours" subtitle="Fine-tune each part. Tap a swatch or enter any colour.">
            <div role="group" aria-label="Choose what to colour" className="flex flex-wrap gap-2 mb-4">
              {ROLES.map((r) => (
                <Button
                  key={r.id}
                  type="button"
                  size="sm"
                  variant={r.id === role ? 'primary' : 'neu'}
                  aria-pressed={r.id === role}
                  onClick={() => setRole(r.id)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <RolePicker
              key={role}
              role={role}
              title={current.label}
              description={current.description}
              value={valueOf(role)}
              autoAllowed={role === 'text'}
              autoHex={autoHexOf('--ink')}
              rows={role === 'text' ? TEXT_ROWS : SWATCH_ROWS}
              onPick={(v) => pickRole(role, v)}
              onDrag={(hex) => onDrag(role, hex)}
              onDragEnd={onDragEnd}
            />
          </Section>

          <details
            className="mb-6 rounded-token-md bg-surface-2 p-3"
            onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer py-2 text-sm font-bold text-ink">Advanced: logo and icon colours</summary>
            {advancedOpen && (
              <div className="mt-4 space-y-6">
                {ADVANCED.map((a) => (
                  <RolePicker
                    key={a.id}
                    role={a.id}
                    title={a.title}
                    description={a.description}
                    value={valueOf(a.id)}
                    autoAllowed
                    autoHex={autoHexOf(a.token)}
                    rows={SWATCH_ROWS}
                    onPick={(v) => pickRole(a.id, v)}
                    onDrag={(hex) => onDrag(a.id, hex)}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            )}
          </details>

          <section role="status" className="rounded-token-md bg-surface-2 p-4 mb-2">
            <h3 className="text-sm font-black text-ink uppercase tracking-wider mb-2">Readability check</h3>
            {statusText && (
              <p className="flex items-start gap-2 text-sm text-ink">
                <StatusIcon size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{statusText}</span>
              </p>
            )}
            {check.notes.length > 0 && (
              <ul className="space-y-1.5">
                {check.notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 text-sm text-ink">
                    {n.id === 'logo'
                      ? <TriangleAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                      : <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />}
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">{announce}</div>

      <div className="sticky -bottom-6 -mx-6 -mb-6 px-6 py-3 bg-surface border-t border-[rgb(var(--border)/0.5)] flex flex-wrap gap-2 justify-end">
        {confirming ? (
          <>
            <div role="alert" className="basis-full">
              <p className="text-sm font-black text-ink">Unsaved changes</p>
              <p className="text-sm text-muted">You changed your colours but haven&apos;t saved them.</p>
            </div>
            <Button type="button" variant="primary" size="sm" disabled={unreadable} onClick={save}>Save and close</Button>
            <Button type="button" variant="neu" size="sm" onClick={finish}>Discard changes</Button>
            <Button type="button" variant="ghost" size="sm" ref={keepRef} onClick={() => setConfirming(false)}>Keep editing</Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-disabled={state.past.length === 0}
              className="aria-disabled:opacity-50 aria-disabled:pointer-events-none"
              onClick={undo}
            >
              <Undo2 size={15} aria-hidden="true" /> Undo
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => change({ ...DEFAULT_THEME }, 'Back to FocusFlow colours')}>
              <RotateCcw size={15} aria-hidden="true" /> Reset to FocusFlow colours
            </Button>
            <Button type="button" variant="neu" size="sm" onClick={finish}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" ref={saveRef} disabled={unreadable} onClick={save}>Save</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
