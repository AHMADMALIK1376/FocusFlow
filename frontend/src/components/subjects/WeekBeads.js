import React, { useMemo, useState } from "react";
import { fmtRange } from "../../features/schedule/todayClasses";
import { subjectPalette } from "./subjectPalette";

// A small clay abacus of the week: one rod per day, one soft bead per class in
// that subject's pastel tint. Today's rod is sage. Pointing at a bead names the
// class and its room. Sits in the page header, top right.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = { Monday: "M", Tuesday: "T", Wednesday: "W", Thursday: "T", Friday: "F", Saturday: "S", Sunday: "S" };
const NAME = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

export function weekBeads(subjects) {
  const byDay = Object.fromEntries(DAYS.map((d) => [d, []]));
  for (const s of subjects || []) {
    for (const x of s.schedule || []) {
      if (byDay[x.day] && x.start) byDay[x.day].push({ subject: s, start: x.start, end: x.end, room: x.room || "" });
    }
  }
  for (const d of DAYS) byDay[d].sort((a, b) => a.start.localeCompare(b.start));
  const days = DAYS.filter((d, i) => i < 5 || byDay[d].length).map((day) => ({ day, beads: byDay[day] }));
  const total = days.reduce((n, d) => n + d.beads.length, 0);
  const busiest = days.reduce((b, d) => (d.beads.length > (b?.beads.length ?? 0) ? d : b), null);
  return { days, total, busiest: busiest?.day || null };
}

export default function WeekBeads({ subjects }) {
  const week = useMemo(() => weekBeads(subjects), [subjects]);
  const [focus, setFocus] = useState(null);
  const [tip, setTip] = useState(null); // { b, day, x, y } for the small tooltip
  const showTip = (e, b, day) => {
    const r = e.currentTarget.getBoundingClientRect();
    setFocus(b);
    setTip({ b, day, x: r.left + r.width / 2, y: r.top });
  };
  const hideTip = () => { setFocus(null); setTip(null); };
  if (!week.total) return null;
  const today = DAYS[(new Date().getDay() + 6) % 7];
  const credits = subjects.reduce((n, s) => n + (Number(s.creditHours) || 0), 0);

  return (
    <section aria-label="Your week" className="rounded-3xl bg-surface shadow-neu px-4 py-3 w-[17rem] max-w-full">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted">Your week</p>
        <p className="text-[11px] font-bold text-muted">{subjects.length} subjects · {credits} cr</p>
      </div>

      <div className="flex items-end justify-between gap-1.5 mt-2 h-[5.5rem]">
        {week.days.map((d) => {
          const isToday = d.day === today;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className={`relative flex flex-col-reverse items-center gap-[3px] w-full rounded-full px-1 py-1 flex-1 justify-start ${isToday ? "bg-sage/45" : "bg-[rgb(var(--ink)/0.04)]"}`}>
                {d.beads.map((b, i) => {
                  const p = subjectPalette(b.subject.color);
                  const on = focus === b;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${NAME[d.day]} ${fmtRange(b.start, b.end)}, ${b.subject.name}${b.room ? `, ${b.room}` : ""}`}
                      onMouseEnter={(e) => showTip(e, b, d.day)}
                      onMouseLeave={hideTip}
                      onFocus={(e) => showTip(e, b, d.day)}
                      onBlur={hideTip}
                      onClick={(e) => showTip(e, b, d.day)}
                      onKeyDown={(e) => { if (e.key === "Escape") hideTip(); }}
                      className={`relative w-full max-w-[1.6rem] h-3.5 rounded-full transition-transform before:absolute before:-inset-x-1 before:-inset-y-1 before:content-[''] ${on ? "scale-110" : ""}`}
                      style={{
                        background: p.badgeBg,
                        boxShadow: `inset 0 2px 3px rgb(255 255 255 / 0.85), inset 0 -2px 3px ${p.mid}33, 0 2px 4px -1px ${p.mid}55`,
                      }}
                    />
                  );
                })}
              </div>
              <span className={`text-[10px] font-black ${isToday ? "text-ink" : d.day === week.busiest ? "text-brand" : "text-muted"}`}>{SHORT[d.day]}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ink/75 min-h-[2.1em]" aria-live="polite">
        {focus ? (
          <><b>{focus.subject.code || focus.subject.name}</b> · {fmtRange(focus.start, focus.end)}{focus.room ? <> · <b>{focus.room}</b></> : null}</>
        ) : (
          <>{week.total} classes · {NAME[week.busiest]} is busiest</>
        )}
      </p>
      {tip && (
        <div role="tooltip" data-testid="week-tip" className="fixed z-[9999] pointer-events-none max-w-[13rem] rounded-xl bg-surface text-ink shadow-neu-sm border border-ink/10 px-2.5 py-1.5 text-[11px] leading-snug"
          style={{ left: Math.min(Math.max(tip.x, 100), window.innerWidth - 100), top: tip.y, transform: "translate(-50%, -100%) translateY(-6px)" }}>
          <p className="font-black truncate">{tip.b.subject.name}</p>
          <p className="text-ink/70 truncate">{tip.b.subject.instructor || "TBA"}</p>
          <p className="text-ink/80">{NAME[tip.day]} {fmtRange(tip.b.start, tip.b.end)}{tip.b.room ? <> · <b>{tip.b.room}</b></> : null}</p>
        </div>
      )}
    </section>
  );
}
