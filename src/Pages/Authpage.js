import React, { useState, useEffect } from "react"; // Added useEffect
import Lottie from "lottie-react"; 
import Logo from "../components/Logo";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import VerifyForm from "../components/VerifyForm";

import workingAnimationData from "../assets/animation/Man Working on Laptop in Office.json"; 
import securityAnimationData from "../assets/animation/Profile Password Unlock.json"; 

export default function AuthPage({ setView }) {
  const [authState, setAuthState] = useState("login");
  const [isLoaded, setIsLoaded] = useState(false); // New state to prevent mounting lag

  // Pre-render check to ensure the page slides in before heavy Lottie logic starts
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const isLogin = authState === "login";
  const isVerify = authState === "verify"; 
  const syncTransition = "transition-all duration-[700ms] ease-[cubic-bezier(0.4,0,0.2,1)]";

  return (
    <div className="relative flex justify-center items-center h-screen font-sans overflow-hidden bg-white">
      
      {/* --- BACKGROUND LAYER --- (Used transform for better performance) */}
      <div className={`absolute inset-0 flex w-[200%] h-full will-change-transform ${syncTransition} ${isLogin ? 'translate-x-0' : '-translate-x-1/2'}`}>
        <div className="flex w-1/2 h-full">
          <div className="w-1/2 h-full bg-[#6c5ce7]"></div>
          <div className="w-1/2 h-full bg-[#f0f2f5]"></div>
        </div>
        <div className="flex w-1/2 h-full">
          <div className="w-1/2 h-full bg-[#f0f2f5]"></div>
          <div className="w-1/2 h-full bg-[#6c5ce7]"></div>
        </div>
      </div>

      {/* --- MAIN AUTH CARD --- */}
      <div className="relative z-10 bg-white rounded-[50px] shadow-2xl w-[900px] max-w-[95%] min-h-[620px] overflow-hidden border border-white/20 animate-in fade-in duration-500">
        
        {/* TOP TITLE */}
        <div className="absolute top-10 w-full flex justify-center items-center gap-4 z-[1000] tracking-[4px] pointer-events-none">
          <span className={`text-3xl font-black transition-colors duration-[700ms] ${isLogin ? 'text-[#6c5ce7]' : 'text-white'}`}>FOCUS</span>
          <span className={`text-3xl font-black transition-colors duration-[700ms] ${isLogin ? 'text-white' : 'text-[#6c5ce7]'}`}>FLOW</span>
        </div>

        {/* --- FORMS SIDE --- */}
        <div className={`absolute top-0 h-full w-full md:w-1/2 will-change-transform ${syncTransition} ${isLogin ? 'left-0' : 'translate-x-full'}`}>
          <div className="relative w-full h-full flex flex-col bg-white items-center pt-28 px-10">
            {!isVerify && (
              <div className="mb-4 z-20">
                  <Logo size="small" />
              </div>
            )}

            <div className="w-full z-10">
              {authState === "login" && <LoginForm setView={setView} />}
              {authState === "register" && <RegisterForm onComplete={() => setAuthState("verify")} />}
              {authState === "verify" && <VerifyForm onVerified={() => setView("dashboard")} />}
            </div>

            {!isVerify && (
              <div className="absolute bottom-10 w-full flex justify-center px-10">
                <button className="flex items-center justify-center gap-3 w-[80%] py-4 bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] rounded-2xl transition-all active:scale-95 group">
                  <img src="https://www.vectorlogo.zone/logos/google/google-icon.svg" alt="Google" className="w-5 h-5" />
                  <span className="text-[11px] font-black text-gray-500 tracking-widest uppercase">Sync with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- VISUAL SIDE --- */}
        <div className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full z-[100] will-change-transform ${syncTransition} ${!isLogin ? '-translate-x-full' : ''}`}>
          <div className="bg-gradient-to-br from-[#6c5ce7] to-[#8271ff] h-full w-full flex items-center justify-center relative overflow-hidden">
            <div className="flex flex-col items-center p-12 pt-20 text-center text-white relative z-10">
              
              {/* Animation pre-loaded and key-stable */}
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
                  <button className="mt-8 px-10 py-3 border-2 border-white rounded-2xl font-black text-xs tracking-widest hover:bg-white hover:text-[#6c5ce7] transition-all uppercase"
                    onClick={() => setAuthState(isLogin ? "register" : "login")}>
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