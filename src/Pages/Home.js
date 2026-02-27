import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../components/UserContext"; 
import UniCalendar from "../components/UniCalendar";
import DailyTimetableCard from "../components/DailyTimetableCard";
import FocusTimer from "../components/FocusTimer";
import Sidebar from "../components/Sidebar"; // Import the Sidebar component
import "../Style/Home.css";

export default function Home({ timetable, completedGoals, setView, hours, minutes, seconds, isActive }) {
  const { userName } = useContext(UserContext); 
  const [greeting, setGreeting] = useState("Welcome back");
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getAppreciationMessage = () => {
    if (completedGoals === 0) return "Complete tasks to see your performance!";
    if (completedGoals < 5) return "Great start! Keep the momentum going. 🚀";
    if (completedGoals < 15) return "Keep it up! You're building a solid habit. 💪";
    if (completedGoals < 25) return "Good job! You're becoming a productivity pro. ✨";
    if (completedGoals < 50) return "Academic Beast Mode! Your dedication is inspiring. 🔥";
    return "Legendary Status! You've mastered your timeline. 👑";
  };

  return (
    <div className="home-container-layout">
      {/* Sidebar added here - currentView set to dashboard */}
      <Sidebar setView={setView} currentView="dashboard" />

      {/* Main content area shifted to the right */}
      <div className="main-content-wrapper">
        <div className="home-page">
          <section className="hero">
            <div className="time-badge">{currentTime}</div>
            <h1 className="hero-title"> 
              {greeting}, <span className="gradient-text">{userName}.</span> 
            </h1>
            <p className="hero-subtitle">
              Your University life, organized. You have crushed <b>{completedGoals}</b> targets so far.
            </p>
          </section>

          <div className="stats-grid">
            <div className="stat-card neumorphic">
              <div className="card-header">
                <span className="icons">🎯</span>
                <h3>Goals Finished</h3> 
              </div>
              <div className="count-display">{completedGoals}</div>
              <div className="auto-goal-status" style={{ color: '#00b894', fontWeight: '700', marginTop: '10px' }}>
                ✨ Live Sync Active
              </div>
              <p className="card-desc" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#6c5ce7', marginTop: '8px' }}>
                {getAppreciationMessage()}
              </p>
            </div>

            <FocusTimer  
              setView={setView} 
              hours={hours} 
              minutes={minutes} 
              seconds={seconds} 
              isActive={isActive} 
            />

            <DailyTimetableCard schedule={timetable} setView={setView} />
            <UniCalendar setView={setView} />
          </div>
        </div>
      </div>
    </div>
  );
}