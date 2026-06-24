// src/components/auth/RegisterForm.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPasswordSuggestions, setShowPasswordSuggestions] = useState(false);
  const passwordInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const generateSuggestedPassword = () => {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const special = "!@#$%&*";

    let generated = "";
    generated += uppercase[Math.floor(Math.random() * uppercase.length)];
    generated += lowercase[Math.floor(Math.random() * lowercase.length)];
    generated += numbers[Math.floor(Math.random() * numbers.length)];
    generated += special[Math.floor(Math.random() * special.length)];

    const allChars = uppercase + lowercase + numbers + special;
    const remainingLength = 10 + Math.floor(Math.random() * 4);
    for (let i = 4; i < remainingLength; i++) {
      generated += allChars[Math.floor(Math.random() * allChars.length)];
    }

    generated = generated.split("").sort(() => 0.5 - Math.random()).join("");
    return generated;
  };

  const suggestedPassword = generateSuggestedPassword();

  const useSuggestedPassword = () => {
    setPassword(suggestedPassword);
    setShowPasswordSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        passwordInputRef.current &&
        !passwordInputRef.current.contains(event.target)
      ) {
        setShowPasswordSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (!password) {
      setError("Please enter a password");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      const data = await authAPI.register(email, password, fullName);

      if (data.success) {
        sessionStorage.setItem("pendingVerificationEmail", email);
        setSuccessMessage(data.message || "Verification code sent to your email!");
        setTimeout(() => {
          navigate("/verify");
        }, 2000);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full py-4 px-5 rounded-token-md bg-surface text-ink placeholder:text-muted/70 shadow-neu-inset outline-none text-sm font-medium focus:ring-2 focus:ring-brand/60 transition-all";

  return (
    <div className="w-full flex flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-right-4">
        <h2 className="text-2xl font-black text-ink mb-1">New Account</h2>
        <p className="text-muted text-xs font-bold mb-6 uppercase tracking-widest">Start the journey</p>

        {error && (
          <div className="w-[85%] mb-4 p-3 bg-focus/10 border border-focus/30 text-focus rounded-token-sm text-sm font-bold text-center">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="w-[85%] mb-4 p-3 bg-success/15 border border-success/40 text-success rounded-token-sm text-sm font-bold text-center">
            {successMessage}
          </div>
        )}

        <div className="w-[85%] mx-auto space-y-3">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            required
          />

          <div className="relative w-full">
            <input
              ref={passwordInputRef}
              type="password"
              placeholder="Create Access Key"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordSuggestions(true)}
              className={inputCls}
              required
            />

            {showPasswordSuggestions && !password && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 left-0 right-0 mt-2 bg-surface rounded-token-md shadow-glass border border-[rgb(var(--ink)/0.08)] overflow-hidden animate-in fade-in slide-in-from-top-2"
              >
                <div className="p-4 bg-brand/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔐</span>
                    <div>
                      <p className="text-sm font-black text-ink">Suggested password</p>
                      <p className="text-[10px] text-muted">Strong and secure</p>
                    </div>
                  </div>
                </div>

                <div
                  className="p-4 hover:bg-[rgb(var(--ink)/0.04)] cursor-pointer transition-colors"
                  onClick={useSuggestedPassword}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono font-bold tracking-wide text-ink bg-canvas px-4 py-2 rounded-token-sm">
                      {suggestedPassword}
                    </code>
                    <span className="text-xs font-black text-brand bg-brand/10 px-3 py-1.5 rounded-full">
                      Use
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-success">✓ Strong password</span>
                    <span className="w-1 h-1 rounded-full bg-muted/50"></span>
                    <span className="text-[10px] text-muted">{suggestedPassword.length} characters</span>
                  </div>
                </div>

                <div
                  className="p-3 text-center border-t border-[rgb(var(--ink)/0.08)] cursor-pointer hover:bg-[rgb(var(--ink)/0.04)] transition-colors"
                  onClick={() => setShowPasswordSuggestions(false)}
                >
                  <p className="text-[11px] font-medium text-muted">Or create your own password →</p>
                </div>
              </div>
            )}
          </div>

          {password && password.length > 0 && password.length < 8 && (
            <p className="w-full text-[10px] text-focus text-left mt-1">
              ⚠️ Password must be at least 8 characters
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-[85%] py-4 mt-6 rounded-token-md bg-grad-hero text-on-brand font-black text-[11px] tracking-widest uppercase shadow-[0_10px_24px_rgb(var(--brand)/0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-60"
        >
          {loading ? "SENDING CODE..." : "CLAIM YOUR REIGN"}
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
