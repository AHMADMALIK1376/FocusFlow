import { useEffect, useState } from 'react';
import { budgetAPI } from '../../services/api';
import { totals } from './financeLogic';

const CURRENCIES = { PKR: 'Rs ', USD: '$', EUR: '€', GBP: '£', INR: '₹' };

// This month's budget at a glance: allowance, spent, left, savings.
// null while loading or when no budget has been set up yet.
export function useBudgetSnapshot() {
  const [budget, setBudget] = useState(null);
  useEffect(() => {
    let alive = true;
    budgetAPI.get().then((b) => {
      if (!alive || !b || !b.settings) return;
      const month = new Date().toISOString().slice(0, 7);
      const spent = (b.entries || [])
        .filter((e) => e.type === 'expense' && (e.date || '').slice(0, 7) === month)
        .reduce((s, e) => s + e.amount, 0);
      const allowance = b.settings.monthlyAllowance || 0;
      setBudget({
        allowance,
        spent,
        value: allowance - spent,
        savingsGoal: b.settings.savingsGoal || 0,
        saved: totals({ entries: b.entries || [] }).balance,
        cur: CURRENCIES[b.settings.currency] || '',
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return budget;
}
