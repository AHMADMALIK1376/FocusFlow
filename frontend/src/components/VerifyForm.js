import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function VerifyForm() {
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (val && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full flex flex-col items-center animate-in zoom-in duration-500">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-2xl font-black text-gray-800 mb-1">Verify Identity</h2>
        <p className="text-gray-400 text-[10px] font-bold mb-8 uppercase tracking-[2px] text-center max-w-[250px]">
          We sent a 6-digit pulse to your email.
        </p>
        
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              maxLength="1"
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="w-12 h-14 bg-[#f0f2f5] shadow-neu-pressed rounded-xl text-center font-black text-xl text-[#6c5ce7] outline-none border border-transparent focus:border-[#6c5ce7]/30 transition-all"
            />
          ))}
        </div>

        <button onClick={() => navigate("/dashboard")} className="w-[80%] py-4 bg-[#6c5ce7] text-white rounded-2xl font-black shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-95 transition-all tracking-widest text-xs">
          VERIFY & ENTER
        </button>
        
        <p className="mt-6 text-[10px] font-bold text-gray-400 uppercase cursor-pointer hover:text-[#6c5ce7]">
          Resend Code
        </p>
      </div>
    </div>
  );
}