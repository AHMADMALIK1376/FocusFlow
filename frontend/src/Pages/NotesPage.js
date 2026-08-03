import React, { useMemo, useState } from "react";
import { FileText, Type, CalendarClock, Sparkles, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button, Input, Textarea, EmptyState, DeleteButton } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { useNotes } from "../features/notes/useNotes";
import { renderInline } from "../features/notes/notesLogic";

const wordCount = (s) => (s ? s.trim().split(/\s+/).filter(Boolean).length : 0);

export default function NotesPage() {
  const { notes, create, update, remove } = useNotes();
  const { brand } = chartColors();

  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [preview, setPreview] = useState(false);

  const selected = notes.find((n) => n.id === selectedId) || null;

  const totalWords = useMemo(() => notes.reduce((s, n) => s + wordCount(n.body), 0), [notes]);
  const weekAgo = Date.now() - 7 * 864e5;
  const thisWeek = notes.filter((n) => new Date(n.updatedAt).getTime() >= weekAgo).length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = notes.filter((n) => (n.updatedAt || "").slice(0, 10) === todayKey).length;

  const activity = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: "short" }), count: 0 });
    }
    notes.forEach((n) => {
      const k = (n.updatedAt || "").slice(0, 10);
      const day = days.find((d) => d.key === k);
      if (day) day.count += 1;
    });
    return days;
  }, [notes]);

  function startNew() {
    setEditing(true);
    setSelectedId(null);
    setEditTitle("");
    setEditBody("");
    setPreview(false);
  }
  function selectNote(note) {
    setSelectedId(note.id); setEditing(false); setEditTitle(note.title); setEditBody(note.body); setPreview(false);
  }
  function startEdit(note) {
    setSelectedId(note.id); setEditing(true); setEditTitle(note.title); setEditBody(note.body); setPreview(false);
  }
  async function saveEdit() {
    if (selectedId) {
      await update(selectedId, { title: editTitle, body: editBody });
      setEditing(false);
    } else {
      const id = await create({ title: editTitle || "Untitled", body: editBody });
      setSelectedId(id);
      setEditing(false);
    }
  }
  async function deleteNote(id) {
    await remove(id);
    if (selectedId === id) { setSelectedId(null); setEditing(false); }
  }

  function renderSegments(segs) {
    return segs.map((seg, i) => {
      switch (seg.type) {
        case "heading": return <strong key={i} className="block text-base font-black text-ink">{seg.content}</strong>;
        case "bold": return <strong key={i} className="font-bold text-ink">{seg.content}</strong>;
        case "italic": return <em key={i} className="italic text-muted">{seg.content}</em>;
        case "li": return <span key={i} className="block pl-3 text-ink before:content-['•'] before:mr-2 before:text-brand">{seg.content}</span>;
        case "br": return <br key={i} />;
        default: return <span key={i} className="text-ink">{seg.content}</span>;
      }
    });
  }

  return (
    <PageShell>
      <PageHeader title="Notes" subtitle="Capture ideas, plans and everything in between.">
        <Button variant="primary" size="md" onClick={startNew} className="gap-2"><Plus size={16} /> New note</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<FileText size={18} />} label="Total notes" value={notes.length} sub="In this workspace" />
        <StatTile icon={<Type size={18} />} label="Words written" value={totalWords} sub="Across all notes" />
        <StatTile icon={<CalendarClock size={18} />} label="This week" value={thisWeek} sub="Recently updated" />
        <StatTile icon={<Sparkles size={18} />} label="Today" value={today} sub="Touched today" />
      </div>

      <Panel title="Writing activity" subtitle="Notes updated over the last 7 days" className="mb-6">
        <ChartBox height={170}>
          {(cw) => (
            <BarChart width={cw} height={170} data={activity} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="ffNotes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand} stopOpacity={1} />
                  <stop offset="100%" stopColor={brand} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={hexToRgba(brand, 0.1)} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} dy={4} tick={{ fontSize: 11, fontWeight: 700, fill: "#8A93A0" }} />
              <YAxis axisLine={false} tickLine={false} width={28} allowDecimals={false} tick={{ fontSize: 11, fill: "#8A93A0" }} />
              <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} />
              <Bar dataKey="count" name="Notes" radius={[6, 6, 0, 0]} fill="url(#ffNotes)" maxBarSize={34} />
            </BarChart>
          )}
        </ChartBox>
      </Panel>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        <Panel title="All notes">
          {notes.length === 0 ? (
            <EmptyState icon="📝" title="No notes yet" description="Create your first note" />
          ) : (
            <ul className="space-y-1 max-h-[520px] overflow-y-auto -mx-2 px-2">
              {notes.map((note) => (
                <li
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`rounded-token-md px-3 py-3 cursor-pointer transition-colors ${selectedId === note.id ? "bg-grad-hero text-on-brand" : "hover:bg-surface-2"}`}
                >
                  <p className={`font-bold text-sm truncate ${selectedId === note.id ? "text-on-brand" : "text-ink"}`}>{note.title || "Untitled"}</p>
                  <p className={`text-xs truncate mt-0.5 ${selectedId === note.id ? "text-on-brand/80" : "text-muted"}`}>{note.body?.slice(0, 60) || "Empty note"}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          {!selected && !editing ? (
            <EmptyState icon="🖊️" title="Select or create a note" description="Your note appears here" />
          ) : editing ? (
            <div className="space-y-3">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Note title" />
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Write your note here… (supports **bold**, *italic*, # heading, - list)" rows={14} />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setEditing(false); setPreview(false); }}>Cancel</Button>
                <Button variant="primary" onClick={saveEdit}>Save</Button>
              </div>
            </div>
          ) : selected ? (
            <div>
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h2 className="text-xl font-black text-ink min-w-0 truncate">{selected.title}</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>{preview ? "Raw" : "Preview"}</Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(selected)}>Edit</Button>
                  <DeleteButton onClick={() => deleteNote(selected.id)} title="Delete note" />
                </div>
              </div>
              {preview ? (
                <div className="leading-relaxed text-sm">{renderSegments(renderInline(selected.body || ""))}</div>
              ) : (
                <pre className="text-ink text-sm font-mono whitespace-pre-wrap bg-surface-2 rounded-token-md p-4 min-h-[160px]">{selected.body || "Empty note"}</pre>
              )}
            </div>
          ) : null}
        </Panel>
      </div>
    </PageShell>
  );
}
