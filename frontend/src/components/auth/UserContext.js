// src/components/auth/UserContext.js
import React, { createContext, useContext, useState } from "react";
import { authAPI, setToken as setTokenAPI, getToken as getTokenAPI } from "../../services/api";

// Create Context
export const UserContext = createContext();

// User Provider Component
export const UserProvider = ({ children }) => {
    const [userName, setUserNameState] = useState(
        () => localStorage.getItem("focus_username") || null
    );
    const [userEmail, setUserEmailState] = useState(
        () => localStorage.getItem("focus_email") || null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [requiresVerification, setRequiresVerification] = useState(false);

    const setUserName = (name) => {
        setUserNameState(name);
        if (name) {
            localStorage.setItem("focus_username", name);
        } else {
            localStorage.removeItem("focus_username");
        }
    };

    const setUserEmail = (email) => {
        setUserEmailState(email);
        if (email) {
            localStorage.setItem("focus_email", email);
        } else {
            localStorage.removeItem("focus_email");
        }
    };

    // Login function - uses authAPI from centralized service
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        setRequiresVerification(false);
        
        try {
            const response = await authAPI.login(email, password);
            
            if (response.success && response.token) {
                setTokenAPI(response.token);
                const name = response.user?.fullName || email.split('@')[0];
                setUserName(name);
                setUserEmail(email);
                return { success: true };
            } else {
                if (response.requiresVerification || (response.error && response.error.includes('verify'))) {
                    setRequiresVerification(true);
                    return { 
                        success: false, 
                        requiresVerification: true, 
                        error: response.error || 'Email not verified' 
                    };
                }
                setError(response.error || "Login failed");
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMsg = err.message || "Network error. Please try again.";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    // Register function - uses authAPI from centralized service
    const register = async (email, password, fullName) => {
        setIsLoading(true);
        setError(null);
        setRequiresVerification(false);
        
        try {
            const response = await authAPI.register(email, password, fullName);
            
            if (response.success) {
                if (response.requiresVerification) {
                    setRequiresVerification(true);
                    return { 
                        success: true, 
                        requiresVerification: true,
                        message: response.message,
                        email: response.email || email
                    };
                }
                
                if (response.token) {
                    setTokenAPI(response.token);
                    setUserName(fullName || email.split('@')[0]);
                    setUserEmail(email);
                }
                return { success: true };
            } else {
                setError(response.error || "Registration failed");
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMsg = err.message || "Network error. Please try again.";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    // Verify email function - uses authAPI from centralized service
    const verifyEmail = async (email, code) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.verifyEmail(email, code);
            
            if (response.success && response.token) {
                setTokenAPI(response.token);
                const name = response.user?.fullName || email.split('@')[0];
                setUserName(name);
                setUserEmail(email);
                setRequiresVerification(false);
                
                return { 
                    success: true, 
                    token: response.token,
                    user: response.user 
                };
            } else {
                setError(response.error || "Verification failed");
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMsg = err.message || "Network error. Please try again.";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    // Resend verification code - uses authAPI from centralized service
    const resendVerificationCode = async (email) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.resendVerification(email);
            
            if (response.success) {
                return { success: true, message: response.message };
            } else {
                setError(response.error || "Failed to resend code");
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMsg = err.message || "Network error. Please try again.";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    // Forgot password - uses authAPI from centralized service
    const forgotPassword = async (email) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.forgotPassword(email);
            
            if (response.success) {
                return { success: true, message: response.message };
            } else {
                setError(response.error || "Failed to send reset code");
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMsg = err.message || "Network error. Please try again.";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    // Verify reset code - uses authAPI from centralized service
    const verifyResetCode = async (email, code) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.verifyResetCode(email, code);
            
            if (response.success) {
                return { success: true, message: response.message };
            } else {
                setError(response.error || "Invalid code");
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMsg = err.message || "Network error. Please try again.";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    // Reset password - uses authAPI from centralized service
    const resetPassword = async (email, code, newPassword) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.resetPassword(email, code, newPassword);
            
            if (response.success) {
                return { success: true, message: response.message };
            } else {
                setError(response.error || "Failed to reset password");
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMsg = err.message || "Network error. Please try again.";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        authAPI.logout();
        setTokenAPI(null);
        setUserName(null);
        setUserEmail(null);
        setError(null);
        setRequiresVerification(false);
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return !!getTokenAPI() && !!userName;
    };

    // Clear error
    const clearError = () => {
        setError(null);
    };

    return (
        <UserContext.Provider
            value={{
                userName,
                userEmail,
                isLoading,
                error,
                requiresVerification,
                login,
                register,
                verifyEmail,
                resendVerificationCode,
                forgotPassword,
                verifyResetCode,
                resetPassword,
                logout,
                setUserName,
                isAuthenticated,
                clearError
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

// Custom hook to use UserContext
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};