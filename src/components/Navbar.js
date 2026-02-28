import React, { useState, useEffect, useRef, useContext } from "react";
import { UserContext } from "../components/UserContext";
import Logo from "./Logo";

export default function Navbar({ taskCount, routineCount, setView }) {
  const { userName, setUserName } = useContext(UserContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      setUserName(null);
      setView("auth");
      setShowDropdown(false);
    }
  };

  const getInitials = (name) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "??";
  };

  return (
    <nav className="sticky top-0 z-[1000] m-5 px-6 py-4 flex items-center justify-between bg-gradient-to-br from-[#6c5ce7] to-[#8271ff] backdrop-blur-xl rounded-[20px] shadow-[0_10px_40px_rgba(108,92,231,0.25)] border border-white/20">
      
      <div className="flex items-center gap-5">
        <div 
          onClick={() => setView("dashboard")} 
          className="cursor-pointer transition-transform hover:scale-110 active:scale-95 duration-300 drop-shadow-md"
        >
          <Logo size="small" showText={false} />
        </div>

        <div className="flex flex-col items-start leading-tight">
          <span onClick={() => setView("dashboard")}
            className="text-xl font-black tracking-tighter cursor-pointer select-none text-white drop-shadow-sm">
            FOCUS FLOW </span>
          
          <ul className="flex gap-4 list-none m-0 p-0 mt-1">
            <li>
              <button 
                onClick={() => setView("dashboard")} 
                className="text-white text-[0.7rem] font-black opacity-80 hover:opacity-100 hover:translate-y-[-1px] transition-all duration-300 uppercase tracking-[1px]"
              >
                Dashboard
              </button>
            </li>
            <li>
              <a 
                href="#stats" 
                className="text-white text-[0.7rem] font-black opacity-60 hover:opacity-100 hover:translate-y-[-1px] transition-all duration-300 no-underline uppercase tracking-[1px]"
              >
                Analytics
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Quartz Cells */}
        <div className="hidden sm:flex gap-3 items-center">
          {/* Pending Cell */}
          <div className="relative min-w-[115px] px-4 py-1.5 rounded-[15px] bg-white/15 border border-white/20 backdrop-blur-md flex items-center gap-3 transition-all duration-400 hover:-translate-y-1 hover:bg-white/25 group overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.2)_0%,_transparent_75%)] opacity-50"></div>
            <span className="text-lg z-10 group-hover:scale-110 transition-transform">🎯</span>
            <div className="flex flex-col z-10">
              <span className="font-mono text-lg font-black text-white leading-none">
                {taskCount.toString().padStart(2, '0')}
              </span>
              <span className="text-[0.5rem] font-black text-white/70 tracking-widest uppercase mt-0.5">Pending</span>
            </div>
          </div>

          {/* Routine Cell */}
          <div className="relative min-w-[115px] px-4 py-1.5 rounded-[15px] bg-white/15 border border-white/20 backdrop-blur-md flex items-center gap-3 transition-all duration-400 hover:-translate-y-1 hover:bg-white/25 group overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.2)_0%,_transparent_75%)] opacity-50"></div>
            <span className="text-lg z-10 group-hover:scale-110 transition-transform">⚡</span>
            <div className="flex flex-col z-10">
              <span className="font-mono text-lg font-black text-white leading-none">
                {routineCount.toString().padStart(2, '0')}
              </span>
              <span className="text-[0.5rem] font-black text-white/70 tracking-widest uppercase mt-0.5">Routine</span>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="relative ml-2" ref={dropdownRef}>
          <div 
            className="flex items-center gap-2.5 cursor-pointer group px-2 py-1 rounded-full hover:bg-white/10 transition-all"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="relative w-10 h-10 rounded-full bg-white text-[#6c5ce7] flex items-center justify-center font-black text-[0.85rem] shadow-xl transition-all duration-300 group-hover:scale-105">
              {getInitials(userName)}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#2ecc71] border-2 border-[#6c5ce7] rounded-full shadow-sm"></span>
            </div>
            <span className={`text-white/80 text-[0.7rem] transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
          </div>

          {/* Dropdown Popup */}
          {showDropdown && (
            <div className="absolute top-[60px] right-0 w-60 bg-[#1e1e24] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 z-[2000] animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-[#6c5ce7] flex items-center justify-center text-[0.8rem] text-white font-black">
                  {getInitials(userName)}
                </div>
                <div className="flex flex-col">
                  <p className="text-[0.85rem] font-black text-white leading-tight">{userName}</p>
                  <p className="text-[0.65rem] font-bold text-[#2ecc71] uppercase tracking-tighter">System Active</p>
                </div>
              </div>
              <div className="h-[1px] bg-white/10 my-1 mx-2"></div>
              <div className="px-4 py-3 text-[0.8rem] font-bold text-[#dfe6e9] hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-2">
                <span>⚙️</span> Settings
              </div>
              <div 
                className="px-4 py-3 text-[0.8rem] font-black text-[#ff7675] hover:bg-[#ff7675]/10 cursor-pointer transition-colors flex items-center gap-2"
                onClick={handleLogout}
              >
                <span>🚪</span> Logout System
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}