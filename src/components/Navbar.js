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
    <nav className="sticky top-0 z-[1000] m-5 px-6 py-4 flex items-center justify-between bg-gradient-to-br from-[#6c5ce7]/60 to-[#a855f7]/60 backdrop-blur-xl rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/20">
      
      {/* LEFT SECTION: Logo & Navigation */}
      <div className="flex items-center gap-5">
        {/* The Logo Integration */}
        <div 
          onClick={() => setView("dashboard")} 
          className="cursor-pointer transition-transform hover:scale-110 active:scale-95 duration-300"
        >
          <Logo size="small" showText={false} />
        </div>

        <div className="flex flex-col items-start">
          <span 
            onClick={() => setView("dashboard")}
            className="text-xl font-[800] tracking-tighter cursor-pointer select-none bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent"
          >
            FocusFlow
          </span>
          
          {/* Nav Links with Hover Effects */}
          <ul className="flex gap-4 list-none m-0 p-0 mt-1">
            <li>
              <button 
                onClick={() => setView("dashboard")} 
                className="text-white text-[0.75rem] font-bold opacity-90 hover:opacity-100 hover:text-[#6c5ce7] transition-all duration-300 uppercase tracking-wider"
              >
                Dashboard
              </button>
            </li>
            <li>
              <a 
                href="#stats" 
                className="text-white text-[0.75rem] font-bold opacity-70 hover:opacity-100 hover:text-white transition-all duration-300 no-underline uppercase tracking-wider"
              >
                Analytics
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHT SECTION: Quartz Cells & Profile */}
      <div className="flex items-center gap-4">
        
        {/* Quartz Cells */}
        <div className="hidden sm:flex gap-3 items-center">
          {/* Pending Cell */}
          <div className="relative min-w-[110px] px-4 py-1.5 rounded-[14px] bg-white/15 border border-white/20 backdrop-blur-sm flex items-center gap-3 transition-all duration-400 hover:-translate-y-1 hover:bg-white/25 group overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(108,92,231,0.3)_0%,_transparent_75%)] opacity-80"></div>
            <span className="text-lg z-10 group-hover:scale-110 transition-transform">🎯</span>
            <div className="flex flex-col z-10">
              <span className="font-mono text-lg font-black text-white leading-none">
                {taskCount.toString().padStart(2, '0')}
              </span>
              <span className="text-[0.55rem] font-extrabold text-white/80 tracking-widest uppercase mt-0.5">Pending</span>
            </div>
          </div>

          {/* Routine Cell */}
          <div className="relative min-w-[110px] px-4 py-1.5 rounded-[14px] bg-white/15 border border-white/20 backdrop-blur-sm flex items-center gap-3 transition-all duration-400 hover:-translate-y-1 hover:bg-white/25 group overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(108,92,231,0.3)_0%,_transparent_75%)] opacity-80"></div>
            <span className="text-lg z-10 group-hover:scale-110 transition-transform">⚡</span>
            <div className="flex flex-col z-10">
              <span className="font-mono text-lg font-black text-white leading-none">
                {routineCount.toString().padStart(2, '0')}
              </span>
              <span className="text-[0.55rem] font-extrabold text-white/80 tracking-widest uppercase mt-0.5">Routine</span>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="relative ml-2" ref={dropdownRef}>
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="relative w-10 h-10 rounded-full bg-[#6c5ce7] text-white flex items-center justify-center font-black text-[0.85rem] shadow-lg group-hover:shadow-[#6c5ce7]/40 transition-all duration-300">
              {getInitials(userName)}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2ecc71] border-2 border-[#2d3436] rounded-full"></span>
            </div>
            <span className={`text-white/60 text-[0.7rem] transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
          </div>

          {/* Dropdown Popup */}
          {showDropdown && (
            <div className="absolute top-[55px] right-0 w-56 bg-[#1e1e24] border border-white/10 rounded-xl shadow-2xl py-2 z-[2000] animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-8 h-8 rounded-full bg-[#6c5ce7] flex items-center justify-center text-[0.75rem] text-white font-bold">
                  {getInitials(userName)}
                </div>
                <div className="flex flex-col">
                  <p className="text-[0.85rem] font-semibold text-white leading-tight">{userName}</p>
                  <p className="text-[0.7rem] text-[#2ecc71]">System Online</p>
                </div>
              </div>
              <div className="h-[1px] bg-white/10 my-2"></div>
              <div className="px-4 py-2.5 text-[0.85rem] text-[#dfe6e9] hover:bg-white/5 cursor-pointer transition-colors">⚙️ Settings</div>
              <div 
                className="px-4 py-2.5 text-[0.85rem] text-[#ff7675] hover:bg-[#ff7675]/10 cursor-pointer transition-colors font-medium"
                onClick={handleLogout}
              >
                🚪 Logout System
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}