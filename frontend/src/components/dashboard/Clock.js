// src/components/dashboard/Clock.js
// FocusFlow Matrix Clock — a binary time matrix where each tile flips in 3D as
// time passes. Rows = Hours / Minutes / Seconds. Recoloured to the brand theme
// (Indigo Night panel, Wisteria / Mint / Peach tiles) + live date & temperature.
import React, { useState, useEffect } from "react";
import { usePreferences } from "../../preferences/usePreferences";
import { chartColors } from "../charts/chartColors";

const COLS = 6;
const toBits = (val) => {
  const bits = [];
  for (let i = COLS - 1; i >= 0; i--) bits.push((val >> i) & 1);
  return bits;
};

function weatherFor(code) {
  if (code === 0) return { icon: "☀️", label: "Clear" };
  if (code <= 2) return { icon: "🌤️", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", label: "Cloudy" };
  if (code <= 48) return { icon: "🌫️", label: "Fog" };
  if (code <= 57) return { icon: "🌦️", label: "Drizzle" };
  if (code <= 67) return { icon: "🌧️", label: "Rain" };
  if (code <= 77) return { icon: "❄️", label: "Snow" };
  if (code <= 82) return { icon: "🌦️", label: "Showers" };
  if (code <= 86) return { icon: "🌨️", label: "Snow" };
  if (code <= 99) return { icon: "⛈️", label: "Storm" };
  return { icon: "🌡️", label: "" };
}

function Tile({ active, color, delay }) {
  const [spin, setSpin] = useState(false);
  const [prev, setPrev] = useState(active);

  useEffect(() => {
    if (active !== prev) {
      setSpin(true);
      setPrev(active);
      const t = setTimeout(() => setSpin(false), 600 + delay);
      return () => clearTimeout(t);
    }
  }, [active, prev, delay]);

  const style = {
    width: 26,
    height: 26,
    borderRadius: 7,
    background: active ? color : "transparent",
    border: active ? `2px solid ${color}` : "2px solid rgb(var(--on-brand) / 0.16)",
    boxShadow: active ? `0 3px 10px ${color}66, inset 0 1px 2px rgba(255,255,255,0.45)` : "none",
    transformStyle: "preserve-3d",
    transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
    animation: spin ? `${active ? "ffTileOn" : "ffTileOff"} 0.6s ease ${delay}ms both` : "none",
  };

  return (
    <div style={{ perspective: 200 }}>
      <div style={style} />
    </div>
  );
}

export default function Clock() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const { activeDashboard } = usePreferences();
  const { accent } = chartColors(activeDashboard?.palette);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );
          const j = await res.json();
          if (!cancelled && j && j.current) {
            setWeather({ temp: Math.round(j.current.temperature_2m), code: j.current.weather_code });
          }
        } catch (e) { /* offline / blocked — skip */ }
      },
      () => {},
      { timeout: 8000, maximumAge: 600000 }
    );
    return () => { cancelled = true; };
  }, []);

  const h24 = time.getHours(), m = time.getMinutes(), s = time.getSeconds();
  const h12 = h24 % 12 || 12;
  const pad = (n) => String(n).padStart(2, "0");
  const w = weather ? weatherFor(weather.code) : null;

  // Tile colours — H uses the live theme accent; M/S are fixed brand-family pastels.
  const C = { H: accent || "#D6C6F7", M: "#7FD8BE", S: "#FFC59E" };
  const ROWS = [
    { key: "H", value: h24, color: C.H },
    { key: "M", value: m, color: C.M },
    { key: "S", value: s, color: C.S },
  ];

  return (
    <div className="rounded-token-lg bg-grad-hero text-on-brand shadow-glass p-5 inline-block relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[rgb(var(--on-brand)/0.10)] blur-2xl" />

      {/* Digital readout */}
      <div className="flex items-baseline justify-between gap-4 mb-3.5 relative z-10">
        <div className="font-black tabular-nums" style={{ fontSize: 24, letterSpacing: 1, lineHeight: 1 }}>
          <span style={{ color: C.H }}>{pad(h12)}</span>
          <span className="opacity-40 mx-0.5">:</span>
          <span style={{ color: C.M }}>{pad(m)}</span>
          <span className="opacity-40 mx-0.5">:</span>
          <span style={{ color: C.S }}>{pad(s)}</span>
        </div>
        <span className="text-[11px] font-black tracking-[0.2em]" style={{ color: C.H }}>{h24 >= 12 ? "PM" : "AM"}</span>
      </div>

      {/* Binary matrix */}
      <div className="flex flex-col gap-2 relative z-10">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center gap-2.5">
            <span className="w-4 text-center font-black text-xs" style={{ color: row.color }}>{row.key}</span>
            <div className="flex gap-1.5">
              {toBits(row.value).map((bit, ci) => (
                <Tile key={ci} active={bit === 1} color={row.color} delay={ci * 55} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: date + temperature */}
      <div className="flex items-center justify-between gap-3 mt-4 relative z-10">
        <span className="inline-flex items-center gap-1.5 bg-[rgb(var(--on-brand)/0.14)] rounded-full px-3 py-1 text-[11px] font-bold">
          {time.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-black">
          {w ? (
            <><span className="text-base leading-none">{w.icon}</span>{weather.temp}°<span className="text-[11px] font-medium opacity-75">{w.label}</span></>
          ) : (
            <span className="text-[11px] opacity-70 font-medium">📍 Enable location</span>
          )}
        </span>
      </div>

      <style>{`
        @keyframes ffTileOn {
          0% { transform: rotateX(0deg) rotateY(0deg) scale(1); }
          50% { transform: rotateX(90deg) rotateY(45deg) scale(1.12); }
          100% { transform: rotateX(0deg) rotateY(0deg) scale(1); }
        }
        @keyframes ffTileOff {
          0% { transform: rotateX(0deg) rotateY(0deg) scale(1); }
          50% { transform: rotateX(-90deg) rotateY(-45deg) scale(0.92); }
          100% { transform: rotateX(0deg) rotateY(0deg) scale(1); }
        }
      `}</style>
    </div>
  );
}
