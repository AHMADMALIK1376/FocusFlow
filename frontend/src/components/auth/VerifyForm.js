// src/components/auth/VerifyForm.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./UserContext";

export default function VerifyForm() {
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationCode, isLoading } = useUser();
  const inputRefs = useRef([]);
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem("pendingVerificationEmail");
    if (pendingEmail) {
      setEmail(pendingEmail);
    } else {
      navigate("/signup");
    }
  }, [navigate]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 3) inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");
    if (verificationCode.length !== 4) {
      setError("Please enter the 4-digit verification code");
      return;
    }
    setError("");

    // Use the context verifyEmail — it saves the JWT token + user, so the
    // protected dashboard route recognises the session.
    const result = await verifyEmail(email, verificationCode);

    if (result.success) {
      sessionStorage.removeItem("pendingVerificationEmail");
      navigate("/dashboard");
    } else {
      setError(result.error || "Verification failed");
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    setError("");

    const result = await resendVerificationCode(email);
    if (result.success) {
      setInfo("A new code was sent. Check your inbox AND spam/promotions folder.");
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(result.error || "Failed to resend code");
      setCanResend(true);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full flex flex-col items-center animate-in zoom-in duration-500">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-2xl font-black text-ink mb-1">Verify Identity</h2>
        <p className="text-muted text-[10px] font-bold mb-2 uppercase tracking-[2px] text-center max-w-[250px]">
          We sent a 4-digit code to
        </p>
        <p className="text-brand font-bold text-sm mb-4">{email}</p>

        {error && (
          <div className="w-[85%] mb-4 p-3 bg-focus/10 border border-focus/30 text-focus rounded-token-sm text-sm font-bold text-center">
            {error}
          </div>
        )}
        {info && (
          <div className="w-[85%] mb-4 p-3 bg-info/10 border border-info/30 text-info rounded-token-sm text-xs font-bold text-center">
            {info}
          </div>
        )}

        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={code[i]}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="w-12 h-14 bg-surface shadow-neu-inset rounded-token-sm text-center font-black text-xl text-brand outline-none border border-transparent focus:ring-2 focus:ring-brand/40 transition-all"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={isLoading}
          className="w-[85%] py-4 bg-grad-hero text-on-brand rounded-token-md font-black shadow-[0_10px_24px_rgb(var(--brand)/0.4)] hover:-translate-y-0.5 active:scale-95 transition-all tracking-widest text-xs disabled:opacity-60"
        >
          {isLoading ? "VERIFYING..." : "VERIFY & ENTER"}
        </button>

        <p
          onClick={handleResendCode}
          className={`mt-6 text-[10px] font-bold text-muted uppercase transition-all ${
            canResend ? "cursor-pointer hover:text-brand" : "cursor-not-allowed opacity-50"
          }`}
        >
          {canResend ? "Resend Code" : `Resend Code (${countdown}s)`}
        </p>
      </div>
    </div>
  );
}
