import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { fmtRange } from "../../features/schedule/todayClasses";
import { isLabSubject } from "../../features/subjects/subjectStats";
import { subjectPalette } from "./SubjectTable";

// The subjects one by one, as plain text on the page (no card): code, name, teacher, classes with rooms.
// Cycles every few seconds; pointing at or focusing a subject box (or the loop itself) shows that one and pauses.
// No auto-advance with reduced motion, nor off screen.

const CYCLE_MS = 3200;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const MAX_DOTS = 24;

// The next subject after `from` that the filter shows, wrapping round; `from` itself when nothing else shows.
export function nextIndex(items, from, shows) {
  for (let k = 1; k <= items.length; k++) {
    const next = (from + k) % items.length;
    if (shows(items[next])) return next;
  }
  return from;
}

// The classes to list: today's first, then the rest in week order; at most `max`, with how many were left out.
export function pickSlots(sub, today, max = 3) {
  const slots = (sub.schedule || []).filter((x) => x.day);
  const byTime = (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || String(a.start || "").localeCompare(String(b.start || ""));
  const all = [
    ...slots.filter((x) => x.day === today).sort(byTime).map((x) => ({ ...x, isToday: true })),
    ...slots.filter((x) => x.day !== today).sort(byTime).map((x) => ({ ...x, isToday: false })),
  ];
  return { list: all.slice(0, max), more: Math.max(0, all.length - max) };
}

export default function SubjectLoop({ items, today, pointedId, onOpen, shows = () => true, className = "" }) {
  const root = useRef(null);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(true);

  useEffect(() => { if (active >= items.length) setActive(0); }, [items.length, active]);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const watch = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!inView || held || pointedId || calm || items.length < 2) return undefined;
    const t = setInterval(() => setActive((i) => nextIndex(items, i, shows)), CYCLE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, held, pointedId, calm, items]);

  if (!items.length) return null;
  const pointedAt = pointedId ? items.findIndex((x) => x.id === pointedId) : -1;
  const at = pointedAt >= 0 ? pointedAt : Math.min(active, items.length - 1);
  const sub = items[at];
  const p = subjectPalette(sub.color);
  const { list, more } = pickSlots(sub, today);
  const credits = Number(sub.creditHours) || 0;
  const many = items.length > 1;

  return (
    <div
      ref={root}
      data-testid="loop"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}
      className={`flex flex-col justify-center min-w-0 min-h-[11rem] lg:h-full px-1 ${className}`}
    >
      <div key={sub.id} data-testid="loop-slide" className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{isLabSubject(sub) ? "Lab" : "Theory"}</p>
        <p className="font-black tracking-tight text-3xl lg:text-4xl leading-none break-all" style={{ color: p.deep }}>{sub.code || sub.name}</p>
        <span aria-hidden="true" className="block h-1 w-10 rounded-full mt-1.5" style={{ background: p.mid }} />
        <h3 className="mt-2 font-black text-lg lg:text-xl leading-tight text-ink line-clamp-2 break-words" title={sub.name}>{sub.name}</h3>
        <p className="text-xs text-muted mt-0.5">{sub.instructor || "TBA"} · {credits} credit hour{credits === 1 ? "" : "s"}</p>
        <div className="mt-2 space-y-1 text-sm text-ink">
          {list.map((x, i) => (
            <p key={i} data-testid="loop-slot" className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {x.isToday && <span className="px-1.5 py-0.5 rounded-full bg-sage/45 text-ink text-[10px] font-bold leading-none">Today</span>}
              <span>{DAY_SHORT[x.day] || x.day} {x.start ? fmtRange(x.start, x.end) : "Time not set"}</span>
              {x.room && <b>{x.room}</b>}
            </p>
          ))}
          {!list.length && <p>No class times set</p>}
          {more > 0 && <p className="text-xs font-bold text-muted">+{more} more</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {many && <span className="text-[11px] font-bold text-muted whitespace-nowrap">{at + 1} of {items.length}</span>}
        {many && items.length <= MAX_DOTS && (
          <span className="flex items-center gap-1">
            {items.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.name}`}
                aria-current={i === at ? "true" : undefined}
                onClick={() => setActive(i)}
                className="rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                style={{ width: i === at ? 10 : 6, height: i === at ? 10 : 6, background: subjectPalette(s.color).mid, opacity: i === at ? 1 : 0.45 }}
              />
            ))}
          </span>
        )}
        <button type="button" onClick={() => onOpen(sub)} className="inline-flex items-center gap-1 text-xs font-bold text-ink underline-offset-2 hover:underline">
          Open <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}
