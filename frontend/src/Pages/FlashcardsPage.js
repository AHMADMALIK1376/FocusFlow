import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Layers, CalendarClock, GraduationCap } from "lucide-react";
import { Button, Input, Textarea, Select, Field, Modal, EmptyState, DeleteButton, Badge } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import { useDecks } from "../features/flashcards/useFlashcards";
import { useSubjects } from "../features/subjects/useSubjects";

const EMPTY = { name: "", subjectId: "", description: "" };

export default function FlashcardsPage() {
  const navigate = useNavigate();
  const { decks, loading, createDeck, deleteDeck } = useDecks();
  const { subjects } = useSubjects();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const totalCards = decks.reduce((s, d) => s + (d.cardCount || 0), 0);
  const dueTotal = decks.reduce((s, d) => s + (d.dueCount || 0), 0);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createDeck({ name: form.name.trim(), subjectId: form.subjectId || null, description: form.description || null });
      setOpen(false); setForm(EMPTY);
    } finally {
      setSaving(false);
    }
  }
  async function onDelete(d) { if (window.confirm(`Delete deck "${d.name}" and its cards?`)) await deleteDeck(d.id); }

  return (
    <PageShell>
      <PageHeader title="Flashcards" subtitle="Study with spaced repetition — review what's due, remember for longer.">
        <Button variant="primary" onClick={() => { setForm(EMPTY); setOpen(true); }} className="gap-1.5"><Plus size={16} /> New deck</Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile primary icon={<Layers size={18} />} label="Decks" value={decks.length} sub="Collections" />
        <StatTile icon={<GraduationCap size={18} />} label="Cards" value={totalCards} sub="Total" />
        <StatTile icon={<CalendarClock size={18} />} label="Due today" value={dueTotal} sub="To review" />
      </div>

      {loading ? (
        <Panel><p className="text-sm text-muted py-8 text-center">Loading…</p></Panel>
      ) : decks.length === 0 ? (
        <Panel><EmptyState icon="🃏" title="No decks yet" description="Create a deck and add cards to start studying" /></Panel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d) => (
            <div key={d.id} className="bg-surface rounded-token-lg shadow-neu overflow-hidden flex">
              <div className="w-1.5 shrink-0" style={{ background: d.subjectColor || "rgb(var(--brand))" }} />
              <div className="p-5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => navigate(`/flashcards/${d.id}`)} className="min-w-0 text-left">
                    {d.subjectName && <Badge tone="muted">{d.subjectName}</Badge>}
                    <h3 className="font-black text-ink text-lg mt-1.5 truncate">{d.name}</h3>
                  </button>
                  <DeleteButton onClick={() => onDelete(d)} title="Delete deck" />
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgb(var(--ink)/0.07)]">
                  <span className="text-xs font-bold text-muted">{d.cardCount} card{d.cardCount === 1 ? "" : "s"}</span>
                  {d.dueCount > 0 && <Badge tone="focus">{d.dueCount} due</Badge>}
                  <Button size="sm" variant="soft" onClick={() => navigate(`/flashcards/${d.id}`)} className="ml-auto">Open</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New deck">
        <div className="space-y-4">
          <Field label="Deck name"><Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="e.g. DS Terminology" autoFocus /></Field>
          <Field label="Subject (optional)">
            <Select value={form.subjectId} onChange={(e) => setF("subjectId", e.target.value)}>
              <option value="">None</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Optional" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Creating…" : "Create deck"}</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
