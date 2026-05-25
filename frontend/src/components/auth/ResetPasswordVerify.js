// src/components/auth/ResetPasswordVerify.js
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../../services/api";

export default function ResetPasswordVerify() {
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  useEffect(() => {
    const resetEmail = sessionStorage.getItem('resetEmail');
    if (resetEmail) {
      setEmail(resetEmail);
    } else {
      navigate('/forgot-password');
    }
  }, [navigate]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      if (value && index < 3) {
        document.getElementById(`code-input-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      document.getElementById(`code-input-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 4) {
      setError("Please enter the 4-digit reset code");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const data = await authAPI.verifyResetCode(email, verificationCode);
      
      if (data.success) {
        sessionStorage.setItem('verifiedResetEmail', email);
        sessionStorage.setItem('resetCode', verificationCode);
        navigate('/reset-password');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (err) {
      console.error('Verify reset code error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setCountdown(60);
    
    try {
      const data = await authAPI.forgotPassword(email);
      
      if (data.success) {
        setError("");
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
        setError(data.error || 'Failed to resend code');
        setCanResend(true);
      }
    } catch (err) {
      console.error('Resend code error:', err);
      setError(err.message || 'Network error. Please try again.');
      setCanResend(true);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full flex flex-col items-center animate-in zoom-in duration-500">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-2xl font-black text-gray-800 mb-1">Reset Password</h2>
        <p className="text-gray-400 text-[10px] font-bold mb-2 uppercase tracking-[2px] text-center max-w-[250px]">
          We sent a 4-digit code to
        </p>
        <p className="text-focusPurple font-bold text-sm mb-4">{email}</p>
        
        {error && (
          <div className="w-[80%] mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}
        
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              id={`code-input-${i}`}
              type="text"
              maxLength="1"
              value={code[i]}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="w-12 h-14 bg-[#f0f2f5] shadow-neu-pressed rounded-xl text-center font-black text-xl text-[#6c5ce7] outline-none border border-transparent focus:border-[#6c5ce7]/30 transition-all"
            />
          ))}
        </div>

        <button 
          onClick={handleVerify} 
          className="w-[80%] py-4 bg-[#6c5ce7] text-white rounded-2xl font-black shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-95 transition-all tracking-widest text-xs"
          disabled={loading}
        >
          {loading ? "VERIFYING..." : "VERIFY CODE"}
        </button>
        
        <p 
          onClick={handleResendCode} 
          className={`mt-6 text-[10px] font-bold text-gray-400 uppercase transition-all ${
            canResend ? 'cursor-pointer hover:text-[#6c5ce7]' : 'cursor-not-allowed opacity-50'
          }`}
        >
          {canResend ? 'Resend Code' : `Resend Code (${countdown}s)`}
        </p>
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-[#6c5ce7] font-bold text-xs hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}