import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./UserContext";

export default function RegisterForm() {
  const { setUserName } = useUser();
  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setUserName(nameInput || "New User");
    navigate("/verify");
  };

  return (
    /* Removed absolute inset-0 and pt-16 to prevent logo overlap */
    <div className="w-full bg-white flex flex-col items-center p-0">
      <form 
        onSubmit={handleSubmit} 
        className="w-full flex flex-col items-center animate-in fade-in slide-in-from-right-4"
      >
        {/* mb-1 keeps the header close to the logo as seen in your reference */}
        <h2 className="text-2xl font-black text-gray-800 mb-1">New Account</h2>
        <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest">Start the journey</p>
        
        <div className="w-full space-y-3 flex flex-col items-center">
          <input 
            type="text" 
            placeholder="Identity Name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
          <input 
            type="password" 
            placeholder="Create Access Key" 
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
        </div>

        <button 
          type="submit" 
          className="mt-8 w-[80%] py-4 bg-[#f0f2f5] shadow-neu-flat rounded-2xl text-[#6c5ce7] font-black hover:-translate-y-1 transition-all active:scale-95 tracking-widest text-xs"
        >
          CLAIM YOUR REIGN
        </button>
      </form>
    </div>
  );
}