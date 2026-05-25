// src/App.js
import React, { useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import Layout from "./components/layout/Layout";

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

    // Show splash screen on initial load
    if (showSplash) {
        return <Splash onComplete={handleSplashComplete} />;
    }

    return (
        <ErrorBoundary>
            <UserProvider>
                <AppProvider>
                    <BrowserRouter>
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
                                {/* PROTECTED ROUTES (Require authentication + Layout) */}
                                {/* ============================================== */}
                                <Route
                                    element={
                                        <ProtectedRoute>
                                            <Layout />
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
                                </Route>

                                {/* ============================================== */}
                                {/* 404 - NOT FOUND ROUTE with Error Boundary */}
                                {/* ============================================== */}
                                <Route path="*" element={<ErrorBoundaryRoute />} />
                            </Routes>
                        </Suspense>
                    </BrowserRouter>
                </AppProvider>
            </UserProvider>
        </ErrorBoundary>
    );
}

export default App;