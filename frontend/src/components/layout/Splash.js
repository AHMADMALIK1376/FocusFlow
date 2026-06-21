import React, { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Splash({ onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 3800);
    const removeTimer = setTimeout(onComplete, 4600);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-grad-hero flex justify-center items-center z-[9999] overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      ${fadeOut ? "opacity-0 scale-110 blur-[10px]" : "opacity-100"}`}
    >
      {/* Moving Aura Blobs - Tinted to match FocusPurple */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,#ffffff,transparent)] blur-[120px] opacity-[0.2] -top-[15%] -left-[10%] animate-[orbit_20s_infinite_linear]"></div>
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,#8271ff,transparent)] blur-[120px] opacity-[0.4] -bottom-[15%] -right-[10%] animate-[orbit_15s_infinite_linear_reverse]"></div>

      <div className="text-center z-10 animate-[content-reveal_1.2s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex justify-center mb-6">
          {/* Logo with a slight white glow to pop against purple */}
          <div className="drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <Logo size="large" showText={false} /> 
          </div>
        </div>

        <h1 className="text-[3.5rem] font-black text-on-brand tracking-[-2px] uppercase drop-shadow-[0_10px_10px_rgba(0,0,0,0.1)]">
          FOCUS<span> FLOW</span>
        </h1>

        {/* The Progress Bar matches the "Syncing" vibe */}
        <div className="w-[180px] h-[3px] bg-white/20 rounded-full mx-auto mt-8 overflow-hidden relative">
          <div className="h-full bg-white w-[60px] absolute shadow-[0_0_20px_rgba(255,255,255,1)] animate-[shimmer-swipe_2s_infinite_ease-in-out]"></div>
        </div>

        <p className="text-on-brand text-[0.7rem] tracking-[6px] uppercase mt-6 font-black opacity-60">
          Organizing Your Daily Life
        </p> 
      </div>
    </div>
  );
}