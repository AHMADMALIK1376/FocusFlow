import React, { useEffect, useState } from "react";
import Logo from "../components/Logo";

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
      className={`fixed inset-0 bg-[linear-gradient(135deg,#8d81e8_0%,#886ad0_100%)] flex justify-center items-center z-[9999] overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] 
      ${fadeOut ? "opacity-0 scale-110 blur-[10px]" : "opacity-100"}`}
    >
      {/* Moving Aura Blobs */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,#ffffff,transparent)] blur-[100px] opacity-[0.35] -top-[15%] -left-[10%] animate-[orbit_20s_infinite_linear]"></div>
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,#a29bfe,transparent)] blur-[100px] opacity-[0.35] -bottom-[15%] -right-[10%] animate-[orbit_15s_infinite_linear_reverse]"></div>

      <div className="text-center z-10 animate-[content-reveal_1.2s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex justify-center">
          <Logo size="large" showText={false} /> 
        </div>

        <h1 className="text-[3.8rem] font-[900] text-white tracking-[-1.5px] mt-[25px] uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          FOCUS<span className="pl-[10px]">FLOW</span>
        </h1>

        <div className="w-[200px] h-[2px] bg-white/20 rounded-[10px] mx-auto mt-[40px] overflow-hidden relative">
          <div className="h-full bg-white w-[80px] absolute shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-[shimmer-swipe_2.2s_infinite_ease-in-out]"></div>
        </div>

        <p className="text-white text-[0.9rem] tracking-[5px] uppercase mt-[15px] font-semibold opacity-80">
          Organizing Your Daily Life
        </p> 
      </div>
    </div>
  );
}