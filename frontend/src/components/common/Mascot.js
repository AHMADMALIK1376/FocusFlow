// A character that watches the cursor and reacts when poked.
// Ported from https://github.com/nilbuild/page-mascot (MIT, © Kamran Ahmed),
// see public/mascots/LICENSE-page-mascot.txt.
import React, { useEffect, useRef, useState } from 'react';

const DIRECTIONS = ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right'];
const REACTIONS = ['blink', 'heart', 'sparkle', 'surprised', 'wink', 'bashful', 'sleepy', 'dizzy', 'delighted'];

// Clockwise from the right, matching atan2 with y pointing down.
const CLOCKWISE = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 70;

const PAYOFFS = ['heart', 'sparkle', 'delighted'];
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;

const SQUASH = [
  { transform: 'scale(1, 1)', easing: 'ease-in' },
  { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
  { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
  { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
  { transform: 'scale(1, 1)' },
];

// background-size 300% makes each cell a clean 0/50/100% step on both axes.
const cell = (index) => ({ backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%` });
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

const layer = { position: 'absolute', inset: 0, backgroundSize: '300% 300%', backgroundRepeat: 'no-repeat' };

const matches = (query) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

export default function Mascot({ directions, reactions, size = 140, className, label = 'mascot' }) {
  const buttonRef = useRef(null);
  const squashRef = useRef(null);
  const timersRef = useRef([]);
  const boopsRef = useRef({ count: 0, at: 0 });
  const [direction, setDirection] = useState('center');
  const [reaction, setReaction] = useState(null);

  // Follow the pointer (not on touch screens: there is no cursor to follow).
  useEffect(() => {
    if (!matches('(hover: hover) and (pointer: fine)')) return undefined;

    let sector = -1;
    let pointer = null;

    const aim = () => {
      const button = buttonRef.current;
      if (!button || !pointer) return;
      const box = button.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setDirection('center');
        return;
      }

      // Hold the current sector until the pointer is well past its edge.
      const angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;

      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    };

    const onPointerMove = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      aim();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', aim, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', aim);
    };
  }, []);

  useEffect(() => () => timersRef.current.forEach(window.clearTimeout), []);

  const boop = () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
    const later = (ms, next) => timersRef.current.push(window.setTimeout(() => setReaction(next), ms));

    const now = Date.now();
    const boops = boopsRef.current;
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;

    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      setReaction('dizzy');
      later(DIZZY_END, null);
    } else {
      setReaction('blink');
      later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }

    if (matches('(prefers-reduced-motion: reduce)')) return;
    squashRef.current?.animate?.(SQUASH, { duration: SQUASH_MS, easing: 'linear' });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={boop}
      aria-label={`Boop the ${label}`}
      className={className}
      style={{
        position: 'relative', display: 'block', flexShrink: 0, width: size, height: size,
        padding: 0, border: 0, background: 'transparent', appearance: 'none', cursor: 'pointer', userSelect: 'none',
      }}
    >
      <span ref={squashRef} style={{ position: 'relative', display: 'block', width: '100%', height: '100%', transformOrigin: '50% 78%' }}>
        <span style={{ ...layer, backgroundImage: `url(${directions})`, ...cell(DIRECTIONS.indexOf(direction)), opacity: reaction ? 0 : 1 }} />
        {/* Always mounted so the sheet is fetched up front, never on the first click. */}
        <span style={{ ...layer, backgroundImage: `url(${reactions})`, ...cell(REACTIONS.indexOf(reaction || 'blink')), opacity: reaction ? 1 : 0 }} />
      </span>
    </button>
  );
}
