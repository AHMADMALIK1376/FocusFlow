// Shared layout for FocusFlow's error pages (404, 500, 503, offline).
// The status code is drawn in big clay digits with the middle "0" replaced by
// the app's dial gauge (ui/ProgressRing), so every error page is recognisably
// FocusFlow and each one sets the dial differently. No router hooks here: the
// crash page renders outside the router.
import React from "react";
import { ProgressRing } from "../ui/ProgressRing";

const Digit = ({ children }) => (
  <span
    aria-hidden="true"
    className="text-[76px] sm:text-[120px] leading-none font-black bg-grad-hero bg-clip-text text-transparent select-none"
    style={{ filter: "drop-shadow(0 8px 12px rgb(var(--brand) / 0.25))" }}
  >
    {children}
  </span>
);

export default function ErrorScreen({ code, dial = 0, dialColor, dialCenter, title, message, children, actions }) {
  return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="flex items-center gap-2.5 mb-8">
        <img src="/logo192.png" alt="" className="w-10 h-10 rounded-xl shadow-neu-sm" />
        <span className="text-lg font-black tracking-tight text-ink">FocusFlow</span>
      </div>

      <div className="flex items-center justify-center gap-1 sm:gap-3 mb-8" role="img" aria-label={code ? `Error ${code}` : title}>
        {code && <Digit>{code[0]}</Digit>}
        <ProgressRing value={dial} size={code ? 118 : 150} stroke={10} color={dialColor}>
          {dialCenter}
        </ProgressRing>
        {code && <Digit>{code[2]}</Digit>}
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-ink">{title}</h1>
      <p className="text-muted mt-2 max-w-md text-sm sm:text-base break-words">{message}</p>
      {children}
      {actions && <div className="flex flex-wrap gap-3 justify-center mt-7">{actions}</div>}
    </main>
  );
}

// The two button looks used on every error page.
export const PrimaryAction = ({ icon: Icon, children, ...rest }) => (
  <button
    {...rest}
    className="px-6 py-3 rounded-token-md bg-grad-hero text-on-brand shadow-clay-brand font-bold text-sm hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2"
  >
    {Icon && <Icon size={16} />}{children}
  </button>
);

export const SecondaryAction = ({ icon: Icon, children, ...rest }) => (
  <button
    {...rest}
    className="px-6 py-3 rounded-token-md bg-surface text-ink shadow-neu-sm font-bold text-sm hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2"
  >
    {Icon && <Icon size={16} />}{children}
  </button>
);
