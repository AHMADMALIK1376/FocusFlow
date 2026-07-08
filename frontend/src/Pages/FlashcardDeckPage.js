import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Play, Check, X, RotateCcw } from "lucide-react";
import { Button, Input, Field, Modal, EmptyState, DeleteButton, Badge } from "../components/ui";
import { PageShell, Panel } from "../components/dashboard/DashKit";
import { useDeck } from "../features/flashcards/useFlashcards";

const TODAY = new Date().toISOString().slice(0, 10);
const isDue = (c) => !c.dueDate || c.dueDate <= TODAY;

export default function FlashcardDeckPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { deck, loading, error, addCard, updateCard, deleteCard, reviewCard } = useDeck(deckId);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editCard, setEditCard] = useState(null);
  const [editForm, setEditForm] = useState({ front: "", back: "" });

  const [queue, setQueue] = useState(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cards = deck?.cards || [];
  const dueCards = cards.filter(isDue);

  async function onAdd() {
    if (!front.trim() || !back.trim()) return;
    await addCard({ front: front.trim(), back: back.trim() });
    setFront(""); setBack("");
  }
  function openEdit(c) { setEditCard(c); setEditForm({ front: c.front, back: c.back }); }
  async function saveEdit() { await updateCard(editCard.id, { front: editForm.front, back: editForm.back }); setEditCard(null); }
  async function onDeleteCard(c) { if (window.confirm("Delete this card?")) await deleteCard(c.id); }

  function startStudy() {
    const q = (dueCards.length ? dueCards : cards).slice();
    if (!q.length) return;
    setQueue(q); setIdx(0); setFlipped(false);
  }
  async function rate(correct) {
    const card = queue[idx];
    await reviewCard(card.id, correct);
    if (idx + 1 >= queue.length) setQueue(null);
    else { setIdx(idx + 1); setFlipped(false); }
  }

  if (loading) return <PageShell><Panel><p className="text-sm text-muted py-8 text-center">Loading…</p></Panel></PageShell>;
  if (error || !deck) return <PageShell><Panel><EmptyState icon="🃏" title="Deck not found" /></Panel></PageShell>;

  return (
    <PageShell>
      <button onClick={() => navigate("/flashcards")} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-brand mb-4 transition-colors"><ArrowLeft size={16} /> Flashcards</button>

      <div className="bg-surface rounded-token-lg shadow-neu overflow-hidden flex mb-6">
        <div className="w-2 shrink-0" style={{ background: deck.subjectColor || "rgb(var(--brand))" }} />
        <div className="p-6 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              {deck.subjectName && <Badge tone="brand">{deck.subjectName}</Badge>}
              <h1 className="text-3xl font-black text-ink tracking-tight truncate">{deck.name}</h1>
              <p className="text-muted mt-1 text-sm">{cards.length} card{cards.length === 1 ? "" : "s"} · {dueCards.length} due</p>
            </div>
            <Button variant="primary" onClick={startStudy} disabled={!cards.length} className="gap-1.5"><Play size={16} /> Study{dueCards.length ? ` (${dueCards.length})` : ""}</Button>
          </div>
        </div>
      </div>

      <Panel title="Add a card" className="mb-6">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-xs font-bold text-muted block mb-1">Front (question)</label>
            <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Term / question" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted block mb-1">Back (answer)</label>
            <Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Definition / answer" onKeyDown={(e) => e.key === "Enter" && onAdd()} />
          </div>
          <Button variant="primary" onClick={onAdd} disabled={!front.trim() || !back.trim()} className="gap-1"><Plus size={16} /> Add</Button>
        </div>
      </Panel>

      <Panel title={`Cards (${cards.length})`}>
        {cards.length === 0 ? (
          <EmptyState icon="🃏" title="No cards yet" description="Add your first card above" />
        ) : (
          <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <Badge tone={isDue(c) ? "focus" : "muted"}>B{c.box}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{c.front}</p>
                  <p className="text-xs text-muted truncate">{c.back}</p>
                </div>
                <span className="text-[11px] text-muted shrink-0">{isDue(c) ? "due" : c.dueDate}</span>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand/10 transition-colors" title="Edit card"><Pencil size={15} /></button>
                <DeleteButton onClick={() => onDeleteCard(c)} title="Delete card" />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal open={!!editCard} onClose={() => setEditCard(null)} title="Edit card">
        <div className="space-y-4">
          <Field label="Front"><Input value={editForm.front} onChange={(e) => setEditForm((f) => ({ ...f, front: e.target.value }))} autoFocus /></Field>
          <Field label="Back"><Input value={editForm.back} onChange={(e) => setEditForm((f) => ({ ...f, back: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditCard(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit} disabled={!editForm.front.trim() || !editForm.back.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      {queue && (
        <div className="fixed inset-0 z-[1000] bg-canvas flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-muted">{idx + 1} / {queue.length}</span>
              <button onClick={() => setQueue(null)} className="text-muted hover:text-focus" title="Close"><X size={20} /></button>
            </div>
            <div onClick={() => setFlipped((f) => !f)} className="bg-surface rounded-token-lg shadow-neu p-10 min-h-[240px] flex flex-col items-center justify-center text-center cursor-pointer select-none">
              <span className="text-[10px] uppercase tracking-widest text-muted mb-3">{flipped ? "Answer" : "Question"}</span>
              <p className="text-2xl font-black text-ink">{flipped ? queue[idx].back : queue[idx].front}</p>
              {!flipped && <span className="text-xs text-muted mt-6 inline-flex items-center gap-1"><RotateCcw size={12} /> tap to flip</span>}
            </div>
            {flipped ? (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button variant="soft" onClick={() => rate(false)} className="gap-1.5"><X size={16} /> Missed</Button>
                <Button variant="primary" onClick={() => rate(true)} className="gap-1.5"><Check size={16} /> Got it</Button>
              </div>
            ) : (
              <Button variant="primary" full onClick={() => setFlipped(true)} className="mt-4">Show answer</Button>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
