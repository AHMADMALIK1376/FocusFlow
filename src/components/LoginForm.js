import React, { useState, useContext } from "react";
import { UserContext } from "./UserContext"; // Corrected path

export default function LoginForm({ setView }) {
  const { setUserName } = useContext(UserContext);
  const [email, setEmail] = useState(""); // Now being used below
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // For now, setting a default name to match your AuthPage logic
    setUserName("M. Ahmad Malik"); 
    setView("dashboard");
  };

  return (
    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 pt-16">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4">
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
    </div>
  );
}