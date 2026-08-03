// src/components/layout/Sidebar.js — Indigo Night, collapsible, line-icon sidebar
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, Settings } from 'lucide-react';
import { useUser } from '../auth/UserContext';
import { NAV_ITEMS } from './navItems';
import { NavIcon } from './navIcons';
import DashboardSwitcher from '../dashboard/DashboardSwitcher';
import { cx } from '../ui/cx';
import storage from '../../storage/storageAdapter';

const MAIN_IDS = ['dashboard', 'deepwork', 'routine', 'attendance'];

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
          active
            ? 'bg-on-brand text-brand'
            : 'text-[rgb(var(--on-brand)/0.72)] hover:bg-[rgb(var(--on-brand)/0.12)] hover:text-on-brand'
        )}
      >
        <NavIcon id={item.id} size={19} className="shrink-0" />
        {!collapsed && (
          <span className={cx('text-sm truncate', active && 'font-semibold')}>{t(item.labelKey)}</span>
        )}
        {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />}
        {collapsed && (
          <span className="absolute left-[54px] px-2.5 py-1 rounded-md bg-on-brand text-brand text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-lg">
            {t(item.labelKey)}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cx(
        'hidden md:flex flex-col flex-shrink-0 sticky top-3 h-[calc(100vh-1.5rem)] m-3 mr-0 rounded-token-xl bg-grad-hero text-on-brand z-40 transition-[width] duration-300 ease-spring shadow-[0_12px_34px_rgb(45_71_89/0.28)]',
        collapsed ? 'w-[76px]' : 'w-[248px]'
      )}
    >
      {/* Workspace switcher + collapse */}
      <div className={cx('flex items-center gap-2 h-[64px] px-3 shrink-0', collapsed && 'justify-center')}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} aria-label="Expand sidebar"
            className="w-10 h-10 rounded-token-md flex items-center justify-center text-[rgb(var(--on-brand)/0.85)] hover:bg-[rgb(var(--on-brand)/0.12)] transition-colors">
            <ChevronLeft size={18} className="rotate-180" />
          </button>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <DashboardSwitcher triggerClassName="w-full justify-between px-3 py-2.5 rounded-token-md bg-[rgb(var(--on-brand)/0.12)] text-on-brand hover:bg-[rgb(var(--on-brand)/0.18)]" />
            </div>
            <button onClick={() => setCollapsed(true)} aria-label="Collapse sidebar"
              className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[rgb(var(--on-brand)/0.7)] hover:bg-[rgb(var(--on-brand)/0.12)] hover:text-on-brand transition-colors">
              <ChevronLeft size={18} />
            </button>
          </>
        )}
      </div>

      {/* Search */}
      <div className="px-3.5 mb-3 shrink-0">
        {collapsed ? (
          <button aria-label="Search" className="w-10 h-10 mx-auto rounded-token-md bg-[rgb(var(--on-brand)/0.1)] flex items-center justify-center text-[rgb(var(--on-brand)/0.7)] hover:text-on-brand transition-colors">
            <Search size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-2 h-10 px-3 rounded-token-md bg-[rgb(var(--on-brand)/0.1)]">
            <Search size={17} className="text-[rgb(var(--on-brand)/0.6)] shrink-0" />
            <input placeholder="Search" className="bg-transparent outline-none text-sm flex-1 min-w-0 text-on-brand placeholder:text-[rgb(var(--on-brand)/0.5)]" />
            <span className="text-[10px] font-bold text-[rgb(var(--on-brand)/0.7)] px-1.5 py-0.5 rounded bg-[rgb(var(--on-brand)/0.12)]">⌘K</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sb-scroll flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        <style>{`.sb-scroll::-webkit-scrollbar{display:none}.sb-scroll{scrollbar-width:none}`}</style>
        {!collapsed && <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--on-brand)/0.45)]">Main</p>}
        {main.map(renderItem)}
        {collapsed ? (
          <div className="my-2 mx-auto w-7 h-px bg-[rgb(var(--on-brand)/0.15)]" />
        ) : (
          <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--on-brand)/0.45)]">Workspace</p>
        )}
        {workspace.map(renderItem)}
      </nav>

      {/* Profile */}
      <div className="p-3 shrink-0 border-t border-[rgb(var(--on-brand)/0.12)]">
        <div className={cx('flex items-center rounded-token-md', collapsed ? 'justify-center' : 'gap-3 p-2 bg-[rgb(var(--on-brand)/0.1)]')}>
          <span className="w-9 h-9 rounded-xl bg-on-brand text-brand flex items-center justify-center font-black text-xs shrink-0">{initials}</span>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-brand truncate">{userName || 'User'}</p>
                <p className="text-[11px] text-[rgb(var(--on-brand)/0.6)] truncate">{userEmail || 'Member'}</p>
              </div>
              <button onClick={() => navigate('/settings')} aria-label="Settings"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgb(var(--on-brand)/0.7)] hover:bg-[rgb(var(--on-brand)/0.15)] hover:text-on-brand transition-colors shrink-0">
                <Settings size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
