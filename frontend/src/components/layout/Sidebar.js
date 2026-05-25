// src/components/layout/Sidebar.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../auth/UserContext';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userName, userEmail } = useUser();
  const { streak, pendingTasksCount, pendingRoutineCount } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [userInitials, setUserInitials] = useState('??');

  // ==============================================
  // Get user initials from userName or userEmail
  // ==============================================
  useEffect(() => {
    if (userName) {
      const initials = userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      setUserInitials(initials);
    } else if (userEmail) {
      setUserInitials(userEmail[0].toUpperCase());
    } else {
      // Fallback for demo/testing
      setUserInitials('FL');
    }
  }, [userName, userEmail]);

  // ==============================================
  // Menu Items Configuration
  // ==============================================
  const menuItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'deepwork', path: '/focus-mode', label: 'Deep Work', icon: '⚡' },
    { id: 'routine', path: '/routine', label: 'Daily Routine', icon: '🕒' },
    { id: 'streak', path: '/tasks', label: 'Daily Streak', icon: '🔥' },
    { id: 'timetable', path: '/academic', label: 'Timetable', icon: '📅' },
    { id: 'attendance', path: '/attendance', label: 'Attendance', icon: '📊' },
  ];

  // ==============================================
  // Helper to get display name
  // ==============================================
  const getDisplayName = () => {
    if (userName) return userName;
    if (userEmail) return userEmail.split('@')[0];
    return 'User';
  };

  // ==============================================
  // Get initials for avatar
  // ==============================================
  const getInitials = () => userInitials;

  // ==============================================
  // Get streak display value (from context)
  // ==============================================
  const getStreakDisplay = () => {
    return streak || 0;
  };

  return (
    <div 
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={`fixed left-5 top-[120px] h-[calc(100vh-180px)] bg-gradient-to-br from-[#6c5ce7] to-[#8271ff] backdrop-blur-xl border border-white/20 rounded-[30px] flex flex-col py-8 shadow-[0_20px_50px_rgba(108,92,231,0.3)] z-[1000] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform overflow-hidden ${isOpen ? 'w-[240px]' : 'w-[85px]'}`}
    >
      {/* ============================================== */}
      {/* PROFILE SECTION - Dynamic from UserContext */}
      {/* ============================================== */}
      <div className="flex flex-col items-center px-4 mb-6 relative flex-shrink-0">
        <div className="relative group cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-[52px] h-[52px] bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center font-black border border-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300 text-lg">
            {getInitials()}
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#2ecc71] border-2 border-[#6c5ce7] rounded-full shadow-sm"></span>
        </div>
        <div className={`mt-4 text-center transition-all duration-500 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <p className="text-white font-black text-[0.9rem] whitespace-nowrap">
            {getDisplayName()}
          </p>
          <p className="text-white/60 text-[0.65rem] font-bold tracking-widest uppercase">
            Elite Member
          </p>
        </div>
      </div>

      {/* ============================================== */}
      {/* SCROLLABLE NAVIGATION */}
      {/* ============================================== */}
      <nav
        className="flex flex-col gap-3 px-3 overflow-y-auto flex-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`group relative flex items-center h-[50px] flex-shrink-0 transition-all duration-300 rounded-2xl outline-none
                ${isActive
                  ? 'bg-white text-[#6c5ce7] shadow-xl shadow-purple-900/20 scale-[1.02]'
                  : 'text-white hover:bg-white/10 hover:translate-x-1'}`}
            >
              <div className="min-w-[60px] flex items-center justify-center">
                <span className={`text-xl transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-125 group-active:scale-95'}`}>
                  {item.icon}
                </span>
              </div>

              <span className={`font-bold text-[0.85rem] tracking-wide whitespace-nowrap transition-all duration-500
                ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                {item.label}
              </span>

              {isActive && (
                <div className="absolute left-0 w-1.5 h-6 bg-[#6c5ce7] rounded-r-full animate-pulse"></div>
              )}

              {!isOpen && (
                <div className="absolute left-[90px] px-3 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ============================================== */}
      {/* STREAK WIDGET - Dynamic from Context */}
      {/* ============================================== */}
      <div
        onClick={() => navigate('/tasks')}
        className={`px-4 pt-4 flex-shrink-0 cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
          <p className="text-[10px] text-white/50 font-black leading-tight uppercase tracking-[2px]">
            Current Streak
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl animate-bounce">🔥</span>
            <p className="text-white font-black text-xl">
              {getStreakDisplay()} {getStreakDisplay() !== 0 && 'Days'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;