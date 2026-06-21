import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, StatCard } from '../../ui';
import { useFinance } from '../../../features/finance/useFinance';
import { totals } from '../../../features/finance/financeLogic';

export default function FinanceCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useFinance();
  const { income, expense, balance } = totals(state);

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">💰 {t('widgets.finance', { defaultValue: 'Finance' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/finance')}>{t('finance.open', { defaultValue: 'Open' })}</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon="💚" label={t('finance.income', { defaultValue: 'Income' })} value={`$${income.toFixed(0)}`} tone="success" />
        <StatCard icon="🔴" label={t('finance.expenses', { defaultValue: 'Expenses' })} value={`$${expense.toFixed(0)}`} tone="focus" />
        <StatCard icon="💰" label={t('finance.balance', { defaultValue: 'Balance' })} value={`$${balance.toFixed(0)}`} tone={balance >= 0 ? 'brand' : 'warn'} />
      </div>
      <Button size="sm" variant="primary" onClick={() => navigate('/finance')} className="mt-3 w-full">
        {t('finance.addEntry', { defaultValue: 'Add entry' })}
      </Button>
    </div>
  );
}
