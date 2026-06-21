// src/components/auth/ForgotPasswordForm.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";

export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await authAPI.forgotPassword(email);
      if (data.success) {
        setSuccess(data.message || "Reset code sent to your email!");
        sessionStorage.setItem('resetEmail', email);
        setTimeout(() => { navigate('/reset-password-verify'); }, 2000);
      } else {
        setError(data.error || 'Failed to send reset code');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-[80%] p-4 bg-surface-2 rounded-token-md border border-[rgb(var(--ink)/0.08)] outline-none text-sm text-ink placeholder:text-muted focus:border-brand transition-all";

  return (
    <div className="w-full flex flex-col items-center p-0">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4">
        <h2 className="text-2xl font-black text-ink mb-1">Forgot Password</h2>
        <p className="text-muted text-xs font-bold mb-6 uppercase tracking-widest text-center">
          Enter your email to receive reset code
        </p>

        {error && (
          <div className="w-[80%] mb-4 p-3 bg-focus/10 border border-focus/30 text-focus rounded-token-sm text-sm font-bold text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="w-[80%] mb-4 p-3 bg-success/10 border border-success/30 text-success rounded-token-sm text-sm font-bold text-center">
            {success}
          </div>
        )}

        <div className="w-full space-y-3 flex flex-col items-center">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <button
          type="submit"
          className="w-[80%] py-4 mt-8 rounded-token-md bg-grad-hero text-on-brand font-black text-[11px] tracking-widest uppercase shadow-[0_10px_24px_rgb(var(--brand)/0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "SENDING CODE..." : "SEND RESET CODE"}
        </button>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-brand font-bold text-sm hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
