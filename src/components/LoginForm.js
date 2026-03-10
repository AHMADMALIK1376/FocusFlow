import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "./UserContext";

export default function LoginForm() {
  const { setUserName } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setUserName("M. Ahmad Malik"); 
    navigate("/verify");
  };

  return (
    /* Removed 'absolute inset-0' to prevent overlapping the logo */
    <div className="w-full bg-white flex flex-col items-center p-0">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4">
        {/* mb-1 keeps the header tight to the logo as requested */}
        <h2 className="text-2xl font-black text-gray-800 mb-1">Welcome Back</h2>
        <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest">Reconnect with goals</p>
        
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

        <button type="submit" className="mt-8 w-[80%] py-4 bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] rounded-2xl text-[#6c5ce7] font-black hover:-translate-y-1 transition-all active:scale-95 tracking-widest text-xs">
          UNLEASH FOCUS
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