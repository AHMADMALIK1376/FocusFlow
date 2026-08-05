// Covers the app with the right page when the connection is lost:
//   - "You're offline" when the device has no internet (the browser's
//     offline/online events);
//   - 503 "Can't reach the server" when FocusFlow's server doesn't answer.
// api.js reports any request that got no answer (SERVER_TROUBLE_EVENT). One
// failed request never shows the page by itself: the gate first asks
// /api/health, and only a failed check counts. While the server is down it
// checks again every RETRY_SECONDS (the dial counts down). Once things are
// back it reloads, so every page fetches fresh data.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { WifiOff, RotateCw } from "lucide-react";
import { pingServer, SERVER_TROUBLE_EVENT } from "../../services/api";
import ErrorScreen, { PrimaryAction } from "./ErrorScreen";

export const RETRY_SECONDS = 15;

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export default function ConnectionGate({ onRecover = () => window.location.reload() }) {
  const [status, setStatus] = useState(() => (isOffline() ? "offline" : "ok")); // ok | offline | down
  const [left, setLeft] = useState(RETRY_SECONDS);
  const [checking, setChecking] = useState(false);
  const statusRef = useRef(status);
  statusRef.current = status;
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (isOffline()) { setStatus("offline"); return; }
    if (busy.current) return;
    busy.current = true;
    setChecking(true);
    const ok = await pingServer();
    busy.current = false;
    setChecking(false);
    if (ok) {
      if (statusRef.current !== "ok") onRecover();
    } else {
      setStatus("down");
      setLeft(RETRY_SECONDS);
    }
  }, [onRecover]);

  useEffect(() => {
    const goOffline = () => setStatus("offline");
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", check);
    window.addEventListener(SERVER_TROUBLE_EVENT, check);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", check);
      window.removeEventListener(SERVER_TROUBLE_EVENT, check);
    };
  }, [check]);

  // Server down: count the dial down, then check again.
  useEffect(() => {
    if (status !== "down") return undefined;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [status]);
  useEffect(() => {
    if (status === "down" && left === 0) check();
  }, [status, left, check]);

  if (status === "ok") return null;

  return (
    <div className="fixed inset-0 z-[3000] overflow-auto" role="alertdialog" aria-live="assertive">
      {status === "offline" ? (
        <ErrorScreen
          dial={0}
          dialColor="rgb(var(--sage-deep))"
          dialCenter={<WifiOff size={40} strokeWidth={1.75} className="text-[rgb(var(--sage-deep))]" />}
          title="You're offline"
          message="Check your Wi-Fi or mobile data. FocusFlow picks up where you left off as soon as you're back."
          actions={<PrimaryAction icon={RotateCw} onClick={check}>Try again</PrimaryAction>}
        />
      ) : (
        <ErrorScreen
          code="503"
          dial={((RETRY_SECONDS - left) / RETRY_SECONDS) * 100}
          dialCenter={
            <span className="leading-none">
              <span className="text-2xl font-black text-ink">{checking ? "…" : left}</span>
              {!checking && <span className="text-xs font-bold text-muted">s</span>}
            </span>
          }
          title="Can't reach FocusFlow's server"
          message="It may be waking up or down for a moment. Your data is safe, and the app reconnects by itself."
          actions={<PrimaryAction icon={RotateCw} onClick={check} disabled={checking}>{checking ? "Checking…" : "Try now"}</PrimaryAction>}
        >
          <p className="text-xs font-bold text-muted mt-4">
            {checking ? "Checking the server…" : `Trying again in ${left} second${left === 1 ? "" : "s"}`}
          </p>
        </ErrorScreen>
      )}
    </div>
  );
}
