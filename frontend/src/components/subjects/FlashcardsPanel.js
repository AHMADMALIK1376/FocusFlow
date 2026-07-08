import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button, Input, EmptyState, Badge } from "../ui";
import { Panel } from "../dashboard/DashKit";
import { useDecks } from "../../features/flashcards/useFlashcards";

export default function FlashcardsPanel({ subjectId }) {
  const navigate = useNavigate();
  const { decks, loading, createDeck } = useDecks(subjectId);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const id = await createDeck({ name: name.trim(), subjectId });
      setName("");
      navigate(`/flashcards/${id}`);
    } finally {
      setAdding(false);
    }
  }

  return (
    <Panel title="Flashcards" className="mb-6" right={<Button size="sm" variant="ghost" onClick={() => navigate("/flashcards")}>All decks</Button>}>
      {loading ? (
        <p className="text-sm text-muted py-4 text-center">Loading…</p>
      ) : decks.length === 0 ? (
        <EmptyState icon="🃏" title="No decks yet" description="Create a deck for this subject" />
      ) : (
        <ul className="divide-y divide-[rgb(var(--ink)/0.07)] mb-3">
          {decks.map((d) => (
            <li key={d.id} onClick={() => navigate(`/flashcards/${d.id}`)} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-surface-2 -mx-2 px-2 rounded-token-md transition-colors">
              <span className="text-lg">🃏</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-sm truncate">{d.name}</p>
                <p className="text-xs text-muted">{d.cardCount} card{d.cardCount === 1 ? "" : "s"}</p>
              </div>
              {d.dueCount > 0 && <Badge tone="focus">{d.dueCount} due</Badge>}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New deck name…" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="primary" size="sm" onClick={add} disabled={adding || !name.trim()} className="shrink-0 gap-1"><Plus size={14} /> Add</Button>
      </div>
    </Panel>
  );
}
