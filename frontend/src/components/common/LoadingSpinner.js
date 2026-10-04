// src/components/common/LoadingSpinner.js
// FocusFlow's one and only loader: the real logo (coral clay) draws itself
// like a pen — the top line from left to right, then the bottom line — then
// gives a soft clay "puff", fades and starts again.
// The line images come from scripts/make-logo.py.
import React from 'react';

const SIZES = { small: 28, medium: 72, large: 110 };

export const LoadingSpinner = ({ size = 'medium', fullScreen = false, message = 'Loading…' }) => {
  const px = typeof size === 'number' ? size : (SIZES[size] || SIZES.medium);

  const spinner = (
    <div className="ff-loader flex flex-col items-center justify-center gap-2" role="status" aria-live="polite" aria-label={message || 'Loading'}>
      <div className="ff-loader-logo" style={{ width: px, height: px }}>
        <img src="/logo/mark-top-coral.png" alt="" className="ff-loader-line ff-loader-top" />
        <img src="/logo/mark-bottom-coral.png" alt="" className="ff-loader-line ff-loader-bottom" />
      </div>
      {message ? <p className="text-sm text-muted font-bold tracking-wide ff-loader-msg">{message}</p> : null}
      <style>{`
        .ff-loader-logo { position: relative; animation: ff-puff 2.8s ease-in-out infinite; }
        .ff-loader-line {
          position: absolute; inset: 0; width: 100%; height: 100%;
          /* a soft-edged wipe = the "pen". With a 200%-wide mask the edge sweeps
             across the whole logo as the position goes 100% → -12%. */
          -webkit-mask-image: linear-gradient(90deg, #000 45%, transparent 55%);
                  mask-image: linear-gradient(90deg, #000 45%, transparent 55%);
          -webkit-mask-size: 200% 100%; mask-size: 200% 100%;
          -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
        }
        .ff-loader-top { animation: ff-draw-top 2.8s cubic-bezier(0.37, 0, 0.45, 1) infinite; }
        .ff-loader-bottom { animation: ff-draw-bottom 2.8s cubic-bezier(0.37, 0, 0.45, 1) infinite; }
        /* top line draws first… */
        @keyframes ff-draw-top {
          0%   { -webkit-mask-position: 100% 0; mask-position: 100% 0; opacity: 1; }
          34%  { -webkit-mask-position: -12% 0;    mask-position: -12% 0; }
          84%  { -webkit-mask-position: -12% 0;    mask-position: -12% 0;    opacity: 1; }
          100% { -webkit-mask-position: -12% 0;    mask-position: -12% 0;    opacity: 0; }
        }
        /* …then the bottom line */
        @keyframes ff-draw-bottom {
          0%, 28% { -webkit-mask-position: 100% 0; mask-position: 100% 0; opacity: 1; }
          64%  { -webkit-mask-position: -12% 0;    mask-position: -12% 0; }
          84%  { -webkit-mask-position: -12% 0;    mask-position: -12% 0;    opacity: 1; }
          100% { -webkit-mask-position: -12% 0;    mask-position: -12% 0;    opacity: 0; }
        }
        /* the finished logo puffs up like soft clay */
        @keyframes ff-puff {
          0%, 64%, 100% { transform: scale(1); }
          72% { transform: scale(1.08, 0.94); }
          78% { transform: scale(0.97, 1.03); }
        }
        .ff-loader-msg { animation: ff-fade 1.4s ease-in-out infinite; }
        @keyframes ff-fade { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .ff-loader-logo, .ff-loader-line { animation-duration: 6s; }
        }
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
          <div className="h-4 bg-[rgb(214_192_162/0.3)] rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-[rgb(214_192_162/0.3)] rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-[rgb(214_192_162/0.3)] rounded w-1/2"></div>
        </div>
      );
    } else if (type === 'list') {
      skeletons.push(
        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="w-12 h-12 bg-[rgb(214_192_162/0.3)] rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-[rgb(214_192_162/0.3)] rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-[rgb(214_192_162/0.3)] rounded w-1/2"></div>
          </div>
        </div>
      );
    } else if (type === 'table') {
      skeletons.push(
        <div key={i} className="animate-pulse">
          <div className="h-10 bg-[rgb(214_192_162/0.3)] rounded w-full mb-2"></div>
          <div className="h-10 bg-[rgb(214_192_162/0.18)] rounded w-full mb-2"></div>
          <div className="h-10 bg-[rgb(214_192_162/0.3)] rounded w-full mb-2"></div>
          <div className="h-10 bg-[rgb(214_192_162/0.18)] rounded w-full"></div>
        </div>
      );
    }
  }
  return <>{skeletons}</>;
};
