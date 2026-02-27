import React, { useState, useContext } from "react";
import { UserContext } from "../components/UserContext";
import Logo from "../components/Logo";

export default function AuthPage({ setView }) {
  const [isLogin, setIsLogin] = useState(true);
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
        alert("Access Denied! Check your credentials.");
      }
    } else {
      setUserName(formData.name || "New Legend");
      setView("dashboard");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#f0f2f5] font-sans overflow-hidden">
      {/* Container */}
      <div className="relative bg-white rounded-[50px] shadow-neu-flat w-[900px] max-w-[95%] min-h-[580px] overflow-hidden border border-white/20">
        
        {/* Floating Brand Label */}
        <div className="absolute top-8 w-full flex justify-center items-center gap-4 z-[1000] tracking-[4px] pointer-events-none">
          <span className={`text-3xl font-black transition-colors duration-500 ${isLogin ? 'text-focusPurple' : 'text-white'}`}>FOCUS</span>
          <span className={`text-3xl font-black transition-colors duration-500 ${isLogin ? 'text-white' : 'text-focusPurple'}`}>FLOW</span>
        </div>

        {/* Forms Area */}
        <div className={`absolute top-0 h-full w-full md:w-1/2 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] 
          ${isLogin ? 'left-0' : 'translate-x-full'}`}>
          
          {/* LOGIN FORM */}
          <div className={`absolute inset-0 bg-white flex flex-col items-center justify-center p-8 pt-16 transition-all duration-500
            ${isLogin ? 'opacity-100 z-10' : 'opacity-0 z-0 invisible'}`}>
            <form onSubmit={handleAuth} className="w-full flex flex-col items-center">
              <h2 className="text-2xl font-black text-gray-800 mb-1">Welcome Back</h2>
              <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest">Reconnect with goals</p>
              
              <div className="w-full space-y-3 flex flex-col items-center">
                <input type="email" name="email" placeholder="Growth Email" required onChange={handleChange}
                  className="w-[75%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" />
                <input type="password" name="password" placeholder="Access Key" required onChange={handleChange}
                  className="w-[75%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" />
              </div>

              <div className="flex justify-between w-[75%] mt-3 text-[10px] font-bold text-gray-400 uppercase">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="accent-focusPurple" /> Stay Synced</label>
                <span className="hover:text-focusPurple cursor-pointer">Recover Key?</span>
              </div>

              <button type="submit" className="mt-6 w-[75%] py-3.5 bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] rounded-2xl text-focusPurple font-black hover:-translate-y-1 transition-all active:scale-95 tracking-widest text-xs">
                UNLEASH FOCUS
              </button>

              <div className="w-[75%] flex items-center my-5 opacity-20">
                <div className="flex-1 h-[1px] bg-black"></div>
                <span className="px-3 text-[10px] font-bold">OR</span>
                <div className="flex-1 h-[1px] bg-black"></div>
              </div>

              <button type="button" className="w-[75%] py-3.5 bg-white border border-gray-100 rounded-2xl flex items-center justify-center gap-3 font-bold text-gray-500 hover:bg-gray-50 transition-all text-xs shadow-sm">
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4" alt="G" />
                Sync with Google
              </button>
            </form>
          </div>

          {/* SIGN UP FORM */}
          <div className={`absolute inset-0 bg-white flex flex-col items-center justify-center p-8 pt-16 transition-all duration-500
            ${!isLogin ? 'opacity-100 z-10' : 'opacity-0 z-0 invisible'}`}>
            <form onSubmit={handleAuth} className="w-full flex flex-col items-center">
              <h2 className="text-2xl font-black text-gray-800 mb-1">New Account</h2>
              <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest">Start the journey</p>
              
              <div className="w-full space-y-3 flex flex-col items-center">
                <input type="text" name="name" placeholder="Identity" required onChange={handleChange}
                  className="w-[75%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" />
                <input type="email" name="email" placeholder="Email" required onChange={handleChange}
                  className="w-[75%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" />
                <input type="password" name="password" placeholder="Access Key" required onChange={handleChange}
                  className="w-[75%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" />
              </div>

              <button type="submit" className="mt-6 w-[75%] py-3.5 bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] rounded-2xl text-focusPurple font-black hover:-translate-y-1 transition-all active:scale-95 tracking-widest text-xs">
                CLAIM YOUR REIGN
              </button>

              <div className="w-[75%] flex items-center my-5 opacity-20">
                <div className="flex-1 h-[1px] bg-black"></div>
                <span className="px-3 text-[10px] font-bold">OR</span>
                <div className="flex-1 h-[1px] bg-black"></div>
              </div>

              <button type="button" className="w-[75%] py-3.5 bg-white border border-gray-100 rounded-2xl flex items-center justify-center gap-3 font-bold text-gray-500 hover:bg-gray-50 transition-all text-xs shadow-sm">
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4" alt="G" />
                Forge with Google
              </button>
            </form>
          </div>
        </div>

        {/* Purple Overlay Panel */}
        <div className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full z-[100] transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${!isLogin ? '-translate-x-full' : ''}`}>
          
          <div className="bg-gradient-to-br from-[#6c5ce7] to-[#8271ff] h-full w-full flex items-center justify-center relative overflow-hidden">
            <div className="flex flex-col items-center p-12 text-center text-white relative z-10">
              <Logo size="large" />
              
              <div className="mt-8">
                {isLogin ? (
                  <div className="space-y-4">
                    <h1 className="text-3xl font-black tracking-tight">The Ascent Awaits.</h1>
                    <p className="text-white/70 text-xs leading-relaxed max-w-[220px] mx-auto italic">
                      "Turn your potential into high-performance reality."
                    </p>
                    <button className="mt-6 w-full py-3 border-2 border-white rounded-2xl font-black text-xs tracking-widest hover:bg-white hover:text-focusPurple transition-all uppercase"
                      onClick={() => setIsLogin(false)}>Join the Tribe</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h1 className="text-3xl font-black tracking-tight">System Ready.</h1>
                    <p className="text-white/70 text-xs leading-relaxed max-w-[220px] mx-auto italic">
                      "Excellence is not an act, but a habit."
                    </p>
                    <button className="mt-6 w-full py-3 border-2 border-white rounded-2xl font-black text-xs tracking-widest hover:bg-white hover:text-focusPurple transition-all uppercase"
                      onClick={() => setIsLogin(true)}>Enter Portal</button>
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