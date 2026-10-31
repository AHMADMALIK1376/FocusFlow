import React, { useRef, useState } from "react";
import { Smile } from "lucide-react";
import { usePreferences } from "../../preferences/usePreferences";
import { cx, MascotPicker, mascotSheets, mascotName } from "../ui";
import Mascot from "../common/Mascot";

// The character fills about 62% of a sprite cell's width and its head starts ~10% from the
// top. The square is hung from the top of the art window, raised so the head pokes out over
// the window's top edge into the frame (like a collectible card), and a clip layer cuts it off
// at the window's bottom and sides while leaving room above.
// Plain percentages only (no container-query units): the square is 135% of the window's width, and
// a percentage margin is measured against the width too, so -13.5% is exactly a tenth of the square.
export const MASCOT_WIDTH_PCT = 135;
export const HEAD_POKE_PX = 18; // how far the head rises above the window's top edge
const MAX_TILT = 9; // degrees

// What each "power stat" bar counts up to (the bar is full at this number).
export const STAT_GOALS = { streak: 14, done: 20, focus: 10 };
export const statFill = (value, goal) => Math.max(0, Math.min(1, (Number(value) || 0) / goal));

// Tilt for a pointer at (x, y) inside a box: the card leans toward the pointer.
export function tiltFor(x, y, rect) {
  const clamp = (n) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5); // no usable position: stay flat
  const px = rect.width ? (x - rect.left) / rect.width : 0.5;
  const py = rect.height ? (y - rect.top) / rect.height : 0.5;
  return { ry: (clamp(px) - 0.5) * 2 * MAX_TILT, rx: (0.5 - clamp(py)) * 2 * MAX_TILT, mx: clamp(px) * 100, my: clamp(py) * 100 };
}

function Power({ label, value, goal, hint }) {
  const fill = statFill(value, goal);
  return (
    <div className="rounded-xl bg-[rgb(var(--on-brand)/0.14)] px-2.5 py-2 text-center" title={`${hint} (bar full at ${goal})`}>
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[9px] uppercase tracking-wider opacity-80 mt-1">{label}</p>
      <div className="mt-1.5 h-1.5 rounded-full bg-[rgb(var(--on-brand)/0.25)] overflow-hidden" aria-hidden="true">
        <div data-testid={`bar-${label.toLowerCase()}`} className="h-full rounded-full bg-on-brand transition-[width] duration-500" style={{ width: `${Math.round(fill * 100)}%` }} />
      </div>
    </div>
  );
}

