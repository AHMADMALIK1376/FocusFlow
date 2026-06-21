// src/components/auth/LoginForm.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "./UserContext";

export default function LoginForm() {
  const { login, isLoading, error, clearError } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requiresVerification, setRequiresVerification] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setRequiresVerification(false);

    const result = await login(email, password);

    if (result.success) {
      navigate("/dashboard");
    } else if (result.requiresVerification) {
      sessionStorage.setItem("pendingVerificationEmail", email);
      setRequiresVerification(true);
      setTimeout(() => {
        navigate("/verify");
      }, 1500);
    }
  };

  const inputCls =
    "w-[85%] py-4 px-5 rounded-token-md bg-surface text-ink placeholder:text-muted/70 shadow-neu-inset outline-none text-sm font-medium focus:ring-2 focus:ring-brand/60 transition-all";

  return (
    <div className="w-full flex flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4">
        <h2 className="text-2xl font-black text-ink mb-1">Welcome Back</h2>
        <p className="text-muted text-xs font-bold mb-6 uppercase tracking-widest">Reconnect with goals</p>

        {error && (
          <div className="w-[85%] mb-4 p-3 bg-focus/10 border border-focus/30 text-focus rounded-token-sm text-sm font-bold text-center">
            {error}
          </div>
        )}

        {requiresVerification && (
          <div className="w-[85%] mb-4 p-3 bg-warn/15 border border-warn/40 text-ink rounded-token-sm text-sm font-bold text-center">
            ⚠️ Email not verified! Redirecting to verification page...
          </div>
        )}

        <div className="w-full space-y-3 flex flex-col items-center">
          <input
            type="email"
            placeholder="Growth Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            required
          />
          <input
            type="password"
            placeholder="Access Key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div className="w-[85%] text-right mt-2">
          <Link to="/forgot-password" className="text-[10px] text-muted hover:text-brand transition-colors">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-[85%] py-4 mt-6 rounded-token-md bg-grad-hero text-on-brand font-black text-[11px] tracking-widest uppercase shadow-[0_10px_24px_rgb(var(--brand)/0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-60"
        >
          {isLoading ? "LOGGING IN..." : "UNLEASH FOCUS"}
        </button>

        <div className="relative w-[85%] my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[rgb(var(--ink)/0.12)]"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-3 text-xs font-bold text-muted uppercase tracking-wider">or</span>
          </div>
        </div>
      </form>
    </div>
  );
}
