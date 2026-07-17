import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, Zap, Settings, ChevronDown, LogOut, Camera } from "lucide-react";
import { useUser } from "../auth/UserContext";
import { useApp } from "../context/AppContext";
import { usePreferences } from "../../preferences/usePreferences";
import { LogoutButton } from "../ui/LogoutButton";

export default function Navbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userName, logout } = useUser();
  const { pendingCount, pendingRoutine } = useApp();
  const { profile, updateProfile } = usePreferences();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const fileRef = useRef(null);
  const avatarUrl = profile?.avatarUrl || null;

  function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProfile({ avatarUrl: reader.result });
    reader.readAsDataURL(file);
  }

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
      logout();
      navigate("/login");
      setShowDropdown(false);
    }
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "??";

  return (
    <nav className="sticky top-3 z-[900] mx-3 mt-3 h-[68px] px-3 sm:px-5 flex items-center justify-between bg-grad-hero text-on-brand rounded-token-lg shadow-[0_8px_24px_rgb(45_71_89/0.22)]">
      <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2.5 min-w-0" aria-label="FocusFlow home">
        <span className="w-9 h-9 rounded-xl bg-on-brand text-brand flex items-center justify-center font-black text-sm shrink-0">F</span>
        <span className="font-black tracking-tight text-on-brand text-lg truncate hidden sm:block">FocusFlow</span>
      </button>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Pending / routine cells */}
        <div className="hidden md:flex gap-2 items-center">
          <div className="flex items-center gap-2 px-3 h-9 rounded-token-sm bg-[rgb(var(--on-brand)/0.12)]">
            <Target size={16} className="text-on-brand" />
            <span className="font-mono text-sm font-black text-on-brand leading-none">
              {(pendingCount ?? 0).toString().padStart(2, "0")}
            </span>
            <span className="text-[0.55rem] font-bold text-[rgb(var(--on-brand)/0.65)] tracking-widest uppercase">
              {t("nav.pending")}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 h-9 rounded-token-sm bg-[rgb(var(--on-brand)/0.12)]">
            <Zap size={16} className="text-on-brand" />
            <span className="font-mono text-sm font-black text-on-brand leading-none">
              {(pendingRoutine ?? 0).toString().padStart(2, "0")}
            </span>
            <span className="text-[0.55rem] font-bold text-[rgb(var(--on-brand)/0.65)] tracking-widest uppercase">
              {t("nav.routine")}
            </span>
          </div>
        </div>

        <LogoutButton onClick={handleLogout} />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((s) => !s)}
            aria-label="Account menu"
            aria-expanded={showDropdown}
            className="flex items-center gap-1.5 group px-1 py-1 rounded-full hover:bg-[rgb(var(--on-brand)/0.12)] transition-all"
          >
            <span className="w-9 h-9 rounded-xl bg-on-brand text-brand flex items-center justify-center font-black text-[0.8rem] overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt={userName || "User"} className="w-full h-full object-cover" /> : getInitials(userName)}
            </span>
            <ChevronDown size={15} className={`text-[rgb(var(--on-brand)/0.75)] transition-transform duration-300 ${showDropdown ? "rotate-180" : ""}`} />
          </button>

          {showDropdown && (
            <div className="absolute top-[52px] right-0 w-60 bg-surface border border-[rgb(var(--ink)/0.08)] rounded-token-md shadow-glass py-2 z-[2000]">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  title="Change profile photo"
                  className="group/avatar relative w-9 h-9 rounded-xl bg-grad-hero flex items-center justify-center text-[0.8rem] text-on-brand font-black shrink-0 overflow-hidden"
                >
                  {avatarUrl ? <img src={avatarUrl} alt={userName || "User"} className="w-full h-full object-cover" /> : getInitials(userName)}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Camera size={14} className="text-white" />
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-surface flex items-center justify-center">
                    <span className="relative flex w-2 h-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full w-2 h-2 bg-success" />
                    </span>
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                <div className="min-w-0">
                  <p className="text-[0.85rem] font-bold text-ink leading-tight truncate">{userName || "User"}</p>
                </div>
              </div>
              <div className="h-px bg-[rgb(var(--ink)/0.08)] my-1 mx-2" />
              <button
                onClick={() => { navigate("/settings"); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2.5 text-[0.85rem] font-medium text-ink hover:bg-surface-2 transition-colors flex items-center gap-2.5"
              >
                <Settings size={16} className="text-muted" /> {t("nav.settings")}
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-[0.85rem] font-medium text-red-500 hover:bg-surface-2 transition-colors flex items-center gap-2.5"
              >
                <LogOut size={16} /> {t("nav.logout", { defaultValue: "Logout" })}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
