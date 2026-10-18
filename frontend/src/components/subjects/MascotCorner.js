import React, { useContext } from "react";
import { PreferencesContext } from "../../preferences/PreferencesProvider";
import { mascotSheets, mascotName } from "../ui/mascots";
import { DEFAULT_MASCOT } from "../common/PageMascot";
import Mascot from "../common/Mascot";
import { fmt12 } from "../../features/schedule/todayClasses";

// The left of the Subjects page: the student's own mascot with no card behind it, standing on a soft
// floor shadow, with a small clay speech bubble that says something true about today's classes.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

// One friendly line from the data, in plain words.
export function speechLine(subjects, now = new Date()) {
  const today = DAYS[(now.getDay() + 6) % 7];
  const all = (subjects || []).flatMap((s) => (s.schedule || []).filter((x) => x.start).map((x) => ({ ...x, subject: s })));
  if (!all.length) return "Add your class times and I will keep watch.";
  const mine = all.filter((x) => x.day === today).sort((a, b) => toMin(a.start) - toMin(b.start));
  if (!mine.length) return "No classes today, enjoy!";
  const count = `${mine.length} class${mine.length === 1 ? "" : "es"} today`;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const next = mine.find((x) => toMin(x.start) > nowMin);
  if (!next) return `${count}, all done. Nice work!`;
  return `${count}. Next is ${next.subject.code || next.subject.name} at ${fmt12(next.start)}.`;
}

export default function MascotCorner({ subjects, className = "" }) {
  // Read the context directly: a missing provider just means the default mascot.
  const prefs = useContext(PreferencesContext);
  const id = mascotSheets(prefs?.profile?.mascot) ? prefs.profile.mascot : DEFAULT_MASCOT;
  const sheets = mascotSheets(id);
  const line = speechLine(subjects);
  return (
    <div data-testid="mascot-corner" className={`flex items-end justify-center gap-2 pb-1 min-w-0 lg:flex-col-reverse lg:items-center lg:justify-start lg:gap-1 ${className}`}>
      <style>{`@keyframes ff-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}.ff-float{animation:ff-float 3.6s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.ff-float{animation:none}}`}</style>
      <div className="relative w-28 h-28 lg:w-60 lg:h-60 xl:w-[17rem] xl:h-[17rem] shrink-0">
        <span aria-hidden="true" className="absolute left-1/2 bottom-1 -translate-x-1/2 w-20 lg:w-40 h-3 rounded-[50%] bg-[rgb(var(--ink)/0.12)] blur-[3px]" />
        <div className="ff-float relative w-full h-full">
          <Mascot directions={sheets.directions} reactions={sheets.reactions} size="100%" label={mascotName(id)} />
        </div>
      </div>
      <p role="status" className="relative mb-10 lg:mb-0 max-w-[11rem] lg:max-w-full lg:rounded-bl-2xl lg:rounded-b-2xl lg:text-center rounded-2xl rounded-bl-sm bg-surface shadow-neu-sm px-3 py-2 text-xs font-bold leading-snug text-ink">
        {line}
      </p>
    </div>
  );
}
