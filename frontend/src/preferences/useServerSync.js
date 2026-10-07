// Keeps a student's preferences (dashboard layout, workspace name, profile, mascot)
// on their account, so they follow them to any browser or phone.
//
//  - On sign-in the account's copy wins. If the account has none yet, whatever this
//    browser already has is uploaded (so an existing layout is not lost).
//  - Changes are saved a moment after the last edit, and straight away if the tab is
//    hidden or closed.
//  - Nothing is sent until the first load for this sign-in has finished, so a fresh
//    browser can never overwrite the saved copy with defaults.
//  - On sign-out the browser's copy is reset, so the next person on this computer
//    neither sees nor uploads it.
// If the server is unreachable the app keeps working from this browser's copy.
import { useCallback, useEffect, useRef } from 'react';
import { prefsAPI, getToken, AUTH_EVENT } from '../services/api';
import { migratePreferences } from './migrate';
import storage from '../storage/storageAdapter';

export const SAVE_DELAY_MS = 1500;
export const RETRY_DELAY_MS = 20000; // the free server may be waking up
const MAX_RETRIES = 3;
const BIG_PICTURE = 60000; // a pasted-in photo this large is not uploaded (mascots are tiny)

// What goes to the server: the state, minus very large inline photos.
export function forServer(state) {
  const profile = state && state.profile;
  const url = profile && profile.avatarUrl;
  if (typeof url === 'string' && url.startsWith('data:') && url.length > BIG_PICTURE) {
    const { avatarUrl, ...rest } = profile; // eslint-disable-line no-unused-vars
    return { ...state, profile: rest };
  }
  return state;
}

export function useServerSync(state, setState, storageKey) {
  const ready = useRef(false);          // first load for this sign-in is done
  const lastSent = useRef(null);        // JSON of what the server holds (as far as we know)
  const timer = useRef(null);
  const retryTimer = useRef(null);
  const retries = useRef(0);
  const latest = useRef(state);
  latest.current = state;

  const send = useCallback(async (keepalive = false) => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!ready.current || !getToken()) return;
    const payload = forServer(latest.current);
    const json = JSON.stringify(payload);
    if (json === lastSent.current) return;
    try {
      await prefsAPI.save(payload, keepalive ? { keepalive: true } : {});
      lastSent.current = json;
    } catch { /* offline or asleep: the next change tries again */ }
  }, []);

  const pull = useCallback(async () => {
    clearTimeout(retryTimer.current);
    if (!getToken()) return;
    ready.current = false;
    try {
      const { data } = await prefsAPI.get();
      if (data && typeof data === 'object') {
        const next = migratePreferences(data);
        lastSent.current = JSON.stringify(forServer(next));
        setState(next);
        ready.current = true;
        retries.current = 0;
      } else {
        lastSent.current = null;        // nothing saved yet: upload what this browser has
        ready.current = true;
        retries.current = 0;
        send();
      }
    } catch {
      // Offline or the server is waking up: keep working from this browser's copy
      // and try again a few times.
      if (retries.current < MAX_RETRIES) {
        retries.current += 1;
        retryTimer.current = setTimeout(pull, RETRY_DELAY_MS);
      }
    }
  }, [send, setState]);

  // Load on start (if already signed in) and whenever this browser signs in or out.
  useEffect(() => {
    pull();
    const onAuth = (e) => {
      if (e.detail && e.detail.signedIn) {
        pull();
      } else {
        clearTimeout(timer.current);
        clearTimeout(retryTimer.current);
        timer.current = null;
        ready.current = false;
        lastSent.current = null;
        retries.current = 0;
        storage.remove(storageKey);
        setState(migratePreferences(null));
      }
    };
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      clearTimeout(retryTimer.current);
    };
  }, [pull, setState, storageKey]);

  // Save a moment after the last change.
  useEffect(() => {
    if (!ready.current) return undefined;
    if (JSON.stringify(forServer(state)) === lastSent.current) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(), SAVE_DELAY_MS);
    return () => clearTimeout(timer.current);
  }, [state, send]);

  // Don't lose the last edit when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') send(true); };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [send]);
}
