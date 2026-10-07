import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, ShieldCheck } from "lucide-react";
import { getConsent, setConsent } from "../../features/consent/consent";
import { loadGoogleScript } from "../../features/consent/googleSignIn";

// Asked once, on a student's first visit (the sign-up and sign-in pages included).
// "Accept all" also allows Google sign-in's script; "Essential only" keeps it off.
export default function CookieBanner() {
  const [choice, setChoice] = useState(() => getConsent());

  // A student who already allowed Google gets its script on every visit.
  useEffect(() => {
    if (choice === "all") loadGoogleScript().catch(() => {});
  }, [choice]);

  useEffect(() => {
    const sync = () => setChoice(getConsent());
    window.addEventListener("ff:consent", sync);
    return () => window.removeEventListener("ff:consent", sync);
  }, []);

  if (choice) return null;

  const pick = (c) => { setConsent(c); setChoice(c); };

  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label="Cookies and privacy"
      className="fixed z-[2500] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-[420px] rounded-token-lg bg-surface shadow-neu border border-[rgb(var(--ink)/0.08)] p-5"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-11 h-11 rounded-2xl bg-grad-sage text-on-sage shadow-neu-sm grid place-items-center">
          <Cookie size={22} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-ink">Cookies and privacy</h2>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            FocusFlow keeps you signed in with a secure cookie and remembers your settings in this browser. That is all it needs, and there are no ads or tracking.
            You can also allow <b className="text-ink">Google sign-in</b>, which loads Google&apos;s own script and cookies.
          </p>
          <p className="text-xs text-muted mt-2">
            <ShieldCheck size={13} className="inline -mt-0.5 mr-1 text-sage-deep" />
            <Link to="/privacy" className="font-bold text-brand hover:underline">Read the privacy details</Link>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5 mt-4">
        <button
          onClick={() => pick("all")}
          className="flex-1 min-w-[130px] px-4 py-2.5 rounded-token-md bg-grad-hero text-on-brand shadow-clay-brand font-black text-xs tracking-wider uppercase hover:-translate-y-0.5 transition-transform"
        >
          Accept all
        </button>
        <button
          onClick={() => pick("essential")}
          className="flex-1 min-w-[130px] px-4 py-2.5 rounded-token-md bg-surface text-ink shadow-neu-sm font-black text-xs tracking-wider uppercase hover:-translate-y-0.5 transition-transform"
        >
          Essential only
        </button>
      </div>
    </aside>
  );
}
