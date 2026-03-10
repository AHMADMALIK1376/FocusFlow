import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Splash from "./components/Splash";
import AuthPage from "./Pages/Authpage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import VerifyForm from "./components/VerifyForm";
import Home from "./Pages/Home";
import TaskManager from "./components/TaskManager";
import TimelinePage from "./Pages/TimelinePage";
import TimetablePage from "./Pages/DailyRoutine";
import FocusModePage from "./Pages/FocusModePage";
import AcademicCalendarPage from "./Pages/AcademicCalendarPage";
import AcademicCalendarViewPage from "./Pages/AcademicCalendarViewPage";
import { UserProvider } from "./components/UserContext";
import { AppProvider } from "./components/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";


function App() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <Splash onComplete={() => setLoading(false)} />;
  }

  return (
    <UserProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>

            {/* Auth Routes — AuthPage uses <Outlet /> to render children */}
            <Route element={<AuthPage />}>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<RegisterForm />} />
              <Route path="/verify" element={<VerifyForm />} />
            </Route>

            {/* Protected App Routes — all share Layout (Navbar + Sidebar) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard"      element={<Home />} />
              <Route path="/focus-mode"     element={<FocusModePage />} />
              <Route path="/tasks"          element={<TaskManager />} />
              <Route path="/timeline"       element={<TimelinePage />} />
              <Route path="/routine"        element={<TimetablePage />} />
              <Route path="/academic"       element={<AcademicCalendarPage />} />
              <Route path="/academic/view"  element={<AcademicCalendarViewPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </BrowserRouter>
      </AppProvider>
    </UserProvider>
  );
}

export default App;