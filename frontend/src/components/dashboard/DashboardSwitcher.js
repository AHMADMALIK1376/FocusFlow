import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../../preferences/usePreferences';
import { Button, Input } from '../ui';
import { cx } from '../ui';

export default function DashboardSwitcher({ triggerClassName } = {}) {
  const { t } = useTranslation();
  const {
    dashboards,
    activeDashboard,
    activeDashboardId,
    createDashboard,
    removeDashboard,
    renameDashboard,
    switchDashboard,
  } = usePreferences();

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setCreatingNew(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createDashboard(trimmed);
    setNewName('');
    setCreatingNew(false);
  }

  function handleRename(id) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    renameDashboard(id, trimmed);
    setEditingId(null);
    setEditName('');
  }

  function handleDelete(id) {
    if (window.confirm(t('dashboards.deleteConfirm', { defaultValue: 'Delete this workspace?' }))) {
      removeDashboard(id);
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'flex items-center gap-1.5 text-xs font-bold transition-all duration-200',
          triggerClassName ||
            'px-3 py-1.5 rounded-token-sm bg-surface-2 border border-[rgb(var(--ink)/0.08)] text-ink hover:bg-[rgb(var(--ink)/0.05)] max-w-[140px]'
        )}
        aria-label={t('dashboards.title', { defaultValue: 'Workspaces' })}
        title={activeDashboard ? activeDashboard.name : 'Workspace'}
      >
        <span className="truncate flex-1 text-left">
          {activeDashboard ? activeDashboard.name : 'Workspace'}
        </span>
        <span className={`text-[0.6rem] opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-surface border border-[rgb(var(--ink)/0.08)] rounded-token-md shadow-glass py-2 z-[2000]">
          <p className="px-4 py-2 text-[0.65rem] font-black uppercase tracking-widest text-muted">
            {t('dashboards.title', { defaultValue: 'Workspaces' })}
          </p>

          {dashboards.map((db) => (
            <div key={db.id} className="px-2">
              {editingId === db.id ? (
                <div className="flex gap-2 py-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(db.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="text-sm py-2 px-3"
                    autoFocus
                  />
                  <Button size="sm" variant="primary" onClick={() => handleRename(db.id)}>
                    ✓
                  </Button>
                </div>
              ) : (
                <div
                  className={cx(
                    'flex items-center gap-2 px-2 py-2.5 rounded-token-sm cursor-pointer group',
                    db.id === activeDashboardId
                      ? 'bg-brand/10 text-brand'
                      : 'hover:bg-[rgb(var(--ink)/0.05)] text-ink'
                  )}
                  onClick={() => {
                    switchDashboard(db.id);
                    setOpen(false);
                  }}
                >
                  <span className="text-base">
                    {db.id === activeDashboardId ? '●' : '○'}
                  </span>
                  <span className="flex-1 text-sm font-bold truncate">{db.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="text-muted hover:text-ink text-xs p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(db.id);
                        setEditName(db.name);
                      }}
                      aria-label="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="text-muted hover:text-focus text-xs p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(db.id);
                      }}
                      aria-label="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="h-px bg-[rgb(var(--ink)/0.08)] my-2 mx-2" />

          {creatingNew ? (
            <div className="px-2 flex flex-col gap-2 pb-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('dashboards.namePlaceholder', { defaultValue: 'Workspace name…' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setCreatingNew(false);
                }}
                className="text-sm py-2 px-3"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" variant="primary" full onClick={handleCreate}>
                  {t('dashboards.create', { defaultValue: 'Create' })}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreatingNew(false)}>
                  ✕
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand/5 transition-colors flex items-center gap-2"
              onClick={() => setCreatingNew(true)}
            >
              <span>+</span>
              {t('dashboards.create', { defaultValue: 'New workspace' })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
