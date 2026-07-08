import React, { useMemo, useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Save } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Button, Input, Select, EmptyState } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useFinance } from "../features/finance/useFinance";
import { totals, byCategory } from "../features/finance/financeLogic";

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH = TODAY.slice(0, 7);
const INCOME_COLOR = "#22A06B";
const EXPENSE_COLOR = "#E0606B";
const CURRENCIES = { PKR: "₨", USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "AED " };

export default function FinancePage() {
  const { state, entries, settings, addEntry, removeEntry, saveSettings } = useFinance();
  const { activeDashboard } = usePreferences();
  const { brand, accent } = chartColors(activeDashboard?.palette);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(TODAY);
  const [filterType, setFilterType] = useState("all");

  const [allowance, setAllowance] = useState(0);
  const [savings, setSavings] = useState(0);
  const [currency, setCurrency] = useState("PKR");
  useEffect(() => {
    setAllowance(settings.monthlyAllowance || 0);
    setSavings(settings.savingsGoal || 0);
    setCurrency(settings.currency || "PKR");
  }, [settings]);

  const cur = CURRENCIES[currency] || `${currency} `;
  const fmt = (n) => `${cur}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const { balance } = totals(state);
  const monthExpense = entries.filter((e) => e.type === "expense" && (e.date || "").slice(0, 7) === MONTH).reduce((s, e) => s + e.amount, 0);
  const remaining = (settings.monthlyAllowance || 0) - monthExpense;
  const savingsPct = settings.savingsGoal > 0 ? Math.min(100, Math.round((balance / settings.savingsGoal) * 100)) : 0;

  const expenseCats = byCategory(state, "expense");
  const pieData = useMemo(() => Object.entries(expenseCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [expenseCats]);
  const pieColors = [brand, accent, hexToRgba(brand, 0.6), hexToRgba(accent, 0.6), hexToRgba(brand, 0.35), hexToRgba(accent, 0.85)];

  const cashFlow = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: "short" }), income: 0, expense: 0 });
    }
    entries.forEach((e) => { const day = days.find((d) => d.key === e.date); if (day) day[e.type] += e.amount; });
    return days;
  }, [entries]);

  async function submitEntry() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    await addEntry({ type, amount: amt, category: category || "General", note, date });
    setAmount(""); setCategory(""); setNote(""); setDate(TODAY);
  }

  const filtered = filterType === "all" ? entries : entries.filter((e) => e.type === filterType);

  return (
    <PageShell>
      <PageHeader title="Budget" subtitle="Track your pocket money — allowance in, spending out." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<Wallet size={18} />} label="Monthly allowance" value={fmt(settings.monthlyAllowance)} sub="This month" />
        <StatTile icon={<TrendingDown size={18} />} label="Spent this month" value={fmt(monthExpense)} sub="Expenses" />
        <StatTile icon={<TrendingUp size={18} />} label="Remaining" value={fmt(remaining)} sub="Allowance − spent" />
        <StatTile icon={<PiggyBank size={18} />} label="Saved" value={fmt(balance)} sub={settings.savingsGoal > 0 ? `${savingsPct}% of goal` : "Income − expenses"} />
      </div>

      <Panel title="Budget settings" subtitle="Your allowance, savings target and currency" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-muted block mb-1">Monthly allowance</label>
            <Input type="number" min="0" value={allowance} onChange={(e) => setAllowance(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted block mb-1">Savings goal</label>
            <Input type="number" min="0" value={savings} onChange={(e) => setSavings(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted block mb-1">Currency</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.keys(CURRENCIES).map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <Button variant="primary" onClick={() => saveSettings({ monthlyAllowance: Number(allowance) || 0, currency, savingsGoal: Number(savings) || 0 })} className="gap-1.5"><Save size={16} /> Save</Button>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Panel title="Spending by category" subtitle="Where your money goes">
          {pieData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted">Add expenses to see the breakdown.</div>
          ) : (
            <ChartBox height={210}>
              {(cw) => (
                <PieChart width={cw} height={210}>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {pieData.map((d, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v) => [fmt(v), "Spent"]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                </PieChart>
              )}
            </ChartBox>
          )}
        </Panel>

        <Panel title="Cash flow" subtitle="Money in vs out, last 7 days" className="lg:col-span-2">
          <ChartBox height={210}>
            {(cw) => (
              <BarChart width={cw} height={210} data={cashFlow} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={hexToRgba(brand, 0.1)} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} dy={4} tick={{ fontSize: 11, fontWeight: 700, fill: "#8A93A0" }} />
                <YAxis axisLine={false} tickLine={false} width={34} tick={{ fontSize: 11, fill: "#8A93A0" }} />
                <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} formatter={(v, n) => [fmt(v), n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 6 }} />
                <Bar dataKey="income" name="Income" radius={[5, 5, 0, 0]} fill={INCOME_COLOR} maxBarSize={18} />
                <Bar dataKey="expense" name="Expense" radius={[5, 5, 0, 0]} fill={EXPENSE_COLOR} maxBarSize={18} />
              </BarChart>
            )}
          </ChartBox>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-5">
        <Panel title="Add entry">
          <div className="space-y-2.5">
            <div className="flex rounded-token-md overflow-hidden border border-[rgb(var(--ink)/0.12)]">
              {["income", "expense"].map((tp) => (
                <button key={tp} onClick={() => setType(tp)} className={`flex-1 py-2.5 text-sm font-black uppercase tracking-wide transition-colors ${type === tp ? "bg-grad-hero text-on-brand" : "bg-surface-2 text-muted hover:text-ink"}`}>{tp}</button>
              ))}
            </div>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" min="0" step="0.01" />
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. Food)" />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button variant="primary" onClick={submitEntry} className="w-full gap-1.5"><Plus size={16} /> Add entry</Button>
          </div>
        </Panel>

        <Panel
          title="Entries"
          right={
            <div className="flex gap-1">
              {["all", "income", "expense"].map((f) => (
                <button key={f} onClick={() => setFilterType(f)} className={`text-[11px] font-bold px-2.5 py-1 rounded-token-sm capitalize transition-colors ${filterType === f ? "bg-brand text-on-brand" : "bg-surface-2 text-muted hover:text-ink"}`}>{f}</button>
              ))}
            </div>
          }
        >
          {filtered.length === 0 ? (
            <EmptyState icon="💰" title="No entries yet" description="Add your first income or expense" />
          ) : (
            <ul className="space-y-2 max-h-[460px] overflow-y-auto -mx-1 px-1">
              {filtered.map((e) => (
                <li key={e.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2.5">
                  <span className={`text-lg ${e.type === "income" ? "text-success" : "text-focus"}`}>{e.type === "income" ? "▲" : "▼"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{e.category}</p>
                    {e.note && <p className="text-xs text-muted truncate">{e.note}</p>}
                  </div>
                  <span className="text-xs text-muted shrink-0">{e.date}</span>
                  <span className={`font-black text-sm shrink-0 ${e.type === "income" ? "text-success" : "text-focus"}`}>{fmt(e.amount)}</span>
                  <button onClick={() => removeEntry(e.id)} className="text-muted hover:text-focus text-xs shrink-0">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
