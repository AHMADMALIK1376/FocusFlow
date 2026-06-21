import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import MobileTabBar from "./MobileTabBar";
import Sidebar from "./Sidebar";
import { useGlobalThemeShortcut } from "../../theme/useGlobalThemeShortcut";
import { useApplyDashboardTheme } from "../../preferences/useApplyDashboardTheme";

export default function Layout() {
  useGlobalThemeShortcut();
  useApplyDashboardTheme();

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <main className="flex-1 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
