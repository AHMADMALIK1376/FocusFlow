// src/components/auth/RegisterForm.js
import React, { useState } from "react";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      const data = await authAPI.register(email, password, fullName);
      
      if (data.success) {
        // Store email in sessionStorage for verification
        sessionStorage.setItem('pendingVerificationEmail', email);
        setSuccessMessage(data.message || "Verification code sent to your email!");
        // Redirect to verify page after 2 seconds
        setTimeout(() => {
          navigate('/verify');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white flex flex-col items-center p-0">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-right-4">
        <h2 className="text-2xl font-black text-gray-800 mb-1">New Account</h2>
        <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest">Start the journey</p>
        
        {error && (
          <div className="w-[80%] mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="w-[80%] mb-4 p-3 bg-green-100 border border-green-300 text-green-600 rounded-xl text-sm font-bold text-center">
            {successMessage}
          </div>
        )}
        
        <div className="w-full space-y-3 flex flex-col items-center">
          <input 
            type="text" 
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
          <input 
            type="email" 
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
          <input 
            type="password" 
            placeholder="Create Access Key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
            minLength={6}
          />
        </div>

        <button 
          type="submit" 
          className="mt-8 w-[80%] py-4 bg-[#f0f2f5] shadow-neu-flat rounded-2xl text-[#6c5ce7] font-black hover:-translate-y-1 transition-all active:scale-95 tracking-widest text-xs"
          disabled={loading}
        >
          {loading ? "SENDING CODE..." : "CLAIM YOUR REIGN"}
        </button>
      </form>
    </div>
  );
}