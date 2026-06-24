import React, { useRef, useState, useEffect } from "react";

// Self-measuring chart wrapper — provides an explicit pixel width to recharts
// charts via a render prop. Avoids recharts v3 ResponsiveContainer collapsing
// to 0px inside CSS grid/flex items.
export default function ChartBox({ height, children }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      {w > 0 ? children(w) : null}
    </div>
  );
}
