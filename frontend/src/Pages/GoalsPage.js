import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, EmptyState, ProgressRing } from '../components/ui';
import { useGoals } from '../features/goalsx/useGoals';
import { goalProgress, overallProgress } from '../features/goalsx/goalsLogic';

export default function GoalsPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useGoals();
  const [selectedId, setSelectedId] = useState(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newMilestone, setNewMilestone] = useState('');

  const { goals } = state;
  const selected = goals.find(g => g.id === selectedId) || null;
  const overall = overallProgress(state);

  function addGoal() {
    if (!newGoalTitle.trim()) return;
    dispatch({ type: 'ADD_GOAL', payload: { title: newGoalTitle.trim() } });
    setNewGoalTitle('');
  }

  function addMilestone() {
    if (!newMilestone.trim() || !selectedId) return;
    dispatch({ type: 'ADD_MILESTONE', payload: { goalId: selectedId, title: newMilestone.trim() } });
    setNewMilestone('');
  }

  return (
    <div className="p-6 md:p-10 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-ink">{t('goalsx.title', { defaultValue: 'Goals' })}</h1>
          <p className="text-muted text-sm mt-1">{t('goalsx.subtitle', { defaultValue: 'Track your milestones' })}</p>
        </div>
        <div className="flex flex-col items-center">
          <ProgressRing progress={overall} size={56} stroke={5} />
          <span className="text-xs text-muted mt-1">{t('goalsx.overall', { defaultValue: 'Overall' })}</span>
        </div>
      </div>

      {/* Add goal */}
      <Card className="mb-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('goalsx.addGoal', { defaultValue: 'New Goal' })}</h3>
        <div className="flex gap-2">
          <Input
            value={newGoalTitle}
            onChange={e => setNewGoalTitle(e.target.value)}
            placeholder={t('goalsx.goalPlaceholder', { defaultValue: 'Goal title...' })}
            onKeyDown={e => e.key === 'Enter' && addGoal()}
          />
          <Button variant="primary" onClick={addGoal}>{t('goalsx.add', { defaultValue: 'Add' })}</Button>
        </div>
      </Card>

      <div className="md:grid md:grid-cols-[320px_1fr] gap-6">
        {/* Goals list */}
        <div>
          <Card>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">{t('goalsx.goals', { defaultValue: 'Goals' })}</h3>
            {goals.length === 0 ? (
              <EmptyState icon="🎯" title={t('goalsx.empty', { defaultValue: 'No goals yet' })} />
            ) : (
              <ul className="space-y-2">
                {goals.map(goal => {
                  const pct = goalProgress(goal);
                  return (
                    <li
                      key={goal.id}
                      onClick={() => setSelectedId(goal.id)}
                      className={`rounded-token-md px-3 py-3 cursor-pointer transition-colors duration-200 ${selectedId === goal.id ? 'bg-grad-hero text-on-brand shadow-neu-sm' : 'hover:bg-surface-2'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold text-sm ${selectedId === goal.id ? 'text-on-brand' : 'text-ink'}`}>{goal.title}</span>
                        <span className={`text-xs font-black ${selectedId === goal.id ? 'text-on-brand/80' : 'text-muted'}`}>{pct}%</span>
                      </div>
                      <div className="bg-[rgb(var(--ink)/0.1)] rounded-token-sm h-1.5">
                        <div className={`h-1.5 rounded-token-sm ${selectedId === goal.id ? 'bg-on-brand' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Goal detail */}
        <div>
          {!selected ? (
            <Card>
              <EmptyState icon="🎯" title={t('goalsx.selectHint', { defaultValue: 'Select a goal to view milestones' })} />
            </Card>
          ) : (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-ink">{selected.title}</h2>
                  <span className="text-sm text-muted">{goalProgress(selected)}% {t('goalsx.complete', { defaultValue: 'complete' })}</span>
                </div>
                <Button variant="danger" size="sm" onClick={() => { dispatch({ type: 'REMOVE_GOAL', payload: { id: selected.id } }); setSelectedId(null); }}>
                  {t('goalsx.delete', { defaultValue: 'Delete' })}
                </Button>
              </div>

              {/* Add milestone */}
              <div className="flex gap-2 mb-4">
                <Input
                  value={newMilestone}
                  onChange={e => setNewMilestone(e.target.value)}
                  placeholder={t('goalsx.milestonePlaceholder', { defaultValue: 'Add milestone...' })}
                  onKeyDown={e => e.key === 'Enter' && addMilestone()}
                />
                <Button variant="primary" size="sm" onClick={addMilestone}>{t('goalsx.addMilestone', { defaultValue: '+ Add' })}</Button>
              </div>

              {selected.milestones.length === 0 ? (
                <EmptyState icon="📌" title={t('goalsx.noMilestones', { defaultValue: 'No milestones yet' })} />
              ) : (
                <ul className="space-y-2">
                  {selected.milestones.map(m => (
                    <li key={m.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2">
                      <button
                        onClick={() => dispatch({ type: 'TOGGLE_MILESTONE', payload: { goalId: selected.id, milestoneId: m.id } })}
                        className={`w-5 h-5 rounded-token-sm border-2 flex-shrink-0 transition-colors duration-200 ${m.done ? 'bg-success border-success' : 'border-[rgb(var(--ink)/0.3)]'}`}
                      >
                        {m.done && <span className="text-on-brand text-xs flex items-center justify-center">✓</span>}
                      </button>
                      <span className={`flex-1 text-sm ${m.done ? 'line-through text-muted' : 'text-ink'}`}>{m.title}</span>
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_MILESTONE', payload: { goalId: selected.id, milestoneId: m.id } })}
                        className="text-muted hover:text-focus transition-colors duration-200 text-xs"
                      >
                        ✕
                      </button>
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
