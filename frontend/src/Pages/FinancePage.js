import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, EmptyState, StatCard } from '../components/ui';
import { useFinance } from '../features/finance/useFinance';
import { totals, byCategory } from '../features/finance/financeLogic';

const TODAY = new Date().toISOString().slice(0, 10);

export default function FinancePage() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(TODAY);
  const [filterType, setFilterType] = useState('all');

  const { income, expense, balance } = totals(state);
  const expenseCats = byCategory(state, 'expense');
  const maxExpense = Math.max(...Object.values(expenseCats), 1);

  function addEntry() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    dispatch({ type: 'ADD', payload: { type, amount: amt, category: category || 'General', note, date } });
    setAmount('');
    setCategory('');
    setNote('');
    setDate(TODAY);
  }

  const filtered = filterType === 'all' ? state.entries : state.entries.filter(e => e.type === filterType);

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-black tracking-tight text-ink mb-8">{t('finance.title', { defaultValue: 'Finance' })}</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon="💚" label={t('finance.income', { defaultValue: 'Income' })} value={`$${income.toFixed(2)}`} tone="success" />
        <StatCard icon="🔴" label={t('finance.expenses', { defaultValue: 'Expenses' })} value={`$${expense.toFixed(2)}`} tone="focus" />
        <StatCard icon="💰" label={t('finance.balance', { defaultValue: 'Balance' })} value={`$${balance.toFixed(2)}`} tone={balance >= 0 ? 'brand' : 'warn'} />
      </div>

      <div className="md:grid md:grid-cols-[340px_1fr] gap-6">
        {/* Add entry */}
        <div className="space-y-4 mb-4 md:mb-0">
          <Card>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('finance.add', { defaultValue: 'Add Entry' })}</h3>
            <div className="space-y-2">
              <div className="flex rounded-token-md overflow-hidden border border-[rgb(var(--ink)/0.12)]">
                {['income', 'expense'].map(tp => (
                  <button
                    key={tp}
                    onClick={() => setType(tp)}
                    className={`flex-1 py-2 text-sm font-black transition-colors duration-200 ${type === tp ? 'bg-grad-hero text-on-brand' : 'bg-surface-2 text-muted hover:text-ink'}`}
                  >
                    {tp === 'income' ? t('finance.income', { defaultValue: 'Income' }) : t('finance.expense', { defaultValue: 'Expense' })}
                  </button>
                ))}
              </div>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={t('finance.amountPlaceholder', { defaultValue: 'Amount' })} min="0" step="0.01" />
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder={t('finance.categoryPlaceholder', { defaultValue: 'Category' })} />
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder={t('finance.notePlaceholder', { defaultValue: 'Note (optional)' })} />
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Button variant="primary" onClick={addEntry} className="w-full">{t('finance.addBtn', { defaultValue: 'Add' })}</Button>
            </div>
          </Card>

          {/* Category breakdown */}
          {Object.keys(expenseCats).length > 0 && (
            <Card>
              <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('finance.expenseByCategory', { defaultValue: 'Expense by Category' })}</h3>
              <div className="space-y-2">
                {Object.entries(expenseCats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-ink">{cat}</span>
                      <span className="text-muted">${amt.toFixed(2)}</span>
                    </div>
                    <div className="bg-surface-2 rounded-token-sm h-1.5">
                      <div className="bg-focus h-1.5 rounded-token-sm" style={{ width: `${(amt / maxExpense) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Entry list */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted">{t('finance.entries', { defaultValue: 'Entries' })}</h3>
            <div className="flex gap-1">
              {['all', 'income', 'expense'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`text-xs px-2 py-1 rounded-token-sm transition-colors duration-200 ${filterType === f ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted hover:text-ink'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="💰" title={t('finance.empty', { defaultValue: 'No entries yet' })} />
          ) : (
            <ul className="space-y-2">
              {filtered.map(e => (
                <li key={e.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2">
                  <span className={`text-lg ${e.type === 'income' ? 'text-success' : 'text-focus'}`}>{e.type === 'income' ? '▲' : '▼'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">{e.category}</p>
                    {e.note && <p className="text-xs text-muted">{e.note}</p>}
                  </div>
                  <span className="text-xs text-muted">{e.date}</span>
                  <span className={`font-black text-sm ${e.type === 'income' ? 'text-success' : 'text-focus'}`}>${e.amount.toFixed(2)}</span>
                  <button onClick={() => dispatch({ type: 'REMOVE', payload: { id: e.id } })} className="text-muted hover:text-focus text-xs transition-colors duration-200">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
