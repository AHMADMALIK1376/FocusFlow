import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState } from '../../ui';
import { useShopping } from '../../../features/shopping/useShopping';
import { listProgress } from '../../../features/shopping/shoppingLogic';

export default function ShoppingCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useShopping();
  const { lists } = state;

  // Show first active list (with unchecked items), or first list
  const activeList = lists.find(l => l.items.some(i => !i.checked)) || lists[0] || null;

  return (
    <div className="bg-surface text-ink rounded-token-lg shadow-neu p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted">🛒 {t('widgets.shopping', { defaultValue: 'Shopping' })}</h3>
        <Button size="sm" variant="ghost" onClick={() => navigate('/shopping')}>{t('shopping.open', { defaultValue: 'Open' })}</Button>
      </div>

      {!activeList ? (
        <EmptyState icon="🛒" title={t('shopping.empty', { defaultValue: 'No lists yet' })} />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-ink text-sm">{activeList.name}</span>
            <span className="text-muted text-xs">{listProgress(activeList).checked}/{listProgress(activeList).total}</span>
          </div>
          <div className="bg-surface-2 rounded-token-sm h-1.5 mb-3">
            <div className="bg-success h-1.5 rounded-token-sm" style={{ width: `${listProgress(activeList).pct}%` }} />
          </div>
          <ul className="space-y-1">
            {activeList.items.filter(i => !i.checked).slice(0, 4).map(item => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted">·</span>
                <span className="text-ink">{item.text}</span>
              </li>
            ))}
            {activeList.items.filter(i => !i.checked).length > 4 && (
              <li className="text-xs text-muted">+{activeList.items.filter(i => !i.checked).length - 4} {t('shopping.more', { defaultValue: 'more' })}</li>
            )}
          </ul>
        </div>
      )}
      <Button size="sm" variant="soft" onClick={() => navigate('/shopping')} className="mt-3">
        {t('shopping.manage', { defaultValue: 'Manage lists' })}
      </Button>
    </div>
  );
}
