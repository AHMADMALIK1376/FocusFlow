// src/Pages/Authpage.js
import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Lottie from "lottie-react"; 

import workingAnimationData from "../assets/animation/Man Working on Laptop in Office.json"; 
import securityAnimationData from "../assets/animation/Profile Password Unlock.json"; 

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const isLogin = location.pathname === "/login";
  const isVerify = location.pathname === "/verify";
  const syncTransition = "transition-all duration-[700ms] ease-[cubic-bezier(0.4,0,0.2,1)]";

  // Google Sign-In Handler using native API
  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setGoogleError("");
    
    if (!window.google) {
      console.error("Google API not loaded");
      setGoogleError("Google Sign-In is loading. Please try again.");
      setIsGoogleLoading(false);
      return;
    }

    // Initialize Google Sign-In
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: "285851687753-cp7vra60rvs4l6378jt3gvh9i0gb59v6.apps.googleusercontent.com",
      scope: "email profile openid",
      callback: async (tokenResponse) => {
        console.log("Google Token Response:", tokenResponse);
        
        try {
          // Send token to backend
          const response = await fetch('http://localhost:5555/api/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              access_token: tokenResponse.access_token 
            }),
          });
          
          const data = await response.json();
          
          if (data.success && data.token) {
            localStorage.setItem('focus_token', data.token);
            localStorage.setItem('focus_username', data.user?.fullName || data.user?.email || 'User');
            navigate('/dashboard');
          } else {
            setGoogleError(data.error || "Google login failed");
            alert(data.error || "Google login failed");
          }
        } catch (error) {
          console.error("Error during Google login:", error);
          setGoogleError("Network error. Please check your connection.");
          alert("Something went wrong. Please try again.");
        } finally {
          setIsGoogleLoading(false);
        }
      },
      onError: (error) => {
        console.error("Google OAuth Error:", error);
        setGoogleError("Google authentication failed. Please try again.");
        setIsGoogleLoading(false);
      }
    });

    client.requestAccessToken();
  };

  return (
    <div className="relative flex justify-center items-center h-screen font-sans overflow-hidden bg-canvas">
      
      {/* BACKGROUND LAYER */}
      <div className={`absolute inset-0 flex w-[200%] h-full will-change-transform ${syncTransition} ${isLogin ? 'translate-x-0' : '-translate-x-1/2'}`}>
        <div className="flex w-1/2 h-full">
          <div className="w-1/2 h-full bg-brand"></div>
          <div className="w-1/2 h-full bg-canvas"></div>
        </div>
        <div className="flex w-1/2 h-full">
          <div className="w-1/2 h-full bg-canvas"></div>
          <div className="w-1/2 h-full bg-brand"></div>
        </div>
      </div>

      {/* MAIN AUTH CARD */}
      <div className="relative z-10 bg-surface rounded-[50px] shadow-glass w-[900px] max-w-[95%] min-h-[620px] overflow-hidden border border-[rgb(var(--ink)/0.06)] animate-in fade-in duration-500">
        
        {/* TOP TITLE */}
        <div className="absolute top-10 w-full flex justify-center items-center gap-4 z-[1000] tracking-[4px] pointer-events-none">
          <span className={`text-3xl font-black transition-colors duration-[700ms] ${isLogin ? 'text-brand' : 'text-on-brand'}`}>FOCUS</span>
          <span className={`text-3xl font-black transition-colors duration-[700ms] ${isLogin ? 'text-on-brand' : 'text-brand'}`}>FLOW</span>
        </div>

        {/* FORMS SIDE */}
        <div className={`absolute top-0 h-full w-full md:w-1/2 will-change-transform ${syncTransition} ${isLogin ? 'left-0' : 'translate-x-full'}`}>
          <div className="relative w-full h-full flex flex-col bg-surface items-center pt-28 px-10">
            
            <div className="w-full z-10">
              <Outlet />
            </div>

            {!isVerify && (
              <div className="w-full flex flex-col items-center px-10 mt-4">
                {/* Error message display */}
                {googleError && (
                  <div className="mb-3 w-full p-2 bg-focus/10 border border-focus/20 rounded-token-sm text-center">
                    <p className="text-[10px] text-focus font-medium">{googleError}</p>
                  </div>
                )}
                
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-token-md bg-surface text-ink shadow-neu hover:-translate-y-0.5 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-muted border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[11px] font-black text-muted tracking-widest uppercase">
                        Connecting...
                      </span>
                    </>
                  ) : (
                    <>
                      <img 
                        src="https://www.vectorlogo.zone/logos/google/google-icon.svg" 
                        alt="Google" 
                        className="w-5 h-5" 
                      />
                      <span className="text-[11px] font-black text-muted tracking-widest uppercase">
                        Sync with Google
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* VISUAL SIDE */}
        <div className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full z-[100] will-change-transform ${syncTransition} ${!isLogin ? '-translate-x-full' : ''}`}>
          <div className="bg-grad-hero h-full w-full flex items-center justify-center relative overflow-hidden">
            <div className="flex flex-col items-center p-12 pt-20 text-center text-on-brand relative z-10">
              
              <div className="w-64 h-64 mb-6">
                {isLoaded && (
                  <Lottie 
                    key={isVerify ? "v-anim" : "a-anim"}
                    animationData={isVerify ? securityAnimationData : workingAnimationData} 
                    loop={true} 
                    className="w-full h-full transition-opacity duration-500" 
                  />
                )}
              </div>

              <div className="mt-4">
                <h1 className="text-3xl font-black tracking-tight leading-tight uppercase">
                  {isVerify ? "Identity Check" : isLogin ? "The Ascent Awaits." : "System Ready."}
                </h1>
                {!isVerify && (
                  <button
                    type="button"
                    className="mt-8 px-10 py-3 rounded-2xl font-black text-xs tracking-widest uppercase transition-all duration-300 border-2 border-white text-on-brand hover:bg-white hover:text-brand"
                    onClick={() => navigate(isLogin ? "/signup" : "/login")}
                  >
                    {isLogin ? "Join the Tribe" : "Enter Portal"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}