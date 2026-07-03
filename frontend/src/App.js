// src/App.js
import React, { useState, lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// ==============================================
// ERROR BOUNDARY
// ==============================================
import ErrorBoundary from "./components/common/ErrorBoundary";
import ErrorBoundaryRoute from "./components/common/ErrorBoundaryRoute";

// ==============================================
// LOADING COMPONENT
// ==============================================
import { LoadingSpinner } from "./components/common/LoadingSpinner";

// ==============================================
// ALWAYS LOADED IMMEDIATELY
// ==============================================
import Splash from "./components/layout/Splash";
import { UserProvider } from "./components/auth/UserContext";
import { AppProvider } from "./components/context/AppContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RequireOnboarding from "./components/auth/RequireOnboarding";
import Layout from "./components/layout/Layout";
import { ThemeProvider } from "./theme/ThemeProvider";
import { PreferencesProvider } from "./preferences/PreferencesProvider";
import ThemeApplier from "./preferences/ThemeApplier";
import { ToastProvider } from "./components/ui/Toast";

// ==============================================
// AUTH PAGES (Load immediately)
// ==============================================
import AuthPage from "./Pages/Authpage";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import VerifyForm from "./components/auth/VerifyForm";
import ForgotPasswordForm from "./components/auth/ForgotPasswordForm";
import ResetPasswordVerify from "./components/auth/ResetPasswordVerify";
import ResetPassword from "./components/auth/ResetPassword";

// ==============================================
// PROTECTED PAGES (Lazy loaded - only after login)
// ==============================================
const Home = lazy(() => import("./Pages/Home"));
const TaskManager = lazy(() => import("./components/tasks/TaskManager"));
const TimelinePage = lazy(() => import("./Pages/TimelinePage"));
const TimetablePage = lazy(() => import("./Pages/DailyRoutine"));
const RoutineView = lazy(() => import("./components/routine/RoutineView"));
const FocusModePage = lazy(() => import("./Pages/FocusModePage"));
const AcademicCalendarPage = lazy(() => import("./Pages/AcademicCalendarPage"));
const AcademicCalendarViewPage = lazy(() => import("./Pages/AcademicCalendarViewPage"));
const AttendanceTracker = lazy(() => import("./components/attendance/AttendanceTracker"));
const OnboardingPage = lazy(() => import("./Pages/OnboardingPage"));
const SettingsPage = lazy(() => import("./Pages/SettingsPage"));

// ======================================================
// 10 NEW FEATURE PAGES (Lazy loaded)
// ======================================================
const NotesPage = lazy(() => import("./Pages/NotesPage"));
const GoalsPage = lazy(() => import("./Pages/GoalsPage"));
const HabitsPage = lazy(() => import("./Pages/HabitsPage"));
const KanbanPage = lazy(() => import("./Pages/KanbanPage"));
const TimeTrackPage = lazy(() => import("./Pages/TimeTrackPage"));
const FinancePage = lazy(() => import("./Pages/FinancePage"));
const SubjectsPage = lazy(() => import("./Pages/SubjectsPage"));
const SubjectHubPage = lazy(() => import("./Pages/SubjectHubPage"));
const GradesPage = lazy(() => import("./Pages/GradesPage"));
const ExamsPage = lazy(() => import("./Pages/ExamsPage"));

// ==============================================
// SCROLL TO TOP COMPONENT
// ==============================================
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// ==============================================
// PAGE LOADER using LoadingSpinner component
// ==============================================
function PageLoader() {
  return <LoadingSpinner fullScreen message="Loading page..." />;
}

// ==============================================
// MAIN APP COMPONENT
// ==============================================
function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <ThemeProvider>
      {showSplash ? (
        <Splash onComplete={handleSplashComplete} />
      ) : (
        <PreferencesProvider>
          <ThemeApplier />
          <ErrorBoundary>
            <UserProvider>
              <AppProvider>
                <ToastProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* ============================================== */}
                      {/* AUTH ROUTES (No layout, no authentication needed) */}
                      {/* ============================================== */}
                      <Route element={<AuthPage />}>
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<LoginForm />} />
                        <Route path="/signup" element={<RegisterForm />} />
                        <Route path="/verify" element={<VerifyForm />} />
                        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
                        <Route path="/reset-password-verify" element={<ResetPasswordVerify />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                      </Route>

                      {/* ============================================== */}
                      {/* ONBOARDING — protected but no Layout shell */}
                      {/* ============================================== */}
                      <Route
                        path="/onboarding"
                        element={
                          <ProtectedRoute>
                            <OnboardingPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* ============================================== */}
                      {/* PROTECTED ROUTES (Require authentication + onboarding + Layout) */}
                      {/* ============================================== */}
                      <Route
                        element={
                          <ProtectedRoute>
                            <RequireOnboarding>
                              <Layout />
                            </RequireOnboarding>
                          </ProtectedRoute>
                        }
                      >
                        <Route path="/dashboard" element={<Home />} />
                        <Route path="/focus-mode" element={<FocusModePage />} />
                        <Route path="/tasks" element={<TaskManager />} />
                        <Route path="/timeline" element={<TimelinePage />} />
                        <Route path="/routine" element={<TimetablePage />} />
                        <Route path="/routine/view" element={<RoutineView />} />
                        <Route path="/academic" element={<AcademicCalendarPage />} />
                        <Route path="/academic/view" element={<AcademicCalendarViewPage />} />
                        <Route path="/attendance" element={<AttendanceTracker />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        {/* 10 new feature routes */}
                        <Route path="/notes" element={<NotesPage />} />
                        <Route path="/goals" element={<GoalsPage />} />
                        <Route path="/habits" element={<HabitsPage />} />
                        <Route path="/projects" element={<KanbanPage />} />
                        <Route path="/time" element={<TimeTrackPage />} />
                        <Route path="/budget" element={<FinancePage />} />
                        <Route path="/subjects" element={<SubjectsPage />} />
                        <Route path="/subjects/:id" element={<SubjectHubPage />} />
                        <Route path="/grades" element={<GradesPage />} />
                        <Route path="/exams" element={<ExamsPage />} />
                      </Route>

                      {/* ============================================== */}
                      {/* 404 - NOT FOUND ROUTE with Error Boundary */}
                      {/* ============================================== */}
                      <Route path="*" element={<ErrorBoundaryRoute />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
                </ToastProvider>
              </AppProvider>
            </UserProvider>
          </ErrorBoundary>
        </PreferencesProvider>
      )}
    </ThemeProvider>
  );
}

export default App;
