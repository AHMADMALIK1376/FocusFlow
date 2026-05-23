import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";  // Link should be here

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");

  useEffect(() => {
    const verifiedEmail = sessionStorage.getItem('verifiedResetEmail');
    const code = sessionStorage.getItem('resetCode');
    
    if (verifiedEmail && code) {
      setEmail(verifiedEmail);
      setResetCode(code);
    } else {
      navigate('/forgot-password');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch('http://localhost:5555/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          code: resetCode, 
          newPassword 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(data.message);
        sessionStorage.removeItem('verifiedResetEmail');
        sessionStorage.removeItem('resetCode');
        sessionStorage.removeItem('resetEmail');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white flex flex-col items-center p-0">
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4">
        <h2 className="text-2xl font-black text-gray-800 mb-1">Create New Password</h2>
        <p className="text-gray-400 text-xs font-bold mb-6 uppercase tracking-widest text-center">
          Enter your new password
        </p>
        
        {error && (
          <div className="w-[80%] mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="w-[80%] mb-4 p-3 bg-green-100 border border-green-300 text-green-600 rounded-xl text-sm font-bold text-center">
            {success}
          </div>
        )}
        
        <div className="w-full space-y-3 flex flex-col items-center">
          <input 
            type="password" 
            placeholder="New Password (min 6 characters)" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
          <input 
            type="password" 
            placeholder="Confirm New Password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-[80%] p-4 bg-[#f0f2f5] rounded-2xl shadow-neu-pressed outline-none text-sm" 
            required 
          />
        </div>

        <button 
          type="submit" 
          className="magic-btn mt-8 w-[80%] tracking-widest text-xs"
          disabled={loading}
        >
          {loading ? "RESETTING..." : "RESET PASSWORD"}
        </button>
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-[#6c5ce7] font-bold text-sm hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}