import React, { useEffect, useState } from "react";
import { Panel } from "../../components/dashboard/DashKit";
import { lmsAPI } from "../../services/api";

export const fmt = (n) => (n == null ? "" : String(Math.round(Number(n) * 100) / 100));

// "8 / 10", or "not graded yet" when the teacher has not entered a mark.
export function markText(item) {
  if (item.score == null) return "not graded yet";
  return item.max == null ? fmt(item.score) : `${fmt(item.score)} / ${fmt(item.max)}`;
}

// Marks imported from a connected LMS, for reference only: they never change the student's own grades or CGPA.
// Shows nothing at all when there is no LMS connection or no marks yet.
export default function LmsGradesPanel() {
  const [groups, setGroups] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.resolve(lmsAPI && lmsAPI.grades ? lmsAPI.grades() : [])
      .then((g) => { if (alive) setGroups(Array.isArray(g) ? g : []); })
      .catch(() => { if (alive) setGroups([]); });
    return () => { alive = false; };
  }, []);

  if (!groups || groups.length === 0) return null;
  return (
    <Panel title="From your LMS" subtitle="Marks your teachers have entered. For reference only: they are not counted in your CGPA." className="mt-6">
      <div className="divide-y divide-[rgb(var(--ink)/0.07)]">
        {groups.map((g) => (
          <section key={g.subjectId} aria-label={g.subjectName} className="py-3 first:pt-0 last:pb-0">
            <h3 className="flex items-center gap-2 text-sm font-black text-ink">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color || "rgb(var(--brand))" }} />
              <span className="truncate">{g.subjectName}</span>
            </h3>
            <ul className="mt-2 space-y-1">
              {g.items.map((i) => (
                <li key={`${i.name}-${i.isTotal}`} className={`flex items-baseline justify-between gap-3 text-sm ${i.isTotal ? "font-black text-ink" : "text-muted"}`}>
                  <span className="min-w-0 truncate">{i.name}</span>
                  <span className="shrink-0 tabular-nums">{markText(i)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Panel>
  );
}
