import React, { useState } from 'react';

const Sidebar = ({ setView, currentView }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'deepwork', label: 'Deep Work', icon: '⚡' },
    { id: 'routine', label: 'Daily Routine', icon: '🕒' },
    { id: 'streak', label: 'Daily Streak', icon: '🔥' },
    { id: 'timetable', label: 'Timetable', icon: '📅' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div 
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={`fixed left-5 top-[120px] h-[calc(100vh-180px)] bg-gradient-to-br from-[#6c5ce7] to-[#8271ff] backdrop-blur-xl border border-white/20 rounded-[30px] flex flex-col py-8 shadow-[0_20px_50px_rgba(108,92,231,0.3)] z-[1000] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isOpen ? 'w-[240px]' : 'w-[85px]'}`}
    >
      
      {/* Profile Section */}
      <div className="flex flex-col items-center px-4 mb-10 relative">
        <div className="relative group">
          <div className="w-[52px] h-[52px] bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center font-black border border-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
            MA
          </div>
          {/* Status Dot matched to Auth UI */}
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#2ecc71] border-2 border-[#6c5ce7] rounded-full shadow-sm"></span>
        </div>
        
        <div className={`mt-4 text-center transition-all duration-500 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <p className="text-white font-black text-[0.9rem] whitespace-nowrap">Ahmad Malik</p>
          <p className="text-white/60 text-[0.65rem] font-bold tracking-widest uppercase">Elite Member</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-3 px-3">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setView(item.id)} 
              className={`group relative flex items-center h-[50px] transition-all duration-300 rounded-2xl
                ${isActive 
                  ? 'bg-white text-[#6c5ce7] shadow-xl shadow-purple-900/20' 
                  : 'text-white hover:bg-white/10'}`}
            >
              {/* Icon Container */}
              <div className="min-w-[60px] flex items-center justify-center">
                <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-120'}`}>
                  {item.icon}
                </span>
              </div>
              
              {/* Label */}
              <span className={`font-bold text-[0.85rem] tracking-wide whitespace-nowrap transition-all duration-500
                ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                {item.label}
              </span>

              {/* Active Indicator matched to FocusPurple */}
              {isActive && (
                <div className="absolute left-0 w-1.5 h-6 bg-[#6c5ce7] rounded-r-full"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Streak Widget */}
      <div className={`mt-auto px-4 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
         <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] text-white/50 font-black leading-tight uppercase tracking-[2px]">Current Streak</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl">🔥</span>
              <p className="text-white font-black text-xl">12 Days</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;