import React, { useState } from "react";
import Logo from "../components/Logo";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import VerifyForm from "../components/VerifyForm";

export default function AuthPage({ setView }) {
  const [authState, setAuthState] = useState("login"); 
  const isLogin = authState === "login";

  // FIXED TIMING: This exact string ensures the math matches for every moving layer
  const syncTransition = "transition-all duration-[700ms] ease-[cubic-bezier(0.4,0,0.2,1)]";

  return (
    <div className="relative flex justify-center items-center h-screen font-sans overflow-hidden bg-white">
      
      {/* --- MIRRORED BACKGROUND LAYER --- */}
      {/* Moves at exactly 700ms to flip the colors behind the card */}
      <div className={`absolute inset-0 flex w-[200%] h-full ${syncTransition} ${isLogin ? 'translate-x-0' : '-translate-x-1/2'}`}>
        
        {/* LOGIN STATE BACKGROUND */}
        <div className="flex w-1/2 h-full">
          <div className="w-1/2 h-full bg-[#6c5ce7]"></div>
          <div className="w-1/2 h-full bg-[#f0f2f5]"></div>
        </div>

        {/* REGISTER STATE BACKGROUND */}
        <div className="flex w-1/2 h-full">
          <div className="w-1/2 h-full bg-[#f0f2f5]"></div>
          <div className="w-1/2 h-full bg-[#6c5ce7]"></div>
        </div>
      </div>

      {/* --- MAIN AUTH CARD --- */}
      <div className="relative z-10 bg-white rounded-[50px] shadow-2xl w-[900px] max-w-[95%] min-h-[620px] overflow-hidden border border-white/20">
        
        {/* Floating Brand Label */}
        <div className="absolute top-8 w-full flex justify-center items-center gap-4 z-[1000] tracking-[4px] pointer-events-none">
          <span className={`text-3xl font-black transition-colors duration-[700ms] ${isLogin ? 'text-[#6c5ce7]' : 'text-white'}`}>FOCUS</span>
          <span className={`text-3xl font-black transition-colors duration-[700ms] ${isLogin ? 'text-white' : 'text-[#6c5ce7]'}`}>FLOW</span>
        </div>

        {/* Forms Area (White Section) */}
        <div className={`absolute top-0 h-full w-full md:w-1/2 ${syncTransition} ${isLogin ? 'left-0' : 'translate-x-full'}`}>
          <div className="relative w-full h-full flex flex-col bg-white">
            
            <div className="relative flex-1 overflow-hidden mt-12">
              <div className={`absolute inset-0 px-8 flex items-center ${syncTransition} 
                ${authState === "login" ? "opacity-100 translate-x-0 blur-none z-10" : "opacity-0 -translate-x-12 blur-md z-0"}`}>
                <LoginForm setView={setView} />
              </div>

              <div className={`absolute inset-0 px-8 flex items-center ${syncTransition} 
                ${authState === "register" ? "opacity-100 translate-x-0 blur-none z-10" : "opacity-0 translate-x-12 blur-md z-0"}`}>
                <RegisterForm onComplete={() => setAuthState("verify")} />
              </div>

              <div className={`absolute inset-0 px-8 flex items-center ${syncTransition} 
                ${authState === "verify" ? "opacity-100 scale-100 blur-none z-10" : "opacity-0 scale-95 blur-md z-0"}`}>
                <VerifyForm onVerified={() => setView("dashboard")} />
              </div>
            </div>

            {/* Persistent Google Button */}
            <div className={`w-full flex flex-col items-center pb-10 transition-all duration-[500ms] ${authState === 'verify' ? 'opacity-0 translate-y-10' : 'opacity-100'}`}>
              <div className="w-[75%] flex items-center mb-6 opacity-20">
                <div className="flex-1 h-[1px] bg-black"></div>
                <span className="px-3 text-[10px] font-black uppercase tracking-widest">OR</span>
                <div className="flex-1 h-[1px] bg-black"></div>
              </div>

              <button className="w-[75%] py-3.5 bg-white border border-gray-100 rounded-2xl flex items-center justify-center gap-3 font-bold text-gray-500 hover:bg-gray-50 transition-all text-xs active:scale-95 shadow-sm">
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4" alt="G" />
                {isLogin ? "Sync with Google" : "Forge with Google"}
              </button>
            </div>
          </div>
        </div>

        {/* Purple Overlay Panel (Sliding Section) */}
        <div className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full z-[100] ${syncTransition} ${!isLogin ? '-translate-x-full' : ''}`}>
          <div className="bg-gradient-to-br from-[#6c5ce7] to-[#8271ff] h-full w-full flex items-center justify-center relative overflow-hidden">
            
            <div className="flex flex-col items-center p-12 text-center text-white relative z-10">
              <Logo size="large" />
              <div className="mt-8">
                {isLogin ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-[700ms]">
                    <h1 className="text-3xl font-black tracking-tight">The Ascent Awaits.</h1>
                    <p className="text-white/70 text-xs italic">"Turn your potential into high-performance reality."</p>
                    <button className="mt-6 w-full py-3 border-2 border-white rounded-2xl font-black text-xs tracking-widest hover:bg-white hover:text-[#6c5ce7] transition-all uppercase"
                      onClick={() => setAuthState("register")}>Join the Tribe</button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-[700ms]">
                    <h1 className="text-3xl font-black tracking-tight">System Ready.</h1>
                    <p className="text-white/70 text-xs italic">"Excellence is not an act, but a habit."</p>
                    <button className="mt-6 w-full py-3 border-2 border-white rounded-2xl font-black text-xs tracking-widest hover:bg-white hover:text-[#6c5ce7] transition-all uppercase"
                      onClick={() => setAuthState("login")}>Enter Portal</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}