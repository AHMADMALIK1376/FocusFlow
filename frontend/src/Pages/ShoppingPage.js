import React, { useMemo, useState } from "react";
import { ShoppingCart, Package, CheckCheck, ListTodo, Plus } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Button, Input, EmptyState, Checkbox, DeleteButton } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useShopping } from "../features/shopping/useShopping";
import { listProgress } from "../features/shopping/shoppingLogic";

export default function ShoppingPage() {
  const { state, dispatch } = useShopping();
  const { activeDashboard } = usePreferences();
  const { brand } = chartColors(activeDashboard?.palette);

  const [selectedListId, setSelectedListId] = useState(null);
  const [newListName, setNewListName] = useState("");
  const [newItem, setNewItem] = useState("");

  const { lists } = state;
  const selectedList = lists.find((l) => l.id === selectedListId) || null;

  const totals = useMemo(() => {
    let total = 0, bought = 0;
    lists.forEach((l) => { (l.items || []).forEach((i) => { total += 1; if (i.checked) bought += 1; }); });
    return { total, bought, remaining: total - bought };
  }, [lists]);

  const donutData = [
    { name: "Bought", value: totals.bought },
    { name: "Remaining", value: totals.remaining },
  ];
  const listBars = lists.map((l) => ({ name: l.name.length > 16 ? l.name.slice(0, 15) + "…" : l.name, pct: listProgress(l).pct }));

  function addList() {
    if (!newListName.trim()) return;
    dispatch({ type: "ADD_LIST", payload: { name: newListName.trim() } });
    setNewListName("");
  }
  function addItem() {
    if (!newItem.trim() || !selectedListId) return;
    dispatch({ type: "ADD_ITEM", payload: { listId: selectedListId, text: newItem.trim() } });
    setNewItem("");
  }

  return (
    <PageShell>
      <PageHeader title="Shopping" subtitle="Keep your lists tidy and never forget an item." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<ShoppingCart size={18} />} label="Lists" value={lists.length} sub="Active lists" />
        <StatTile icon={<Package size={18} />} label="Total items" value={totals.total} sub="Across all lists" />
        <StatTile icon={<CheckCheck size={18} />} label="Bought" value={totals.bought} sub="Checked off" />
        <StatTile icon={<ListTodo size={18} />} label="Remaining" value={totals.remaining} sub="Still to buy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Panel title="Overall progress" subtitle="Bought vs remaining">
          {totals.total === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted">Add items to see progress.</div>
          ) : (
            <ChartBox height={210}>
              {(cw) => (
                <PieChart width={cw} height={210}>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none" isAnimationActive={false}>
                    <Cell fill={brand} />
                    <Cell fill={hexToRgba(brand, 0.18)} />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v, n) => [`${v} items`, n]} />
                </PieChart>
              )}
            </ChartBox>
          )}
        </Panel>

        <Panel title="Progress by list" subtitle="How complete each list is" className="lg:col-span-2">
          {listBars.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted">Create a list to get started.</div>
          ) : (
            <ChartBox height={Math.max(150, listBars.length * 46)}>
              {(cw) => (
                <BarChart width={cw} height={Math.max(150, listBars.length * 46)} layout="vertical" data={listBars} margin={{ top: 0, right: 44, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ffShop" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={brand} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={brand} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 12, fontWeight: 700, fill: "rgb(54 54 54)" }} />
                  <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} formatter={(v) => [`${v}%`, "Done"]} />
                  <Bar dataKey="pct" radius={[0, 8, 8, 0]} fill="url(#ffShop)" maxBarSize={22} background={{ fill: hexToRgba(brand, 0.07) }}>
                    <LabelList dataKey="pct" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fontWeight: 800, fill: "rgb(54 54 54)" }} />
                  </Bar>
                </BarChart>
              )}
            </ChartBox>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        <Panel title="Lists">
          <div className="flex gap-2 mb-3">
            <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list…" onKeyDown={(e) => e.key === "Enter" && addList()} className="py-2 px-3" />
            <Button variant="primary" size="sm" onClick={addList} className="shrink-0"><Plus size={16} /></Button>
          </div>
          {lists.length === 0 ? (
            <EmptyState icon="🛒" title="No lists yet" description="Create your first list above" />
          ) : (
            <ul className="space-y-1.5 max-h-[440px] overflow-y-auto -mx-1 px-1">
              {lists.map((list) => {
                const prog = listProgress(list);
                const active = selectedListId === list.id;
                return (
                  <li key={list.id} onClick={() => setSelectedListId(list.id)}
                    className={`rounded-token-md px-3 py-2.5 cursor-pointer transition-colors ${active ? "bg-grad-hero shadow-neu-sm" : "hover:bg-surface-2"}`}>
                    <p className={`font-bold text-sm truncate ${active ? "text-on-brand" : "text-ink"}`}>{list.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`flex-1 rounded-full h-1 ${active ? "bg-[rgb(var(--on-brand)/0.25)]" : "bg-[rgb(var(--ink)/0.1)]"}`}>
                        <div className={`h-1 rounded-full ${active ? "bg-on-brand" : "bg-brand"}`} style={{ width: `${prog.pct}%` }} />
                      </div>
                      <span className={`text-xs shrink-0 ${active ? "text-on-brand/80" : "text-muted"}`}>{prog.checked}/{prog.total}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          {!selectedList ? (
            <EmptyState icon="📋" title="Select a list" description="View and tick off its items" />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-ink truncate">{selectedList.name}</h2>
                  <span className="text-sm text-muted">{listProgress(selectedList).checked} of {listProgress(selectedList).total} done</span>
                </div>
                <DeleteButton onClick={() => { dispatch({ type: "REMOVE_LIST", payload: { id: selectedList.id } }); setSelectedListId(null); }} title="Delete list" />
              </div>
              <div className="flex gap-2 mb-4">
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add item…" onKeyDown={(e) => e.key === "Enter" && addItem()} />
                <Button variant="primary" size="sm" onClick={addItem} className="shrink-0">Add</Button>
              </div>
              {selectedList.items.length === 0 ? (
                <EmptyState icon="📋" title="No items in this list" description="Add something above" />
              ) : (
                <ul className="space-y-1.5">
                  {selectedList.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2.5">
                      <Checkbox checked={item.checked} size={22} onChange={() => dispatch({ type: "TOGGLE_ITEM", payload: { listId: selectedList.id, itemId: item.id } })} />
                      <span className={`flex-1 text-sm ${item.checked ? "line-through text-muted" : "text-ink"}`}>{item.text}</span>
                      <button onClick={() => dispatch({ type: "REMOVE_ITEM", payload: { listId: selectedList.id, itemId: item.id } })} className="text-muted hover:text-focus text-xs">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
