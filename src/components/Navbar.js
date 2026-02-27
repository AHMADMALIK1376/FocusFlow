import React, { useState, useEffect, useRef, useContext } from "react";
import { UserContext } from "../components/UserContext"; 
import Logo from "./Logo";
import "../Style/Navbar.css";

export default function Navbar({ taskCount, routineCount, setView }) {
  const { userName, setUserName } = useContext(UserContext); 
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
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
    setUserName(null); // This triggers the App.js useEffect to clear the session
    setView("auth");   // This tells the App.js to switch the component
    setShowDropdown(false); // Close the menu
  }
};

  const getInitials = (name) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "??";
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div onClick={() => setView("dashboard")} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Logo size="small" showText={false} />
        </div>

    <div className="brand-group">
    <h1 className="logo-text" onClick={() => setView("dashboard")}> Focus<span>Flow</span></h1>
    <ul className="nav-links"> 
    <li><button className="nav-btn-link" onClick={() => setView("dashboard")}>Dashboard</button></li>
    <li><a href="#stats">Analytics</a></li>
    </ul>
    </div>
    </div>

      <div className="nav-right">
      <div className="quartz-container">
      <div className={`quartz-cell ${taskCount === 0 ? 'complete' : ''}`}>
      <div className="quartz-glow"></div>
            <span className="quartz-icon">🎯</span>
            <div className="quartz-data">
              <span className="quartz-number">{taskCount.toString().padStart(2, '0')}</span>
              <span className="quartz-label">PENDING</span>
            </div>
          </div>

          <div className={`quartz-cell routine ${routineCount === 0 ? 'complete' : ''}`}>
            <div className="quartz-glow"></div>
            <span className="quartz-icon">⚡</span>
            <div className="quartz-data">
              <span className="quartz-number">{routineCount.toString().padStart(2, '0')}</span>
              <span className="quartz-label">ROUTINE</span>
            </div>
          </div>

          <div className="nav-profile-section" ref={dropdownRef}>
            <div className="nav-avatar-trigger" onClick={() => setShowDropdown(!showDropdown)}>
              <div className="nav-avatar">
                {getInitials(userName)}
                <span className="nav-online-dot"></span>
              </div>
              <span className={`nav-arrow ${showDropdown ? 'open' : ''}`}>▾</span>
            </div>

            {showDropdown && (
              <div className="nav-dropdown-popup">
                <div className="dropdown-user-header">
                  <div className="header-avatar">{getInitials(userName)}</div>
                  <div className="header-info">
                    <p className="header-name">{userName}</p>
                    <p className="header-status">Online</p>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item">⚙️ Settings</div>
                <div className="dropdown-item">🎨 Themes</div>
                <div className="dropdown-item">❓ Help</div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item logout-red" onClick={handleLogout}>🚪 Log out</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}