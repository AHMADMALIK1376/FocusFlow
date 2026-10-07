import React, { useState } from "react";
import { Smile } from "lucide-react";
import { usePreferences } from "../../preferences/usePreferences";
import { cx, MascotPicker, mascotSheets, mascotName } from "../ui";
import Mascot from "../common/Mascot";

// The character fills about 62% of a sprite cell's width (more when it turns its
// head), its head starts ~10% from the top and its face ends ~60% down. A square of
// this side, standing on the card's bottom edge, makes it about 80% of the card's
// width, keeps a turned head inside the card, and keeps the face above the fade.
const MASCOT_SIDE = "min(125cqw, 100cqh)";

// Dashboard profile card. A photo or a mascot fills it edge to edge; a coral fade
// from the bottom keeps the label and the stats readable on top.
export default function ProfileCard({ displayName, streak, doneTasks, focusSessions }) {
  const { profile, updateProfile } = usePreferences();
  const [pickerOpen, setPickerOpen] = useState(false);

  const avatarUrl = profile?.avatarUrl || null;
  const sheets = avatarUrl ? null : mascotSheets(profile?.mascot);
  const filled = Boolean(avatarUrl || sheets);

  return (
    <section
      data-testid="profile-card"
      className={cx(
        "group rounded-token-lg bg-grad-hero p-6 shadow-glass relative overflow-hidden min-h-[260px] lg:min-h-[460px] flex flex-col",
        filled ? "text-white" : "text-on-brand"
      )}
    >
      {avatarUrl && <img src={avatarUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />}

      {/* Mascot: the photo's footprint, on a light sage wash over the surface colour */}
      {sheets && (
        <div data-testid="mascot-backdrop" className="absolute inset-0 bg-surface [container-type:size]">
          <div className="absolute inset-0 bg-[rgb(var(--sage)/0.3)]" />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{ width: MASCOT_SIDE, height: MASCOT_SIDE }}
          >
            <Mascot directions={sheets.directions} reactions={sheets.reactions} size="100%" label={mascotName(profile.mascot)} />
          </div>
        </div>
      )}

      {/* Coral (not black) fade under the text. It ignores the pointer, so the mascot can still be poked. */}
      {avatarUrl && <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[rgb(var(--brand)/0.9)] via-[rgb(var(--brand)/0.35)] to-transparent" />}
      {sheets && <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[rgb(var(--brand)/0.95)] via-[rgb(var(--brand)/0.7)] via-20% to-transparent to-40%" />}

      <div className="flex items-center justify-end gap-3 relative z-10">
        <button onClick={() => setPickerOpen(true)}
          className={cx(
            "flex items-center gap-1.5 text-[11px] font-bold opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity",
            sheets && "px-2.5 py-1 rounded-full bg-[rgb(var(--brand)/0.9)] text-on-brand shadow-clay-brand"
          )}>
          <Smile size={13} /> Change mascot
        </button>
      </div>

      {/* Lets clicks through to the mascot; its own buttons take them back. */}
      <div className={cx("flex-1 flex flex-col relative z-10 pointer-events-none", filled ? "justify-end" : "items-center justify-center text-center")}>
        {!filled && (
          <button onClick={() => setPickerOpen(true)} title="Pick a mascot"
            className="pointer-events-auto w-20 h-20 rounded-2xl bg-[rgb(var(--on-brand)/0.18)] backdrop-blur flex items-center justify-center text-3xl font-black mb-4 hover:bg-[rgb(var(--on-brand)/0.28)] transition-colors">
            {displayName.slice(0, 1).toUpperCase()}
          </button>
        )}
        {!filled && (
          <button onClick={() => setPickerOpen(true)} className="pointer-events-auto mb-3 text-xs font-bold underline underline-offset-2">
            Pick a mascot
          </button>
        )}
        <span className={cx("inline-block w-fit px-3 py-1 rounded-full text-xs font-bold", sheets ? "bg-[rgb(var(--brand)/0.9)] text-on-brand" : "bg-white/16 backdrop-blur")}>
          {profile?.segment && profile.segment !== "Unknown" ? profile.segment : "FocusFlow Member"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 relative z-10 pt-4 mt-4 border-t border-white/20">
        <div className="text-center"><p className="text-lg font-black">{streak || 0}</p><p className="text-[9px] uppercase tracking-wider opacity-75">Streak</p></div>
        <div className="text-center"><p className="text-lg font-black">{doneTasks}</p><p className="text-[9px] uppercase tracking-wider opacity-75">Done</p></div>
        <div className="text-center"><p className="text-lg font-black">{focusSessions || 0}</p><p className="text-[9px] uppercase tracking-wider opacity-75">Focus</p></div>
      </div>
      <MascotPicker open={pickerOpen} onClose={() => setPickerOpen(false)} value={profile?.mascot}
        onPick={(id) => updateProfile({ mascot: id, avatarUrl: null })} />
    </section>
  );
}
