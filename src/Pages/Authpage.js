import React, { useState, useContext } from "react";
import { UserContext } from "../components/UserContext";
import Logo from "../components/Logo";
import "../Style/Authpage.css";

export default function AuthPage({ setView }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false); // State for OTP screen
  const { setUserName } = useContext(UserContext);

  const existingUser = {
    email: "ahmadmalik1376@gmail.com",
    password: "41171",
    name: "M. Ahmad Malik",
  };

  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = (e) => {
    e.preventDefault();
    if (isLogin) {
      if (formData.email === existingUser.email && formData.password === existingUser.password) {
        setUserName(existingUser.name);
        setView("dashboard");
      } else {
        alert("Access Denied! Check your credentials or join the tribe.");
      }
    } else {
      // Trigger Verification Screen for Sign Up
      setIsVerifying(true);
    }
  };


  return (
    <div className="auth-master-wrapper">
      <div className={`auth-sliding-box ${isLogin ? "" : "signup-mode"} ${isVerifying ? "verifying" : ""}`}>
        
        <div className="auth-header-container">
          <span className={isLogin ? "color-purple" : "color-white"}>FOCUS</span>
          <span className={isLogin ? "color-white" : "color-purple"}>FLOW</span>
        </div>

        <div className="auth-forms-container">
          {!isVerifying && isLogin && (
            <div className="auth-form-block sign-in-form">
              <form onSubmit={handleAuth}>
                <h2 className="auth-title">Resume Your Momentum</h2>
                <p className="auth-subtitle">Reconnect with your goals</p>

                <div className="input-field">
                  <input type="email" name="email" placeholder="Your Growth Email" required onChange={handleChange} />
                </div>
                <div className="input-field">
                  <input type="password" name="password" placeholder="Secure Key" required onChange={handleChange} />
                </div>

                <div className="auth-extras">
                  <label><input type="checkbox" /> Stay Synced</label>
                  <span className="forgot">Recover Key?</span>
                </div>

                <button type="submit" className="auth-main-btn">UNLEASH FOCUS</button>

                <div className="auth-divider"><span>OR</span></div>

                <button type="button" className="google-btn">
                  <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" />
                  Sync with Google
                </button>
              </form>
            </div>
          )}

          {!isVerifying && !isLogin && (
            <div className="auth-form-block sign-up-form">
              <form onSubmit={handleAuth}>
                <h2 className="auth-title">Architect Your Future</h2>
                <p className="auth-subtitle">Design your productivity empire</p>

                <div className="input-field">
                  <input type="text" name="name" placeholder="Preferred Identity" required onChange={handleChange} />
                </div>
                <div className="input-field">
                  <input type="email" name="email" placeholder="Best Contact Email" required onChange={handleChange} />
                </div>
                <div className="input-field">
                  <input type="password" name="password" placeholder="Create Strong Access" required onChange={handleChange} />
                </div>

                <button type="submit" className="auth-main-btn">CLAIM YOUR REIGN</button>

                <div className="auth-divider"><span>OR</span></div>

                <button type="button" className="google-btn">
                  <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" />
                  Forge with Google
                </button>

              </form>
            </div>
          )}

       
        </div>

        <div className="auth-overlay-panel">
          <div className="overlay-content-wrapper">
            <div className="overlay-inner overlay-left">
              <Logo size="large" />
              <h1>Return to Flow</h1>
              <p className="motto">"Excellence is not an act, but a habit."</p>
              <button className="ghost-btn" onClick={() => {setIsLogin(true); setIsVerifying(false);}}>Enter Portal</button>
            </div>
            
            <div className="overlay-inner overlay-right">
              <Logo size="large" />
              <h1>Start the Ascent</h1>
              <p className="motto">Turn your potential into high-performance reality.</p>
              <button className="ghost-btn" onClick={() => setIsLogin(false)}>Join the Tribe</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}