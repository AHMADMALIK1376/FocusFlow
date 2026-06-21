import React from 'react';
import { cx } from './cx';

const base =
  'w-full rounded-token-md bg-surface text-ink placeholder:text-muted/70 ' +
  'shadow-neu-inset outline-none font-medium transition-all duration-200 ' +
  'focus:ring-2 focus:ring-brand/60';

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block">
      {label && (
        <span className="block mb-2 text-sm font-bold text-ink">{label}</span>
      )}
      {children}
      {error ? (
        <span className="block mt-1.5 text-xs font-semibold text-focus">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = React.forwardRef(function Input(
  { className = '', ...props },
  ref
) {
  return <input ref={ref} className={cx(base, 'py-3.5 px-5', className)} {...props} />;
});

export const Textarea = React.forwardRef(function Textarea(
  { className = '', rows = 4, ...props },
  ref
) {
  return (
    <textarea ref={ref} rows={rows} className={cx(base, 'py-3.5 px-5 resize-none', className)} {...props} />
  );
});

export const Select = React.forwardRef(function Select(
  { className = '', children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cx(base, 'py-3.5 px-5 appearance-none cursor-pointer', className)}
      {...props}
    >
      {children}
    </select>
  );
});

export default Input;
