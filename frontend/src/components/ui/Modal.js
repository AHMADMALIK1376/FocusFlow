import React, { useEffect, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cx } from './cx';
import './fancyControls.css';

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Opt-in: focus moves into the dialog, Tab and Shift+Tab stay inside it, and focus
// goes back to whatever opened it when it closes.
function useFocusTrap(open, ref, enabled) {
  useEffect(() => {
    const node = ref.current;
    if (!open || !enabled || !node) return undefined;
    const opener = document.activeElement;
    if (!node.contains(document.activeElement)) node.focus();

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll(FOCUSABLE));
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = node.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [open, ref, enabled]);
}

// trapFocus and fullHeightOnMobile (a full-height sheet below the sm breakpoint, above the
// phone tab bar) are opt-in.
// Animations follow the system's reduce-motion setting.
export function Modal({
  open, onClose, title, children, className = '',
  maxWidthClassName = 'max-w-lg', noScrollbar = false, showClose = false,
  trapFocus = false, fullHeightOnMobile = false,
}) {
  const panelRef = useRef(null);
  useEscape(open, onClose);
  useFocusTrap(open, panelRef, trapFocus);
  return (
    <MotionConfig reducedMotion="user">
    <AnimatePresence>
      {open && (
        <motion.div
          className={cx('fixed inset-0 grid place-items-center', fullHeightOnMobile ? 'z-[2100] p-0 sm:p-4' : 'z-[1000] p-4')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-[rgb(190_160_122/0.35)] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={trapFocus ? -1 : undefined}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={cx(
              'relative w-full bg-surface text-ink shadow-glass p-6 overflow-y-auto outline-none',
              fullHeightOnMobile
                ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[85vh] sm:rounded-token-lg'
                : 'max-h-[85vh] rounded-token-lg',
              maxWidthClassName,
              noScrollbar && 'ff-modal-no-scrollbar',
              className
            )}
          >
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-focus hover:bg-focus/10 transition-colors z-10"
              >
                <X size={18} />
              </button>
            )}
            {title && <h2 className="text-xl font-black text-ink mb-4">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </MotionConfig>
  );
}

export function Sheet({ open, onClose, children, className = '' }) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-[rgb(190_160_122/0.35)] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cx(
              'relative w-full max-w-xl bg-surface text-ink rounded-t-token-xl shadow-glass p-6 pb-8 max-h-[85vh] overflow-y-auto',
              className
            )}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[rgb(var(--ink)/0.15)]" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
