import React, { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap, RefreshCw, Unplug } from "lucide-react";
import { lmsAPI } from "../../services/api";
import { Button } from "../../components/ui";
import { buildLaunchUrl, keyFromAddress, MANUAL_SCHEME, randomPassport, registerHandler, summarizeSync } from "./lmsLink";

const when = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "not yet";
};

// Settings > University LMS: connect, see when it last synced, sync now, disconnect.
export default function LmsConnectCard() {
  const [status, setStatus] = useState(null); // null while loading
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [passport] = useState(() => randomPassport());
  const returned = useRef(false);

  const refresh = useCallback(async () => {
    try { setStatus(await lmsAPI.status()); } catch (e) { setStatus({ available: false }); }
  }, []);

  const connect = useCallback(async (pasted) => {
    setBusy(true); setError(""); setNote("");
    try {
      const r = await lmsAPI.connect(pasted);
      setText("");
      setNote(summarizeSync(r && r.result) || "Connected.");
    } catch (e) {
      setError(e.message || "Could not connect. Try again.");
    } finally {
      setBusy(false);
      refresh();
    }
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  // Let the browser send the LMS sign-in result back to FocusFlow (it may ask once; the manual way still works without it).
  useEffect(() => { registerHandler(window.location.origin); }, []);

  // Coming back from the LMS sign-in: the key is in the address. Use it once, then wipe it from the address.
  useEffect(() => {
    if (returned.current) return;
    const key = keyFromAddress(window.location.search, window.location.hash);
    if (!key) return;
    returned.current = true;
    window.history.replaceState(null, "", window.location.pathname + "?open=lms");
    connect(key);
  }, [connect]);

  async function syncNow() {
    setBusy(true); setError(""); setNote("");
    try {
      const r = await lmsAPI.sync(true);
      const res = r && r.result;
      setNote(res && res.skipped === "recent" ? "Just synced a moment ago." : summarizeSync(res) || "Done.");
    } catch (e) {
      setError(e.message || "Could not sync.");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function disconnect() {
    setBusy(true); setError(""); setNote("");
    try {
      await lmsAPI.disconnect();
      setConfirming(false);
      setNote("Disconnected. Your subjects and assignments stay.");
    } catch (e) {
      setError(e.message || "Could not disconnect.");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  if (!status) return <p className="text-sm text-muted">Loading...</p>;
  if (!status.available) {
    return <p className="text-sm text-muted">Connecting to your university LMS is not switched on for this server yet.</p>;
  }

  const signIn = buildLaunchUrl(status.site, passport);
  const signInManual = buildLaunchUrl(status.site, passport, MANUAL_SCHEME);
  const needsConnect = !status.connected || status.needsReconnect;

  return (
    <div className="text-sm text-ink space-y-4">
      <p className="text-muted leading-relaxed">
        Bring your courses, class times, assignments and the semester's class dates in from your LMS, and keep them up to date.
        FocusFlow only reads: it never changes anything on the LMS, and it never sees your Microsoft password.
        Your LMS key is stored encrypted, and you can disconnect at any time.
      </p>

      {status.connected && !status.needsReconnect && (
        <div className="rounded-token-md bg-surface-2 p-3 space-y-1">
          <p className="font-black flex items-center gap-2"><GraduationCap size={16} aria-hidden="true" /> Connected</p>
          <p className="text-muted">Last synced: {when(status.lastSynced)}</p>
          {status.lastError && <p role="alert" className="text-focus font-bold">{status.lastError}</p>}
        </div>
      )}

      {status.needsReconnect && (
        <p role="alert" className="rounded-token-md bg-surface-2 p-3 font-bold text-focus">
          {status.lastError || "The LMS no longer accepts your key."} Sign in again below.
        </p>
      )}

      {needsConnect && (
        <div className="space-y-3">
          <a href={signIn} className="inline-flex items-center gap-2 rounded-full bg-grad-hero text-on-brand font-bold px-4 py-2 shadow-neu-sm">
            <GraduationCap size={16} aria-hidden="true" /> Sign in with the LMS
          </a>
          <p className="text-xs text-muted">
            You sign in on the university's own page. If your browser then asks to let FocusFlow open links, choose Allow: you come back here and are connected.
          </p>
          <details className="text-xs text-muted">
            <summary className="cursor-pointer font-bold text-ink">It did not bring me back</summary>
            <p className="mt-2">
              <a href={signInManual} className="font-bold text-brand underline">Sign in the manual way</a>. The page will stop with an error or a blank page, because the key goes
              to an app. Open your browser's developer tools (F12) on the Network tab before signing in, find the <code>launch.php</code> request, and copy the
              address after <code>Location:</code> in its response headers. It begins with <code>moodlemobile://token=</code>. Paste it here.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              aria-label="Text from the LMS"
              className="mt-2 w-full rounded-token-md bg-surface-2 p-2 text-ink text-xs"
              placeholder="moodlemobile://token=..."
            />
            <Button variant="primary" size="sm" disabled={busy || !text.trim()} onClick={() => connect(text)} className="mt-2">
              Connect
            </Button>
          </details>
        </div>
      )}

      {status.connected && !status.needsReconnect && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={syncNow} className="gap-1.5">
            <RefreshCw size={14} aria-hidden="true" /> Sync now
          </Button>
          {!confirming ? (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(true)} className="gap-1.5">
              <Unplug size={14} aria-hidden="true" /> Disconnect
            </Button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Your subjects and assignments stay.</span>
              <Button variant="primary" size="sm" disabled={busy} onClick={disconnect}>Yes, disconnect</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
            </span>
          )}
        </div>
      )}

      {busy && <p className="text-muted" role="status">Working...</p>}
      {note && !busy && <p className="font-bold text-brand" role="status">{note}</p>}
      {error && <p role="alert" className="font-bold text-focus">{error}</p>}
    </div>
  );
}
