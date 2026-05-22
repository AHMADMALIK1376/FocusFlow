import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}