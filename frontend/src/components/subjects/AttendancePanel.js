import React, { useState, useEffect, useCallback } from "react";
import { Check, X, Clock } from "lucide-react";
import { Button, Input, Badge, EmptyState, DeleteButton } from "../ui";
import { Panel } from "../dashboard/DashKit";
import { subjectAttendanceAPI } from "../../services/api";

const TODAY = new Date().toISOString().slice(0, 10);
const STATUS_TONE = { Present: "success", Absent: "focus", Late: "warn", Excused: "muted" };

export default function AttendancePanel({ subjectId }) {
  const [data, setData] = useState({ records: [], summary: { percentage: null, present: 0, absent: 0, late: 0, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(TODAY);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await subjectAttendanceAPI.getForSubject(subjectId));
    } catch {
      /* leave previous data */
    } finally {
      setLoading(false);
    }
  }, [subjectId]);
  useEffect(() => { refresh(); }, [refresh]);

  async function mark(status) { await subjectAttendanceAPI.mark(subjectId, { date, status }); await refresh(); }
  async function onDelete(id) { await subjectAttendanceAPI.removeRecord(id); await refresh(); }

  const s = data.summary || {};
  const pct = s.percentage;

  return (
    <Panel
      title="Attendance"
      className="mb-6"
      right={pct != null ? <Badge tone={pct >= 75 ? "success" : "focus"}>{pct}%</Badge> : <Badge tone="muted">—</Badge>}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!py-2 !px-3 text-sm !w-auto" />
        <Button size="sm" variant="soft" onClick={() => mark("Present")} className="gap-1"><Check size={14} /> Present</Button>
        <Button size="sm" variant="soft" onClick={() => mark("Absent")} className="gap-1"><X size={14} /> Absent</Button>
        <Button size="sm" variant="soft" onClick={() => mark("Late")} className="gap-1"><Clock size={14} /> Late</Button>
      </div>

      {!loading && s.total > 0 && (
        <div className="flex gap-4 text-xs text-muted mb-3">
          <span><b className="text-success">{s.present}</b> present</span>
          <span><b className="text-focus">{s.absent}</b> absent</span>
          <span><b className="text-ink">{s.late}</b> late</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted py-4 text-center">Loading…</p>
      ) : data.records.length === 0 ? (
        <EmptyState icon="✅" title="No attendance yet" description="Mark today's class above" />
      ) : (
        <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
          {data.records.slice(0, 8).map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <Badge tone={STATUS_TONE[r.status] || "muted"}>{r.status}</Badge>
              <span className="flex-1 text-sm text-ink">{r.date}</span>
              <DeleteButton onClick={() => onDelete(r.id)} title="Remove" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
