import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { NavIcon } from './navIcons';
import { cx } from '../ui/cx';
import { Sheet } from '../ui/Modal';

const PRIMARY_COUNT = 5;

export default function MobileTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = NAV_ITEMS.slice(0, PRIMARY_COUNT);
  const overflowItems = NAV_ITEMS.slice(PRIMARY_COUNT);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[1000] px-2"
        aria-label="Primary"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-2 mb-2 flex items-stretch justify-around rounded-token-lg bg-surface border border-[rgb(var(--ink)/0.08)] shadow-glass">
          {primaryItems.map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors duration-200 rounded-token-md',
                  active ? 'text-brand' : 'text-muted'
                )}
              >
                <NavIcon id={item.id} size={20} />
                <span className="text-[9px] font-bold tracking-wide leading-none">{t(item.labelKey)}</span>
              </button>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-muted transition-colors rounded-token-md"
            >
              <MoreHorizontal size={20} />
              <span className="text-[9px] font-bold tracking-wide leading-none">More</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <h2 className="text-xl font-black text-ink mb-4">More</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {overflowItems.map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); setMoreOpen(false); }}
                className={cx(
                  'flex items-center gap-3 px-3 py-3 rounded-token-md transition-colors duration-200 text-left',
                  active ? 'bg-brand/10 text-brand font-semibold' : 'text-ink hover:bg-surface-2'
                )}
              >
                <NavIcon id={item.id} size={20} className="shrink-0" />
                <span className="font-medium text-sm truncate">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
