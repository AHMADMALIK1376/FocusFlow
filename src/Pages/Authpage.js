import React, { useState, useContext } from "react";
import { UserContext } from "../components/UserContext";
import Logo from "../components/Logo";

export default function AuthPage({ setView }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
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
      setIsVerifying(true);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#f0f2f5] font-sans overflow-hidden">
      {/* Sliding Box Container */}
      <div className="relative bg-white rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] w-[900px] max-w-[95%] min-h-[550px] overflow-hidden">
        
        {/* Centralized Header */}
        <div className="absolute top-[30px] w-full flex justify-center items-center gap-5 z-[1000] text-[2rem] font-black uppercase tracking-[3px] pointer-events-none">
          <span className={`transition-colors duration-500 ${isLogin ? 'text-focusPurple' : 'text-[#FFF8F8]'}`}>FOCUS</span>
          <span className={`transition-colors duration-500 ${isLogin ? 'text-[#FFF8F8]' : 'text-focusPurple'}`}>FLOW</span>
        </div>

        {/* Forms Container */}
        <div className={`absolute top-0 h-full w-full md:w-1/2 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-5 
          ${isLogin ? 'left-0' : 'translate-x-full'}`}>
          
          {/* Sign In Form */}
          <div className={`absolute inset-0 bg-white flex items-center justify-center transition-opacity duration-400 p-12 pt-24
            ${isLogin ? 'opacity-100 visible z-[2]' : 'opacity-0 invisible z-[1]'}`}>
            <form onSubmit={handleAuth} className="w-full text-center">
              <h2 className="text-3xl font-black text-gray-800">Resume Your Momentum</h2>
              <p className="text-gray-400 font-bold mb-6">Reconnect with your goals</p>
              
              <div className="space-y-3">
                <input type="email" name="email" placeholder="Your Growth Email" required onChange={handleChange}
                  className="w-4/5 p-4 bg-[#f0f2f5] rounded-2xl shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none" />
                <input type="password" name="password" placeholder="Secure Key" required onChange={handleChange}
                  className="w-4/5 p-4 bg-[#f0f2f5] rounded-2xl shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none" />
              </div>

              <div className="flex justify-between w-4/5 mx-auto mt-4 text-xs font-bold text-gray-400">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" /> Stay Synced</label>
                <span className="hover:text-focusPurple cursor-pointer transition-colors">Recover Key?</span>
              </div>

              <button type="submit" className="mt-6 px-10 py-3.5 bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] rounded-2xl text-focusPurple font-black hover:-translate-y-1 transition-all active:scale-95">
                UNLEASH FOCUS
              </button>

              <div className="relative my-6 text-center before:content-[''] before:absolute before:top-1/2 before:left-0 before:w-full before:h-[1px] before:bg-gray-100">
                <span className="relative bg-white px-4 text-[10px] font-black text-gray-300">OR</span>
              </div>

              <button type="button" className="w-4/5 mx-auto py-3 bg-white border border-gray-100 rounded-xl flex items-center justify-center gap-2 font-bold text-gray-500 hover:bg-gray-50 transition-all">
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5" alt="G" />
                Sync with Google
              </button>
            </form>
          </div>

          {/* Sign Up Form */}
          <div className={`absolute inset-0 bg-white flex items-center justify-center transition-opacity duration-400 p-12 pt-24
            ${!isLogin ? 'opacity-100 visible z-[5]' : 'opacity-0 invisible z-[1]'}`}>
            <form onSubmit={handleAuth} className="w-full text-center">
              <h2 className="text-3xl font-black text-gray-800">Architect Your Future</h2>
              <p className="text-gray-400 font-bold mb-6">Design your productivity empire</p>
              
              <div className="space-y-3">
                <input type="text" name="name" placeholder="Preferred Identity" required onChange={handleChange}
                  className="w-4/5 p-4 bg-[#f0f2f5] rounded-2xl shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none" />
                <input type="email" name="email" placeholder="Best Contact Email" required onChange={handleChange}
                  className="w-4/5 p-4 bg-[#f0f2f5] rounded-2xl shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none" />
                <input type="password" name="password" placeholder="Create Strong Access" required onChange={handleChange}
                  className="w-4/5 p-4 bg-[#f0f2f5] rounded-2xl shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none" />
              </div>

              <button type="submit" className="mt-8 px-10 py-3.5 bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] rounded-2xl text-focusPurple font-black hover:-translate-y-1 transition-all">
                CLAIM YOUR REIGN
              </button>

              <div className="relative my-6 text-center before:content-[''] before:absolute before:top-1/2 before:left-0 before:w-full before:h-[1px] before:bg-gray-100">
                <span className="relative bg-white px-4 text-[10px] font-black text-gray-300">OR</span>
              </div>

              <button type="button" className="w-4/5 mx-auto py-3 bg-white border border-gray-100 rounded-xl flex items-center justify-center gap-2 font-bold text-gray-500">
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5" alt="G" />
                Forge with Google
              </button>
            </form>
          </div>
        </div>

        {/* Overlay Panel (Purple Side) */}
        <div className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full z-[100] transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${!isLogin ? '-translate-x-full' : ''}`}>
          
          <div className={`bg-gradient-to-br from-[#8d81e8] to-[#886ad0] text-white h-full w-full flex items-center justify-center transition-all duration-700
            ${isLogin ? '[clip-path:circle(150%_at_0%_50%)]' : '[clip-path:circle(150%_at_100%_50%)]'}`}>
            
            {/* Overlay Contents */}
            <div className="flex flex-col items-center p-10 pt-24 text-center">
              <Logo size="large" />
              
              {/* Conditional Content with Simple Fade */}
              <div className="mt-4 transition-all duration-500">
                {isLogin ? (
                  <div className="animate-in fade-in duration-500">
                    <h1 className="text-3xl font-black mb-2">Start the Ascent</h1>
                    <p className="italic opacity-80 text-sm">Turn your potential into high-performance reality.</p>
                    <button className="mt-8 px-10 py-2.5 border-2 border-white rounded-2xl font-bold hover:bg-white hover:text-focusPurple transition-all"
                      onClick={() => setIsLogin(false)}>Join the Tribe</button>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500">
                    <h1 className="text-3xl font-black mb-2">Return to Flow</h1>
                    <p className="italic opacity-80 text-sm">"Excellence is not an act, but a habit."</p>
                    <button className="mt-8 px-10 py-2.5 border-2 border-white rounded-2xl font-bold hover:bg-white hover:text-focusPurple transition-all"
                      onClick={() => {setIsLogin(true); setIsVerifying(false);}}>Enter Portal</button>
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