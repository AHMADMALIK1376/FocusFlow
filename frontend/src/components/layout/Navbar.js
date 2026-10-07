import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, Zap, Settings, ShieldCheck, ChevronDown, Camera } from "lucide-react";
import { useUser } from "../auth/UserContext";
import { useApp } from "../context/AppContext";
import { usePreferences } from "../../preferences/usePreferences";
import { LogoutButton } from "../ui/LogoutButton";
import { MascotPicker } from "../ui/MascotPicker";
import { mascotSrc } from "../ui/mascots";

export default function Navbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userName, logout } = useUser();
  const { pendingCount, routineTodayDone, routineTodayTotal } = useApp();
  const { profile, updateProfile } = usePreferences();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const fileRef = useRef(null);
  const avatarUrl = profile?.avatarUrl || null;
  const mascot = mascotSrc(profile?.mascot);
  const [pickerOpen, setPickerOpen] = useState(false);

  function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProfile({ avatarUrl: reader.result, mascot: null });
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
    <nav className="sticky top-3 z-[900] mx-3 mt-3 h-[68px] px-3 sm:px-5 flex items-center justify-between bg-grad-hero text-on-brand rounded-token-lg shadow-clay-brand">
      <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2.5 min-w-0" aria-label="FocusFlow home">
        <img src="/logo/focusflow-mark.png" alt="" className="w-12 h-12 -my-1 object-contain shrink-0" />
        <span className="font-black tracking-tight text-on-brand text-lg truncate hidden sm:block">FocusFlow</span>
      </button>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Pending / routine cells */}
        <div className="hidden md:flex gap-2 items-center">
          <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-grad-sage shadow-neu-sm">
            <Target size={16} className="text-on-sage" />
            <span className="font-mono text-sm font-black text-on-sage leading-none">
              {(pendingCount ?? 0).toString().padStart(2, "0")}
            </span>
            <span className="text-[0.55rem] font-bold text-[rgb(var(--on-sage)/0.75)] tracking-widest uppercase">
              {t("nav.pending")}
            </span>
          </div>
          {/* Today's routine as done/total, the same count the routine donut shows */}
          <button
            onClick={() => navigate("/routine")}
            title="Today's routine: done / total"
            className="flex items-center gap-2 px-3 h-9 rounded-full bg-grad-sage shadow-neu-sm hover:-translate-y-0.5 transition-transform"
          >
            <Zap size={16} className="text-on-sage" />
            <span className="font-mono text-sm font-black text-on-sage leading-none">
              {routineTodayDone ?? 0}/{routineTodayTotal ?? 0}
            </span>
            <span className="text-[0.55rem] font-bold text-[rgb(var(--on-sage)/0.75)] tracking-widest uppercase">
              {t("nav.routine")}
            </span>
          </button>
        </div>

        {/* Profile dropdown (logout lives inside it) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((s) => !s)}
            aria-label="Account menu"
            aria-expanded={showDropdown}
            className="flex items-center gap-1.5 group px-1 py-1 rounded-full hover:bg-[rgb(var(--on-brand)/0.12)] transition-all"
          >
            <span className="w-9 h-9 rounded-xl bg-on-brand text-brand flex items-center justify-center font-black text-[0.8rem] overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt={userName || "User"} className="w-full h-full object-cover" /> : mascot ? <img src={mascot} alt={userName || "User"} className="w-full h-full object-contain" /> : getInitials(userName)}
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
                  {avatarUrl ? <img src={avatarUrl} alt={userName || "User"} className="w-full h-full object-cover" /> : mascot ? <img src={mascot} alt={userName || "User"} className="w-full h-full object-contain" /> : getInitials(userName)}
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
                  <button
                    onClick={() => { setPickerOpen(true); setShowDropdown(false); }}
                    className="text-[0.7rem] font-bold text-brand hover:underline"
                  >
                    Choose mascot
                  </button>
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
                onClick={() => { navigate("/privacy"); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2.5 text-[0.85rem] font-medium text-ink hover:bg-surface-2 transition-colors flex items-center gap-2.5"
              >
                <ShieldCheck size={16} className="text-muted" /> Privacy and cookies
              </button>
              <div className="px-4 py-2.5 flex items-center">
                <LogoutButton onClick={handleLogout} />
              </div>
            </div>
          )}
        </div>
      </div>
      <MascotPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={profile?.mascot}
        onPick={(id) => updateProfile({ mascot: id, avatarUrl: null })}
      />
    </nav>
  );
}
