import React, { useMemo, useState } from "react";
import { Users, Tag, Mail, Phone, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Button, Input, EmptyState, Avatar, Badge } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useContacts } from "../features/contacts/useContacts";
import { search, allTags } from "../features/contacts/contactsLogic";

export default function ContactsPage() {
  const { state, dispatch } = useContacts();
  const { activeDashboard } = usePreferences();
  const { brand } = chartColors(activeDashboard?.palette);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", tags: "" });
  const [editId, setEditId] = useState(null);

  const filtered = search(state, query);
  const selected = state.contacts.find((c) => c.id === selectedId) || null;
  const tags = allTags(state);
  const withEmail = state.contacts.filter((c) => c.email).length;
  const withPhone = state.contacts.filter((c) => c.phone).length;

  const tagBars = useMemo(
    () => tags.map((tag) => ({ name: tag, count: state.contacts.filter((c) => (c.tags || []).includes(tag)).length }))
      .sort((a, b) => b.count - a.count).slice(0, 6),
    [tags, state.contacts]
  );

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function submit() {
    const payload = {
      name: form.name.trim(), role: form.role.trim(), phone: form.phone.trim(), email: form.email.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (!payload.name) return;
    if (editId) { dispatch({ type: "UPDATE", payload: { id: editId, patch: payload } }); setEditId(null); }
    else dispatch({ type: "ADD", payload });
    setForm({ name: "", role: "", phone: "", email: "", tags: "" });
    setShowForm(false);
  }
  function startEdit(c) {
    setForm({ name: c.name || "", role: c.role || "", phone: c.phone || "", email: c.email || "", tags: (c.tags || []).join(", ") });
    setEditId(c.id); setShowForm(true);
  }
  function remove(id) { dispatch({ type: "REMOVE", payload: { id } }); if (selectedId === id) setSelectedId(null); }

  return (
    <PageShell>
      <PageHeader title="Contacts" subtitle="Your people, organised and a tap away.">
        <Button variant="primary" size="md" onClick={() => { setShowForm((s) => !s); setEditId(null); setForm({ name: "", role: "", phone: "", email: "", tags: "" }); }} className="gap-1.5">
          <Plus size={16} /> {showForm ? "Close" : "Add contact"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<Users size={18} />} label="Contacts" value={state.contacts.length} sub="In your book" />
        <StatTile icon={<Tag size={18} />} label="Tags" value={tags.length} sub="Unique groups" />
        <StatTile icon={<Mail size={18} />} label="With email" value={withEmail} sub="Reachable by mail" />
        <StatTile icon={<Phone size={18} />} label="With phone" value={withPhone} sub="Reachable by call" />
      </div>

      {showForm && (
        <Panel title={editId ? "Edit contact" : "New contact"} className="mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Name *" />
            <Input value={form.role} onChange={(e) => setField("role", e.target.value)} placeholder="Role / relation" />
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Phone" />
            <Input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="Email" type="email" />
            <Input value={form.tags} onChange={(e) => setField("tags", e.target.value)} placeholder="Tags (comma separated)" className="md:col-span-2" />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            <Button variant="primary" onClick={submit}>{editId ? "Save" : "Create"}</Button>
          </div>
        </Panel>
      )}

      {tagBars.length > 0 && (
        <Panel title="Contacts by tag" subtitle="Your most common groups" className="mb-5">
          <ChartBox height={Math.max(140, tagBars.length * 42)}>
            {(cw) => (
              <BarChart width={cw} height={Math.max(140, tagBars.length * 42)} layout="vertical" data={tagBars} margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="ffContacts" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={brand} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={brand} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 12, fontWeight: 700, fill: "rgb(54 54 54)" }} />
                <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} formatter={(v) => [`${v} contact${v === 1 ? "" : "s"}`, ""]} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="url(#ffContacts)" maxBarSize={22} background={{ fill: hexToRgba(brand, 0.07) }}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 800, fill: "rgb(54 54 54)" }} />
                </Bar>
              </BarChart>
            )}
          </ChartBox>
        </Panel>
      )}

      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        <Panel title="Directory">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts…" className="mb-3" />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.map((tag) => (
                <button key={tag} onClick={() => setQuery(query === tag ? "" : tag)} className={`text-xs font-bold rounded-token-sm px-2 py-0.5 transition-colors ${query === tag ? "bg-brand text-on-brand" : "bg-surface-2 text-muted hover:text-ink"}`}>{tag}</button>
              ))}
            </div>
          )}
          {filtered.length === 0 ? (
            <EmptyState icon="👤" title="No contacts found" description="Add one to get started" />
          ) : (
            <ul className="space-y-1 max-h-[440px] overflow-y-auto -mx-1 px-1">
              {filtered.map((c) => (
                <li key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`flex items-center gap-3 rounded-token-md px-3 py-2 cursor-pointer transition-colors ${selectedId === c.id ? "bg-grad-hero shadow-neu-sm" : "hover:bg-surface-2"}`}>
                  <Avatar name={c.name} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${selectedId === c.id ? "text-on-brand" : "text-ink"}`}>{c.name}</p>
                    <p className={`text-xs truncate ${selectedId === c.id ? "text-on-brand/80" : "text-muted"}`}>{c.role || c.email || "—"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          {!selected ? (
            <EmptyState icon="👤" title="Select a contact" description="View their details here" />
          ) : (
            <div>
              <div className="flex items-start gap-4 mb-6">
                <Avatar name={selected.name} size={56} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black text-ink truncate">{selected.name}</h2>
                  {selected.role && <p className="text-muted text-sm">{selected.role}</p>}
                  {(selected.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">{selected.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(selected)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(selected.id)}>Delete</Button>
                </div>
              </div>
              <div className="space-y-3">
                {selected.phone && (
                  <div className="bg-surface-2 rounded-token-md px-4 py-3">
                    <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Phone</p>
                    <p className="text-ink font-bold">{selected.phone}</p>
                  </div>
                )}
                {selected.email && (
                  <div className="bg-surface-2 rounded-token-md px-4 py-3">
                    <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Email</p>
                    <p className="text-ink font-bold break-all">{selected.email}</p>
                  </div>
                )}
                {selected.createdAt && <p className="text-xs text-muted">Added {selected.createdAt.slice(0, 10)}</p>}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
