// src/components/layout/Sidebar.js — collapsible, line-icon sidebar (no emojis)
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, Settings } from 'lucide-react';
import { useUser } from '../auth/UserContext';
import { NAV_ITEMS } from './navItems';
import { NavIcon } from './navIcons';
import { cx } from '../ui/cx';
import storage from '../../storage/storageAdapter';

const MAIN_IDS = ['dashboard', 'deepwork', 'routine', 'tasks', 'timetable', 'attendance'];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { userName, userEmail } = useUser();
  const [collapsed, setCollapsed] = useState(() => Boolean(storage.get('sidebar.collapsed', false)));

  useEffect(() => {
    storage.set('sidebar.collapsed', collapsed);
  }, [collapsed]);

  const initials = (userName || userEmail || 'U')
    .split(' ').map((s) => s[0]).join('').toUpperCase().slice(0, 2);
  const main = NAV_ITEMS.filter((i) => MAIN_IDS.includes(i.id));
  const workspace = NAV_ITEMS.filter((i) => !MAIN_IDS.includes(i.id));

  const renderItem = (item) => {
    const active = pathname === item.path;
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.path)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? t(item.labelKey) : undefined}
        className={cx(
          'group relative flex items-center h-10 rounded-token-md transition-colors duration-200',
          collapsed ? 'justify-center w-10 mx-auto' : 'gap-3 px-3 w-full',
          active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'
        )}
      >
        <NavIcon id={item.id} size={19} className="shrink-0" />
        {!collapsed && (
          <span className={cx('text-sm truncate', active && 'font-semibold')}>{t(item.labelKey)}</span>
        )}
        {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />}
        {collapsed && (
          <span className="absolute left-[56px] px-2.5 py-1 rounded-md bg-ink text-canvas text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
            {t(item.labelKey)}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cx(
        'hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-surface border-r border-[rgb(var(--ink)/0.07)] z-40 transition-[width] duration-300 ease-spring',
        collapsed ? 'w-[78px]' : 'w-[256px]'
      )}
    >
      {/* Brand + collapse */}
      <div className={cx('flex items-center h-[66px] px-4 shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-grad-hero text-on-brand flex items-center justify-center font-black text-sm shrink-0">F</span>
          {!collapsed && <span className="font-black text-ink tracking-tight truncate">FocusFlow</span>}
        </button>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} aria-label="Collapse sidebar"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)} aria-label="Expand sidebar"
          className="mx-auto mb-1 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors">
          <ChevronLeft size={18} className="rotate-180" />
        </button>
      )}

      {/* Search */}
      <div className="px-3.5 mb-3 shrink-0">
        {collapsed ? (
          <button aria-label="Search" className="w-10 h-10 mx-auto rounded-token-md bg-surface-2 flex items-center justify-center text-muted hover:text-ink transition-colors">
            <Search size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-2 h-10 px-3 rounded-token-md bg-surface-2">
            <Search size={17} className="text-muted shrink-0" />
            <input placeholder="Search" className="bg-transparent outline-none text-sm flex-1 min-w-0 text-ink placeholder:text-muted" />
            <span className="text-[10px] font-bold text-muted px-1.5 py-0.5 rounded bg-surface border border-[rgb(var(--ink)/0.08)]">⌘K</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sb-scroll flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        <style>{`.sb-scroll::-webkit-scrollbar{display:none}.sb-scroll{scrollbar-width:none}`}</style>
        {!collapsed && <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted/60">Main</p>}
        {main.map(renderItem)}
        {collapsed ? (
          <div className="my-2 mx-auto w-7 h-px bg-[rgb(var(--ink)/0.08)]" />
        ) : (
          <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted/60">Workspace</p>
        )}
        {workspace.map(renderItem)}
      </nav>

      {/* Profile */}
      <div className="p-3 shrink-0 border-t border-[rgb(var(--ink)/0.07)]">
        <div className={cx('flex items-center rounded-token-md', collapsed ? 'justify-center' : 'gap-3 p-2 bg-surface-2')}>
          <span className="w-9 h-9 rounded-xl bg-grad-hero text-on-brand flex items-center justify-center font-black text-xs shrink-0">{initials}</span>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate">{userName || 'User'}</p>
                <p className="text-[11px] text-muted truncate">{userEmail || 'Member'}</p>
              </div>
              <button onClick={() => navigate('/settings')} aria-label="Settings"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface hover:text-ink transition-colors shrink-0">
                <Settings size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
