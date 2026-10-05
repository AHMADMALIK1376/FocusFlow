import React from 'react';
import { Wallet, PiggyBank, Coins } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui';
import { useFinance } from '../../../features/finance/useFinance';
import { totals, byCategory } from '../../../features/finance/financeLogic';
import WidgetShell, { WidgetEmpty, ClayBar, compactRs } from './WidgetShell';

// Budget at a glance: how much is left, a spending meter (spent vs income)
// and where most of the money went — visuals first, numbers kept short.
export default function FinanceCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useFinance();
  const { income, expense, balance } = totals(state);
  const spentPct = income > 0 ? Math.round((expense / income) * 100) : expense > 0 ? 100 : 0;
  const over = income > 0 && expense > income;
  const top = Object.entries(byCategory(state, 'expense')).sort((a, b) => b[1] - a[1])[0];

  return (
    <WidgetShell
      icon={Wallet}
      title={t('widgets.finance', { defaultValue: 'Budget' })}
      linkLabel={t('finance.open', { defaultValue: 'Open' })}
      onLink={() => navigate('/budget')}
      footer={<Button size="sm" variant="primary" full onClick={() => navigate('/budget')}>{t('finance.addEntry', { defaultValue: 'Add entry' })}</Button>}
    >
      {state.entries.length === 0 ? (
        <WidgetEmpty icon={PiggyBank} title="No entries yet" hint="Add your pocket money and spending to see where it goes." />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-grad-sun shadow-neu-sm flex items-center justify-center text-on-sun shrink-0"><Coins size={22} strokeWidth={1.75} /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Left to spend</p>
              <p className={`text-2xl font-black leading-tight ${balance < 0 ? 'text-focus' : 'text-ink'}`}>{compactRs(balance)}</p>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-bold text-ink">Spent</span>
              <span className={`text-xs font-black ${over ? 'text-focus' : 'text-muted'}`}>
                {income > 0 ? `${spentPct}% of income` : 'no income added'}
              </span>
            </div>
            <ClayBar value={spentPct} fillClassName={over ? 'bg-focus' : spentPct > 80 ? 'bg-grad-sun' : 'bg-grad-hero'} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-token-md bg-surface-2 shadow-neu-sm px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-success">↑ In</p>
              <p className="text-sm font-black text-ink truncate">{compactRs(income)}</p>
            </div>
            <div className="rounded-token-md bg-surface-2 shadow-neu-sm px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand">↓ Out</p>
              <p className="text-sm font-black text-ink truncate">{compactRs(expense)}</p>
            </div>
          </div>
          {top && <p className="text-xs text-muted">Most spent on <b className="text-ink">{top[0]}</b> ({compactRs(top[1])})</p>}
        </div>
      )}
    </WidgetShell>
  );
}
