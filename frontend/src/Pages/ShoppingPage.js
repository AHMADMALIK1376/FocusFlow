import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, EmptyState } from '../components/ui';
import { useShopping } from '../features/shopping/useShopping';
import { listProgress } from '../features/shopping/shoppingLogic';

export default function ShoppingPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useShopping();
  const [selectedListId, setSelectedListId] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [newItem, setNewItem] = useState('');

  const { lists } = state;
  const selectedList = lists.find(l => l.id === selectedListId) || null;

  function addList() {
    if (!newListName.trim()) return;
    dispatch({ type: 'ADD_LIST', payload: { name: newListName.trim() } });
    setNewListName('');
  }

  function addItem() {
    if (!newItem.trim() || !selectedListId) return;
    dispatch({ type: 'ADD_ITEM', payload: { listId: selectedListId, text: newItem.trim() } });
    setNewItem('');
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-black tracking-tight text-ink mb-8">{t('shopping.title', { defaultValue: 'Shopping Lists' })}</h1>

      {/* Add list */}
      <Card className="mb-6">
        <div className="flex gap-2">
          <Input
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            placeholder={t('shopping.listNamePlaceholder', { defaultValue: 'New list name...' })}
            onKeyDown={e => e.key === 'Enter' && addList()}
          />
          <Button variant="primary" onClick={addList}>{t('shopping.addList', { defaultValue: '+ List' })}</Button>
        </div>
      </Card>

      <div className="md:grid md:grid-cols-[280px_1fr] gap-6">
        {/* Lists sidebar */}
        <div>
          <Card>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('shopping.lists', { defaultValue: 'Lists' })}</h3>
            {lists.length === 0 ? (
              <EmptyState icon="🛒" title={t('shopping.empty', { defaultValue: 'No lists yet' })} />
            ) : (
              <ul className="space-y-1">
                {lists.map(list => {
                  const prog = listProgress(list);
                  return (
                    <li
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`rounded-token-md px-3 py-2.5 cursor-pointer transition-colors duration-200 ${selectedListId === list.id ? 'bg-grad-hero shadow-neu-sm' : 'hover:bg-surface-2'}`}
                    >
                      <p className={`font-bold text-sm ${selectedListId === list.id ? 'text-on-brand' : 'text-ink'}`}>{list.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex-1 rounded-token-sm h-1 ${selectedListId === list.id ? 'bg-on-brand/20' : 'bg-surface-2'}`}>
                          <div className={`h-1 rounded-token-sm ${selectedListId === list.id ? 'bg-on-brand' : 'bg-brand'}`} style={{ width: `${prog.pct}%` }} />
                        </div>
                        <span className={`text-xs ${selectedListId === list.id ? 'text-on-brand/80' : 'text-muted'}`}>{prog.checked}/{prog.total}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Items */}
        <div>
          {!selectedList ? (
            <Card>
              <EmptyState icon="🛒" title={t('shopping.selectHint', { defaultValue: 'Select a list to view items' })} />
            </Card>
          ) : (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-ink">{selectedList.name}</h2>
                  <span className="text-sm text-muted">{listProgress(selectedList).checked} of {listProgress(selectedList).total} {t('shopping.done', { defaultValue: 'done' })}</span>
                </div>
                <Button variant="danger" size="sm" onClick={() => { dispatch({ type: 'REMOVE_LIST', payload: { id: selectedList.id } }); setSelectedListId(null); }}>
                  {t('shopping.deleteList', { defaultValue: 'Delete list' })}
                </Button>
              </div>

              {/* Add item */}
              <div className="flex gap-2 mb-4">
                <Input
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  placeholder={t('shopping.itemPlaceholder', { defaultValue: 'Add item...' })}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <Button variant="primary" size="sm" onClick={addItem}>{t('shopping.addItem', { defaultValue: 'Add' })}</Button>
              </div>

              {selectedList.items.length === 0 ? (
                <EmptyState icon="📋" title={t('shopping.emptyItems', { defaultValue: 'No items in this list' })} />
              ) : (
                <ul className="space-y-1.5">
                  {selectedList.items.map(item => (
                    <li key={item.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2">
                      <button
                        onClick={() => dispatch({ type: 'TOGGLE_ITEM', payload: { listId: selectedList.id, itemId: item.id } })}
                        className={`w-5 h-5 rounded-token-sm border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-200 ${item.checked ? 'bg-success border-success' : 'border-[rgb(var(--ink)/0.3)]'}`}
                      >
                        {item.checked && <span className="text-on-brand text-xs">✓</span>}
                      </button>
                      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-muted' : 'text-ink'}`}>{item.text}</span>
                      <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: { listId: selectedList.id, itemId: item.id } })} className="text-muted hover:text-focus text-xs transition-colors duration-200">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
