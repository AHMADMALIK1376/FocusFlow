// src/components/common/LoadingSpinner.js
// FocusFlow loader — dual conic-gradient orbit around a pulsing "F" core.
// Theme-aware (uses brand tokens) so it matches whatever palette is active.
import React from 'react';

const SIZES = { small: 30, medium: 54, large: 78 };

export const LoadingSpinner = ({ size = 'medium', fullScreen = false, message = 'Loading…' }) => {
  const px = typeof size === 'number' ? size : (SIZES[size] || SIZES.medium);
  const fPx = Math.round(px * 0.32);

  const spinner = (
    <div className="ff-loader flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div className="ff-loader-orbit" style={{ width: px, height: px }}>
        <span className="ff-loader-ring ff-loader-ring-1" />
        <span className="ff-loader-ring ff-loader-ring-2" />
        <span className="ff-loader-core" style={{ fontSize: fPx }}>F</span>
      </div>
      {message ? <p className="text-sm text-muted font-bold tracking-wide ff-loader-msg">{message}</p> : null}
      <style>{`
        .ff-loader-orbit { position: relative; display: inline-block; }
        .ff-loader-ring {
          position: absolute; inset: 0; border-radius: 50%;
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 15%), #000 calc(100% - 14%));
                  mask: radial-gradient(farthest-side, transparent calc(100% - 15%), #000 calc(100% - 14%));
        }
        .ff-loader-ring-1 {
          background: conic-gradient(from 90deg, transparent 6%, rgb(var(--brand-soft)) 36%, rgb(var(--brand)) 78%, transparent 96%);
          animation: ff-spin 0.85s linear infinite;
        }
        .ff-loader-ring-2 {
          inset: 25%;
          background: conic-gradient(from 270deg, transparent 10%, rgb(var(--brand)) 58%, transparent 92%);
          animation: ff-spin 1.3s linear infinite reverse;
          opacity: 0.85;
        }
        .ff-loader-core {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          color: rgb(var(--brand)); font-weight: 900; line-height: 1;
          animation: ff-core-pulse 1.15s ease-in-out infinite;
        }
        .ff-loader-msg { animation: ff-fade 1.5s ease-in-out infinite; }
        @keyframes ff-spin { to { transform: rotate(360deg); } }
        @keyframes ff-core-pulse { 0%, 100% { transform: scale(0.84); opacity: 0.7; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes ff-fade { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center">{spinner}</div>;
  }
  return spinner;
};

export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    if (type === 'card') {
      skeletons.push(
        <div key={i} className="bg-surface-2 rounded-token-lg p-6 animate-pulse">
          <div className="h-4 bg-[rgb(var(--ink)/0.1)] rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-[rgb(var(--ink)/0.1)] rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-[rgb(var(--ink)/0.1)] rounded w-1/2"></div>
        </div>
      );
    } else if (type === 'list') {
      skeletons.push(
        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="w-12 h-12 bg-[rgb(var(--ink)/0.1)] rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-[rgb(var(--ink)/0.1)] rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-[rgb(var(--ink)/0.1)] rounded w-1/2"></div>
          </div>
        </div>
      );
    } else if (type === 'table') {
      skeletons.push(
        <div key={i} className="animate-pulse">
          <div className="h-10 bg-[rgb(var(--ink)/0.1)] rounded w-full mb-2"></div>
          <div className="h-10 bg-[rgb(var(--ink)/0.06)] rounded w-full mb-2"></div>
          <div className="h-10 bg-[rgb(var(--ink)/0.1)] rounded w-full mb-2"></div>
          <div className="h-10 bg-[rgb(var(--ink)/0.06)] rounded w-full"></div>
        </div>
      );
    }
  }
  return <>{skeletons}</>;
};
