import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { Button, Input, Badge, EmptyState, DeleteButton } from "../ui";
import { Panel } from "../dashboard/DashKit";
import { useKanban } from "../../features/kanban/useKanban";

const COL_LABEL = { "col-todo": "To do", "col-doing": "In progress", "col-done": "Done" };
const COL_TONE = { "col-todo": "muted", "col-doing": "info", "col-done": "success" };

export default function AssignmentsPanel({ subjectId }) {
  const navigate = useNavigate();
  const { state, loading, addCard, moveCard, removeCard } = useKanban(subjectId);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const cards = state.cards;

  async function add() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await addCard("col-todo", { title: title.trim(), subjectId });
      setTitle("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Panel title="Assignments" className="mb-6" right={<Button size="sm" variant="ghost" onClick={() => navigate("/projects")}>Board</Button>}>
      <div className="flex gap-2 mb-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New assignment…" onKeyDown={(e) => e.key === "Enter" && add()} className="!py-2 !px-3 text-sm" />
        <Button size="sm" variant="primary" onClick={add} disabled={adding || !title.trim()} className="shrink-0 gap-1"><Plus size={14} /> Add</Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted py-4 text-center">Loading…</p>
      ) : cards.length === 0 ? (
        <EmptyState icon="📝" title="No assignments yet" description="Add one above" />
      ) : (
        <ul className="divide-y divide-[rgb(var(--ink)/0.07)]">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <button
                onClick={() => moveCard(c.id, c.columnId === "col-done" ? "col-todo" : "col-done", 0)}
                title="Toggle done"
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${c.columnId === "col-done" ? "bg-success border-success text-white" : "border-[rgb(var(--brand)/0.4)]"}`}
              >
                {c.columnId === "col-done" && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${c.columnId === "col-done" ? "line-through text-muted" : "text-ink"}`}>{c.title}</p>
                <div className="flex items-center gap-2">
                  <Badge tone={COL_TONE[c.columnId] || "muted"}>{COL_LABEL[c.columnId] || c.columnId}</Badge>
                  {c.dueDate && <span className="text-[10px] text-muted">Due {c.dueDate}</span>}
                </div>
              </div>
              <DeleteButton onClick={() => removeCard(c.id)} title="Delete" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
