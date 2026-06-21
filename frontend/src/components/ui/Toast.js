import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cx } from './cx';

const ToastContext = createContext(null);

const TONE_BORDER = {
  brand: 'border-brand/30',
  success: 'border-success/40',
  info: 'border-info/40',
  warn: 'border-warn/50',
  focus: 'border-focus/40',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(
    (id) => setToasts((list) => list.filter((t) => t.id !== id)),
    []
  );

  const toast = useCallback(
    (message, opts = {}) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, message, tone: opts.tone || 'brand' }]);
      setTimeout(() => dismiss(id), opts.duration || 3000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cx(
                'pointer-events-auto px-5 py-3 rounded-token-md bg-surface text-ink shadow-glass font-bold text-sm border',
                TONE_BORDER[t.tone] || TONE_BORDER.brand
              )}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export default ToastProvider;
