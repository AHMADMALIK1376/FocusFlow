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

  // Reusable Quartz Cell Component to keep JSX clean
  const QuartzCell = ({ icon, count, label, isComplete, extraClass = "" }) => (
    <div className={`relative flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 overflow-hidden group 
      ${isComplete 
        ? 'bg-green-50/50 border-green-200' 
        : 'bg-white/80 border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'} ${extraClass}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
      <span className="text-xl">{icon}</span>
      <div className="flex flex-col">
        <span className={`text-lg font-black leading-none ${isComplete ? 'text-green-600' : 'text-gray-800'}`}>
          {count.toString().padStart(2, '0')}
        </span>
        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{label}</span>
      </div>
    </div>
  );

  return (
    <nav className="flex items-center justify-between px-8 py-3 bg-white/70 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[1000]">
      {/* Left Section */}
      <div className="flex items-center gap-8">
        <div onClick={() => setView("dashboard")} className="cursor-pointer flex items-center">
          <Logo size="small" showText={false} />
        </div>

        <div className="flex items-center gap-6">
          <h1 
            onClick={() => setView("dashboard")}
            className="text-2xl font-black text-gray-800 cursor-pointer tracking-tight"
          >
            Focus<span className="text-focusPurple">Flow</span>
          </h1>
          <ul className="flex items-center gap-4 text-sm font-bold text-gray-500"> 
            <li>
              <button onClick={() => setView("dashboard")} className="hover:text-focusPurple transition-colors">Dashboard</button>
            </li>
            <li>
              <a href="#stats" className="hover:text-focusPurple transition-colors">Analytics</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 mr-4">
          <QuartzCell icon="🎯" count={taskCount} label="PENDING" isComplete={taskCount === 0} />
          <QuartzCell icon="⚡" count={routineCount} label="ROUTINE" isComplete={routineCount === 0} />
        </div>

        {/* Profile Section */}
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="relative w-10 h-10 rounded-full bg-focusPurple text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-200 group-hover:scale-105 transition-transform">
              {getInitials(userName)}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <span className={`text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>▾</span>
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-focusPurple flex items-center justify-center font-black text-lg">
                  {getInitials(userName)}
                </div>
                <div className="flex flex-col">
                  <p className="font-bold text-gray-800 leading-none">{userName}</p>
                  <p className="text-xs font-semibold text-green-500 mt-1">● Online</p>
                </div>
              </div>
              <div className="h-[1px] bg-gray-50 my-2"></div>
              <button className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">⚙️ Settings</button>
              <button className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">🎨 Themes</button>
              <button className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">❓ Help</button>
              <div className="h-[1px] bg-gray-50 my-2"></div>
              <button 
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                onClick={handleLogout}
              >
                🚪 Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}