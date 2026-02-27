import React, { useState } from 'react';
import '../Style/Sidebar.css';

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
    <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
      {/* Profile Section - Stacks vertically when open */}
      <div className="sidebar-profile" onClick={() => !isOpen && setIsOpen(true)}>
        <div className="profile-img-container">
          <div className="sidebar-avatar-placeholder">MD</div>
          <span className="status-dot"></span>
        </div>
        
        {isOpen && (
          <div className="profile-info-text">
            <p className="profile-name">M. Ahmad Malik</p>
          </div>
        )}
        
        {isOpen && (
          <button className="close-sidebar-btn" onClick={(e) => {
            e.stopPropagation(); 
            setIsOpen(false);
          }}> ← </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => setView(item.id)} 
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
          >
            {/* The white circle hover effect happens on this wrapper */}
            <div className="nav-icon-wrapper">
               <span className="nav-icon">{item.icon}</span>
            </div>
            <span className="nav-text">{item.label}</span>
          </button>
        ))}
      </nav>

      
    </div>
  );
};

export default Sidebar;