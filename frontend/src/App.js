import React, { useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ✅ Always loaded immediately — needed on first paint
import Splash from "./components/Splash";
import { UserProvider } from "./components/UserContext";
import { AppProvider } from "./components/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// ✅ Auth pages load immediately — users see these first
import AuthPage    from "./Pages/Authpage";
import LoginForm   from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import VerifyForm  from "./components/VerifyForm";

// ✅ Protected pages lazy loaded — only downloaded after login
// This keeps the initial bundle small without hurting FCP
const Home                     = lazy(() => import("./Pages/Home"));
const TaskManager              = lazy(() => import("./components/TaskManager"));
const TimelinePage             = lazy(() => import("./Pages/TimelinePage"));
const TimetablePage            = lazy(() => import("./Pages/DailyRoutine"));
const FocusModePage            = lazy(() => import("./Pages/FocusModePage"));
const AcademicCalendarPage     = lazy(() => import("./Pages/AcademicCalendarPage"));
const AcademicCalendarViewPage = lazy(() => import("./Pages/AcademicCalendarViewPage"));

// ✅ Spinner shown while a lazy page is downloading
function PageLoader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#f0f2f5",
    }}>
      <div style={{
        width: "40px",
        height: "40px",
        border: "4px solid #e0e0e0",
        borderTop: "4px solid #7C3AED",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <Splash onComplete={() => setLoading(false)} />;
  }

  return (
    <UserProvider>
      <AppProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>

              {/* Auth Routes — NOT lazy, loaded immediately for fast FCP */}
              <Route element={<AuthPage />}>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/signup" element={<RegisterForm />} />
                <Route path="/verify" element={<VerifyForm />} />
              </Route>

              {/* Protected App Routes — lazy loaded after login */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard"     element={<Home />} />
                <Route path="/focus-mode"    element={<FocusModePage />} />
                <Route path="/tasks"         element={<TaskManager />} />
                <Route path="/timeline"      element={<TimelinePage />} />
                <Route path="/routine"       element={<TimetablePage />} />
                <Route path="/academic"      element={<AcademicCalendarPage />} />
                <Route path="/academic/view" element={<AcademicCalendarViewPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </UserProvider>
  );
}

export default App;