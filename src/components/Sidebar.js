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
    <div className={`fixed left-5 top-[150px] h-[calc(100vh-220px)] bg-gradient-to-br from-[#6c5ce7]/60 to-[#a855f7]/60 backdrop-blur-xl border border-white/20 rounded-[20px] flex flex-col py-6 shadow-2xl z-[1000] transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'w-[260px]' : 'w-[85px]'}`}>
      
      {/* Profile Section */}
      <div 
        className="flex flex-col items-center px-2.5 mb-6 cursor-pointer relative text-center" 
        onClick={() => !isOpen && setIsOpen(true)}
      >
        <div className="relative mb-2">
          <div className="w-[50px] h-[50px] bg-focusPurple text-white rounded-full flex items-center justify-center font-extrabold border-2 border-white/30 shadow-md">
            MD
          </div>
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#00d1b2] border-2 border-white rounded-full"></span>
        </div>
        
        {isOpen && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-300">
            <p className="text-white font-bold text-[0.85rem] whitespace-nowrap mt-1">M. Ahmad Malik</p>
            <button 
              className="absolute top-0 right-2 bg-[#00b894] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
              onClick={(e) => {
                e.stopPropagation(); 
                setIsOpen(false);
              }}
            > ← </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setView(item.id)} 
              className={`group relative flex items-center p-2 mx-3 transition-all duration-300 
                ${isActive 
                  ? 'bg-[#f8f9ff] text-focusPurple rounded-l-[40px] -mr-0 ml-4 shadow-[-5px_0_0_0_#f8f9ff]' 
                  : 'text-white/85 hover:text-white'}`}
            >
              {/* Concave Curve Top */}
              {isActive && (
                <div className="absolute -top-5 right-0 w-5 h-5 bg-transparent rounded-br-[20px] shadow-[5px_5px_0_0_#f8f9ff]"></div>
              )}
              
              <div className={`min-w-[50px] h-[50px] flex items-center justify-center rounded-full transition-all duration-300 z-10
                ${isActive 
                  ? 'bg-white shadow-lg text-focusPurple scale-100' 
                  : 'group-hover:bg-white/25 group-hover:shadow-white/10 group-hover:scale-105'}`}>
                <span className="text-2xl">{item.icon}</span>
              </div>
              
              <span className={`ml-3 font-bold text-[0.95rem] whitespace-nowrap transition-opacity duration-300 
                ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>

              {/* Concave Curve Bottom */}
              {isActive && (
                <div className="absolute -bottom-5 right-0 w-5 h-5 bg-transparent rounded-tr-[20px] shadow-[5px_-5px_0_0_#f8f9ff]"></div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;