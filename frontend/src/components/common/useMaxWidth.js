import { useEffect, useState } from 'react';

// True while the window is at most `px` wide (follows rotation and resizing).
// For things drawn in pixels (an SVG chart) that a CSS class cannot resize.
// Without matchMedia (old browsers, tests) it answers false, so the full size is used.
export function useMaxWidth(px) {
  const query = `(max-width: ${px}px)`;
  const [matches, setMatches] = useState(() => !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia(query).matches));
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else if (mq.removeListener) mq.removeListener(on); };
  }, [query]);
  return matches;
}

export default useMaxWidth;
