import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";  // Link should be here

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
      const response = await fetch('http://localhost:5555/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(data.message);
        sessionStorage.setItem('resetEmail', email);
        setTimeout(() => {
          navigate('/reset-password-verify');
        }, 2000);
      } else {
        setError(data.error || 'Failed to send reset code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white flex flex-col items-center p-0">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4">
        <h2 className="text-2xl font-black text-gray-800 mb-1">Forgot Password</h2>
        <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest text-center">
          Enter your email to receive reset code
        </p>
        
        {error && (
          <div className="w-[80%] mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="w-[80%] mb-4 p-3 bg-green-100 border border-green-300 text-green-600 rounded-xl text-sm font-bold text-center">
            {success}
          </div>
        )}
        
        <div className="w-full space-y-3 flex flex-col items-center">
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
        </div>

        <button 
          type="submit" 
          className="magic-btn mt-8 w-[80%] tracking-widest text-xs"
          disabled={loading}
        >
          {loading ? "SENDING CODE..." : "SEND RESET CODE"}
        </button>
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-[#6c5ce7] font-bold text-sm hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}