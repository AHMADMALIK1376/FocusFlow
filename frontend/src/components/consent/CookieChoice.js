import React, { useEffect, useState } from "react";
import { getConsent, setConsent } from "../../features/consent/consent";
import { loadGoogleScript } from "../../features/consent/googleSignIn";

// The student's cookie choice, with buttons to change it. Shown on the privacy page and in Settings.
export default function CookieChoice() {
  const [choice, setChoice] = useState(() => getConsent());
  useEffect(() => {
    const sync = () => setChoice(getConsent());
    window.addEventListener("ff:consent", sync);
    return () => window.removeEventListener("ff:consent", sync);
  }, []);

  const pick = (c) => {
    setConsent(c);
    setChoice(c);
    if (c === "all") loadGoogleScript().catch(() => {});
  };

  return (
    <>
      <p>
        Now: <b className="text-ink" data-testid="current-choice">{choice === "all" ? "Accept all (Google sign-in allowed)" : choice === "essential" ? "Essential only" : "not chosen yet"}</b>
      </p>
      <div className="flex flex-wrap gap-2.5 pt-1">
        <button onClick={() => pick("all")} className="px-5 py-2.5 rounded-token-md bg-grad-hero text-on-brand shadow-clay-brand font-black text-xs tracking-wider uppercase hover:-translate-y-0.5 transition-transform">Accept all</button>
        <button onClick={() => pick("essential")} className="px-5 py-2.5 rounded-token-md bg-surface text-ink shadow-neu-sm font-black text-xs tracking-wider uppercase hover:-translate-y-0.5 transition-transform">Essential only</button>
      </div>
      <p className="text-xs pt-1">With Essential only you can still use FocusFlow fully. Signing in with Google simply asks again first.</p>
    </>
  );
}
