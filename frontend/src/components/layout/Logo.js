import React from "react";

export default function Logo({ size = "small", showText = false }) {
  const isLarge = size === "large";

  return (
    <div className={`flex items-center justify-center gap-2.5 w-full ${isLarge ? 'flex-col' : 'flex-row justify-start w-auto gap-3'}`}>
      <div
        className={`
          flex justify-center items-center bg-surface border border-[rgb(var(--ink)/0.12)]
          shadow-neu-sm transition-transform duration-300
          ${isLarge
            ? 'w-[120px] h-[120px] rounded-[40px] p-5 animate-[logo-float_3.5s_ease-in-out_infinite]'
            : 'w-[50px] h-[50px] rounded-[15px] m-0 animate-[logo-float-small_3s_ease-in-out_infinite]'}
        `}
      >
        <img
          src="/flow1.png"
          alt="FocusFlow"
          className="w-[85%] h-[85%] object-contain"
          width="85"
          height="85"
        />
      </div>

      {showText && (
        <span className={`font-bold text-ink ${isLarge ? 'text-2xl' : 'text-lg'}`}>
          FocusFlow
        </span>
      )}
    </div>
  );
}
