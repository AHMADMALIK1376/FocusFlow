import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "./UserContext";

export default function LoginForm() {
  const { login, isLoading, error, clearError } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="w-full bg-white flex flex-col items-center p-0">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4">
        <h2 className="text-2xl font-black text-gray-800 mb-1">Welcome Back</h2>
        <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest">Reconnect with goals</p>
        
        {/* Error Message Display */}
        {error && (
          <div className="w-[80%] mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}
        
        <div className="w-full space-y-3 flex flex-col items-center">
          <input 
            type="email" 
            placeholder="Growth Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
          <input 
            type="password" 
            placeholder="Access Key" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
        </div>

        <button 
          type="submit" 
          className="magic-btn mt-8 w-[80%] tracking-widest text-xs"
          disabled={isLoading}
        >
          {isLoading ? "LOGGING IN..." : "UNLEASH FOCUS"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          New here?{" "}
          <Link to="/signup" className="text-[#6c5ce7] font-bold hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}