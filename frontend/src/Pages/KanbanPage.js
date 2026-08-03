import React, { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderKanban, CheckCircle2, Loader, CircleDashed, Plus, GripVertical } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from "recharts";
import { Card, Button, Input, ProgressRing, cx } from "../components/ui";
import { StatTile } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { useKanban } from "../features/kanban/useKanban";
import { cardsByColumn } from "../features/kanban/kanbanLogic";
import { useSubjects } from "../features/subjects/useSubjects";

const COLUMN_DOT = { "col-todo": "bg-warn", "col-doing": "bg-info", "col-done": "bg-success" };

function SortableCard({ card, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="bg-surface rounded-token-md shadow-neu-sm p-3 mb-2 group">
      <div className="flex items-start gap-2">
        <button className="text-muted/60 hover:text-muted cursor-grab active:cursor-grabbing py-0.5" {...attributes} {...listeners} aria-label="Drag">
          <GripVertical size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink break-words">{card.title}</p>
          {card.note && <p className="text-xs text-muted mt-0.5 break-words">{card.note}</p>}
          {(card.subjectName || card.dueDate) && (
            <div className="flex items-center gap-2 mt-1.5">
              {card.subjectName && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">{card.subjectName}</span>}
              {card.dueDate && <span className="text-[10px] text-muted">Due {card.dueDate}</span>}
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(card)} className="text-muted hover:text-ink text-xs p-1" aria-label="Edit">✏️</button>
          <button onClick={() => onRemove(card.id)} className="text-muted hover:text-focus text-xs p-1" aria-label="Delete">✕</button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { state, addCard: createCard, updateCard, removeCard, moveCard } = useKanban();
  const { subjects } = useSubjects();
  const { brand, accent } = chartColors();

  const [newCardText, setNewCardText] = useState({});
  const [editCard, setEditCard] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editNote, setEditNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createCol, setCreateCol] = useState("col-todo");
  const [createSubject, setCreateSubject] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const todo = cardsByColumn(state, "col-todo");
  const doing = cardsByColumn(state, "col-doing");
  const done = cardsByColumn(state, "col-done");
  const total = state.cards.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  const statusData = [
    { name: "To Do", value: todo.length, fill: hexToRgba(brand, 0.4) },
    { name: "In Progress", value: doing.length, fill: accent },
    { name: "Done", value: done.length, fill: brand },
  ];

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    for (const col of state.columns) {
      const cards = cardsByColumn(state, col.id);
      if (cards.some((c) => c.id === over.id)) {
        const toIndex = cards.findIndex((c) => c.id === over.id);
        moveCard(active.id, col.id, toIndex);
        return;
      }
    }
  }

  function addCard(colId) {
    const text = (newCardText[colId] || "").trim();
    if (!text) return;
    createCard(colId, { title: text });
    setNewCardText((prev) => ({ ...prev, [colId]: "" }));
  }

  function handleCreate() {
    const title = createTitle.trim();
    if (!title) return;
    createCard(createCol, { title, subjectId: createSubject || null });
    setCreateTitle("");
    setCreateSubject("");
    setCreating(false);
  }

  function startEdit(card) {
    setEditCard(card);
    setEditVal(card.title);
    setEditNote(card.note || "");
  }

  function saveEdit() {
    if (!editCard) return;
    updateCard(editCard.id, { title: editVal, note: editNote });
    setEditCard(null);
  }

  return (
    <div className="w-full px-3 sm:px-5 md:px-6 pb-10 pt-4">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink tracking-tight">Assignments</h1>
          <p className="text-muted mt-1">Plan assignments across your subjects — drag between columns.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setCreating(true)} className="gap-2">
          <Plus size={16} /> Add task
        </Button>
      </header>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<FolderKanban size={18} />} label="Total tasks" value={total} sub="Across the board" />
        <StatTile icon={<CheckCircle2 size={18} />} label="Ended" value={done.length} sub="Completed" />
        <StatTile icon={<Loader size={18} />} label="Running" value={doing.length} sub="In progress" />
        <StatTile icon={<CircleDashed size={18} />} label="Pending" value={todo.length} sub="Still to do" />
      </div>

      {/* Analytics + progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <section className="lg:col-span-2 bg-surface rounded-token-lg shadow-neu p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-ink">Project analytics</h3>
          <p className="text-xs text-muted mt-0.5 mb-2">Tasks by status</p>
          <ChartBox height={230}>
            {(cw) => (
              <BarChart width={cw} height={230} data={statusData} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={hexToRgba(brand, 0.1)} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={4} tick={{ fontSize: 12, fontWeight: 700, fill: "#8A93A0" }} />
                <YAxis axisLine={false} tickLine={false} width={28} allowDecimals={false} tick={{ fontSize: 11, fill: "#8A93A0" }} />
                <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 13, fontWeight: 800, fill: "rgb(54 54 54)" }} />
                </Bar>
              </BarChart>
            )}
          </ChartBox>
        </section>

        <section className="bg-surface rounded-token-lg shadow-neu p-6 flex flex-col items-center">
          <h3 className="text-sm font-black uppercase tracking-wider text-ink self-start mb-3">Progress</h3>
          <ProgressRing value={pct} size={150} stroke={15}>
            <div className="text-center">
              <p className="text-3xl font-black text-ink">{pct}%</p>
              <p className="text-[10px] uppercase tracking-widest text-muted">complete</p>
            </div>
          </ProgressRing>
          <p className="text-sm text-muted mt-4 font-medium">{done.length} of {total} tasks done</p>
        </section>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.columns.map((col) => {
            const cards = cardsByColumn(state, col.id);
            return (
              <div key={col.id} className="bg-surface-2 rounded-token-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cx("w-2.5 h-2.5 rounded-full", COLUMN_DOT[col.id] || "bg-brand")} />
                    <h3 className="text-sm font-black uppercase tracking-wider text-ink">{col.title}</h3>
                  </div>
                  <span className="text-xs font-bold bg-surface rounded-token-sm px-2 py-0.5 text-muted shadow-neu-sm">{cards.length}</span>
                </div>

                <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {cards.length === 0 ? (
                    <div className="text-center py-6 text-muted text-sm">No cards</div>
                  ) : (
                    cards.map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        onEdit={startEdit}
                        onRemove={(id) => removeCard(id)}
                      />
                    ))
                  )}
                </SortableContext>

                <div className="flex gap-1.5 mt-2">
                  <Input
                    value={newCardText[col.id] || ""}
                    onChange={(e) => setNewCardText((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    placeholder="+ Add card…"
                    onKeyDown={(e) => e.key === "Enter" && addCard(col.id)}
                    className="py-2 px-3 text-sm"
                  />
                  <Button size="sm" variant="primary" onClick={() => addCard(col.id)}>+</Button>
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--ink)/0.25)] backdrop-blur-sm p-4" onClick={() => setCreating(false)}>
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">New task</h3>
            <div className="space-y-2.5">
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Task title…" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
              <select
                value={createCol}
                onChange={(e) => setCreateCol(e.target.value)}
                className="w-full rounded-token-md bg-surface text-ink shadow-neu-inset outline-none font-medium py-3 px-4 appearance-none cursor-pointer focus:ring-2 focus:ring-brand/60"
              >
                {state.columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                className="w-full rounded-token-md bg-surface text-ink shadow-neu-inset outline-none font-medium py-3 px-4 appearance-none cursor-pointer focus:ring-2 focus:ring-brand/60"
              >
                <option value="">No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreate}>Add task</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit modal */}
      {editCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--ink)/0.25)] backdrop-blur-sm p-4" onClick={() => setEditCard(null)}>
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">Edit card</h3>
            <div className="space-y-2.5">
              <Input value={editVal} onChange={(e) => setEditVal(e.target.value)} placeholder="Card title…" autoFocus />
              <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note (optional)" />
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={() => setEditCard(null)}>Cancel</Button>
                <Button variant="primary" onClick={saveEdit}>Save</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
