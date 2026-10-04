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
      className={`fixed inset-0 bg-canvas flex justify-center items-center z-[9999] overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      ${fadeOut ? "opacity-0 scale-110 blur-[10px]" : "opacity-100"}`}
    >
      <div className="text-center z-10 animate-[content-reveal_1.2s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex justify-center mb-6">
          {/* Coral clay logo tile on the cream background */}
          <div>
            <Logo size="large" showText={false} /> 
          </div>
        </div>

        <h1 className="text-[3.5rem] font-black text-brand tracking-[-1px] uppercase">
          FOCUS<span> FLOW</span>
        </h1>

        {/* The Progress Bar matches the "Syncing" vibe */}
        <div className="w-[180px] h-[6px] bg-surface-2 shadow-neu-inset rounded-full mx-auto mt-8 overflow-hidden relative">
          <div className="h-full bg-grad-sage rounded-full w-[60px] absolute animate-[shimmer-swipe_2s_infinite_ease-in-out]"></div>
        </div>

        <p className="inline-block px-4 py-1.5 rounded-full bg-grad-sage shadow-neu-sm text-on-sage text-[0.7rem] tracking-[6px] uppercase mt-6 font-black">
          Organizing Your Daily Life
        </p> 
      </div>
    </div>
  );
}