// Dashboard profile card, drawn like a collectible trading card: a coral frame, an art window
// where the mascot steps out over the top edge, a corner badge, and three power stats. It
// leans toward the pointer with a soft shimmer (not on touch, and not for reduced motion).
export default function ProfileCard({ displayName, streak, doneTasks, focusSessions }) {
  const { profile, updateProfile } = usePreferences();
  const [pickerOpen, setPickerOpen] = useState(false);
  const tilt = useRef(null);

  const avatarUrl = profile?.avatarUrl || null;
  const sheets = avatarUrl ? null : mascotSheets(profile?.mascot);
  const filled = Boolean(avatarUrl || sheets);

  function onMove(e) {
    const el = tilt.current;
    if (!el || e.pointerType === "touch") return;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = tiltFor(e.clientX, e.clientY, el.getBoundingClientRect());
    el.style.setProperty("--rx", `${t.rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${t.ry.toFixed(2)}deg`);
    el.style.setProperty("--mx", `${t.mx.toFixed(1)}%`);
    el.style.setProperty("--my", `${t.my.toFixed(1)}%`);
  }
  function onLeave() {
    const el = tilt.current;
    if (!el) return;
    ["--rx", "--ry"].forEach((k) => el.style.setProperty(k, "0deg"));
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "30%");
  }

  return (
    <section data-testid="profile-card" className="group relative h-full [perspective:900px]" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        ref={tilt}
        data-testid="profile-tilt"
        className={cx(
          "relative h-full min-h-[340px] lg:min-h-[460px] flex flex-col rounded-token-lg bg-grad-hero p-3 shadow-glass text-on-brand",
          "transition-transform duration-150 ease-out motion-reduce:transition-none"
        )}
        style={{ transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
      >
        {/* The art window: light, with the mascot standing in it and leaning out over its top edge */}
        <div data-testid="mascot-backdrop" className="relative flex-1 min-h-[180px] rounded-2xl bg-surface shadow-[inset_0_2px_6px_rgb(var(--ink)/0.08)]">
          <div className="absolute inset-0 rounded-2xl bg-[rgb(var(--sage)/0.3)]" />
          {/* A soft ground tint under the figure, so the space below its feet reads as part of the card */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 rounded-b-2xl bg-gradient-to-t from-[rgb(var(--surface)/0.85)] to-transparent pointer-events-none" />
          {avatarUrl && <img src={avatarUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover rounded-2xl" />}
          {sheets && (
            <div data-testid="mascot-clip" className="absolute inset-0 pointer-events-none" style={{ clipPath: "inset(-48px -12px 0 -12px round 0 0 16px 16px)" }}>
              <div data-testid="mascot-figure" className="absolute left-1/2 -translate-x-1/2 pointer-events-auto" style={{ width: `${MASCOT_WIDTH_PCT}%`, aspectRatio: "1 / 1", top: -HEAD_POKE_PX, marginTop: `${-MASCOT_WIDTH_PCT / 10}%` }}>
                <Mascot directions={sheets.directions} reactions={sheets.reactions} size="100%" label={mascotName(profile.mascot)} />
              </div>
            </div>
          )}
          {!filled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-ink">
              <button onClick={() => setPickerOpen(true)} title="Pick a mascot"
                className="w-20 h-20 rounded-2xl bg-[rgb(var(--brand)/0.18)] flex items-center justify-center text-3xl font-black mb-3 hover:bg-[rgb(var(--brand)/0.28)] transition-colors">
                {displayName.slice(0, 1).toUpperCase()}
              </button>
              <button onClick={() => setPickerOpen(true)} className="text-xs font-bold underline underline-offset-2">
                Pick a mascot
              </button>
            </div>
          )}
          {/* The nameplate, like the banner on a trading card; it lets pokes through to the mascot */}
          <p data-testid="card-name" className="absolute bottom-3 left-3 right-3 rounded-xl bg-surface px-3 py-1.5 text-center text-sm font-black tracking-wide text-ink shadow-neu-sm truncate pointer-events-none">{displayName}</p>
          {/* A soft shine that follows the pointer; it never takes a click */}
          <div aria-hidden="true" className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:hidden"
            style={{ background: "radial-gradient(circle at var(--mx, 50%) var(--my, 30%), rgb(var(--surface) / 0.55), transparent 55%)" }} />
        </div>

        {/* Corner badge and the change button sit over the frame, letting pokes through to the mascot */}
        <div className="absolute top-5 left-5 right-5 z-10 flex items-start justify-between gap-2 pointer-events-none">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-surface text-brand shadow-neu-sm">
            {profile?.segment && profile.segment !== "Unknown" ? profile.segment : "FocusFlow Member"}
          </span>
          <button onClick={() => setPickerOpen(true)}
            className="pointer-events-auto flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface text-brand shadow-neu-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
            <Smile size={13} /> Change mascot
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 relative z-10 mt-3">
          <Power label="Streak" value={streak || 0} goal={STAT_GOALS.streak} hint="Days in a row" />
          <Power label="Done" value={doneTasks} goal={STAT_GOALS.done} hint="Tasks finished" />
          <Power label="Focus" value={focusSessions || 0} goal={STAT_GOALS.focus} hint="Focus sessions" />
        </div>
      </div>
      <MascotPicker open={pickerOpen} onClose={() => setPickerOpen(false)} value={profile?.mascot}
        onPick={(id) => updateProfile({ mascot: id, avatarUrl: null })}
        onPhoto={(url) => updateProfile({ avatarUrl: url, mascot: null })} />
    </section>
  );
}
