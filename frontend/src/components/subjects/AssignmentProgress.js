import React from "react";
import { ProgressRing } from "../ui";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the student's own time zone

// How a subject's assignments stand: how many are submitted (Done), in progress, to do, and overdue.
export function assignmentStats(cards, now = today()) {
  const list = Array.isArray(cards) ? cards : [];
  const done = list.filter((c) => c.columnId === "col-done").length;
  const doing = list.filter((c) => c.columnId === "col-doing").length;
  const todo = list.length - done - doing;
  const overdue = list.filter((c) => c.columnId !== "col-done" && c.dueDate && c.dueDate < now).length;
  return { total: list.length, done, doing, todo, overdue, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

// A ring with the percentage submitted and a bar split into done / in progress / to do. Nothing for a subject with no assignments.
export default function AssignmentProgress({ cards }) {
  const s = assignmentStats(cards);
  if (s.total === 0) return null;
  const width = (n) => `${(n / s.total) * 100}%`;
  const extra = [`${s.todo} to do`, `${s.doing} in progress`, s.overdue ? `${s.overdue} overdue` : null].filter(Boolean).join(" · ");
  return (
    <div data-testid="assignment-progress" className="flex items-center gap-4 mb-4">
      <ProgressRing value={s.pct} size={84} stroke={8} className="shrink-0">
        <span className="text-sm font-black text-ink">{s.pct}%</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-ink">{s.done} of {s.total} submitted</p>
        <div
          role="img"
          aria-label={`${s.done} done, ${s.doing} in progress, ${s.todo} to do`}
          className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <span data-testid="seg-done" className="bg-success" style={{ width: width(s.done) }} />
          <span data-testid="seg-doing" className="bg-info" style={{ width: width(s.doing) }} />
          <span data-testid="seg-todo" className="bg-warn" style={{ width: width(s.todo) }} />
        </div>
        <p className={`mt-1.5 text-xs ${s.overdue ? "text-focus font-bold" : "text-muted"}`}>{extra}</p>
      </div>
    </div>
  );
}
