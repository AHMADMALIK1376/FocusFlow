import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fmtRange } from "../../features/schedule/todayClasses";
import { subjectPalette } from "./SubjectTable";

// A small clay abacus of the week: one rod per day, one soft bead per class in
// that subject's pastel tint, in time order. Today's rod is sage. Pointing at,
// focusing or tapping a bead opens a tooltip with the class: subject, teacher,
// day, time and room. Sits in the Subjects mosaic (`fill` stretches it to its cell).

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

// The tooltip. It is drawn on the page body (so no card can clip it), above the bead or below when there is
// no room, and slides sideways so it never leaves the screen.
function BeadTip({ id, tip, today }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, ready: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !tip.el) return;
    const r = tip.el.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, vw - w - 8));
    const top = r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8;
    setPos({ left, top, ready: true });
  }, [tip]);
  const { bead, day } = tip;
  const p = subjectPalette(bead.subject.color);
  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className="fixed z-[80] w-56 max-w-[calc(100vw-1rem)] rounded-2xl bg-surface text-ink shadow-neu p-3 text-xs pointer-events-none"
      style={{ left: pos.left, top: pos.top, visibility: pos.ready ? "visible" : "hidden" }}
    >
      <p className="flex items-center gap-2 font-black text-sm leading-tight">
        <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.mid }} aria-hidden="true" />
        <span className="min-w-0">{bead.subject.code ? `${bead.subject.code} · ` : ""}{bead.subject.name}</span>
      </p>
      <p className="mt-1 text-muted">{bead.subject.instructor || "TBA"}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
        {day === today && <span className="px-1.5 py-0.5 rounded-full bg-sage/45 text-ink text-[10px] leading-none">Today</span>}
        <span>{day} {fmtRange(bead.start, bead.end)}</span>
        {bead.room && <span>{bead.room}</span>}
      </p>
    </div>,
    document.body,
  );
}

export default function WeekBeads({ subjects, fill = false }) {
  const week = useMemo(() => weekBeads(subjects), [subjects]);
  const [tip, setTip] = useState(null); // { bead, day, el }
  const id = useId();
  const open = (bead, day, el) => setTip({ bead, day, el });
  const close = () => setTip(null);

  // Escape closes the tooltip; so does a tap or click anywhere but on its bead
  useEffect(() => {
    if (!tip) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setTip(null); };
    const onDown = (e) => { if (!tip.el || !tip.el.contains(e.target)) setTip(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [tip]);

  if (!week.total) return null;
  const today = DAYS[(new Date().getDay() + 6) % 7];
  const credits = subjects.reduce((n, s) => n + (Number(s.creditHours) || 0), 0);

  return (
    <section aria-label="Your week" className={`rounded-3xl bg-surface shadow-neu px-4 py-3 ${fill ? "w-full h-full flex flex-col" : "w-[17rem] max-w-full"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted">Your week</p>
        <p className="text-[11px] font-bold text-muted">{subjects.length} subjects · {credits} cr</p>
      </div>

      <div className={`flex items-end justify-between gap-1.5 mt-2 ${fill ? "flex-1 min-h-[5.5rem]" : "h-[5.5rem]"}`}>
        {week.days.map((d) => {
          const isToday = d.day === today;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className={`relative flex flex-col-reverse items-center gap-[3px] w-full rounded-full px-1 py-1 flex-1 justify-start ${isToday ? "bg-sage/45" : "bg-[rgb(var(--ink)/0.04)]"}`}>
                {d.beads.map((b, i) => {
                  const p = subjectPalette(b.subject.color);
                  const on = tip?.bead === b;
                  return (
                    <button
                      key={i}
                      type="button"
                      tabIndex={0}
                      aria-label={`${NAME[d.day]} ${fmtRange(b.start, b.end)}, ${b.subject.name}${b.room ? `, ${b.room}` : ""}`}
                      aria-describedby={on ? id : undefined}
                      onMouseEnter={(e) => open(b, d.day, e.currentTarget)}
                      onMouseLeave={close}
                      onFocus={(e) => open(b, d.day, e.currentTarget)}
                      onBlur={close}
                      onClick={(e) => open(b, d.day, e.currentTarget)}
                      className={`w-full max-w-[1.6rem] h-3.5 rounded-full transition-transform ${on ? "scale-110" : ""}`}
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

      <p className="mt-2 text-[11px] leading-snug text-ink/75 min-h-[2.1em]">
        {week.total} classes · {NAME[week.busiest]} is busiest
      </p>
      {tip && <BeadTip id={id} tip={tip} today={today} />}
    </section>
  );
}
