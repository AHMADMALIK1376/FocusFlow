import React, { createContext, useContext, useState } from "react";

// API Service functions directly in UserContext
const API_URL = 'http://localhost:5555/api';

// Helper function to handle responses
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    return data;
};

// Store token in localStorage
export const setToken = (token) => {
    if (token) {
        localStorage.setItem('focus_token', token);
    } else {
        localStorage.removeItem('focus_token');
    }
};

// Get token from localStorage
export const getToken = () => {
    return localStorage.getItem('focus_token');
};

// Auth API functions
export const authAPI = {
    register: async (email, password, fullName) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });
        return handleResponse(response);
    },
    
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return handleResponse(response);
    },
    
    verifyEmail: async (email, code) => {
        const response = await fetch(`${API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        return handleResponse(response);
    },
    
    resendVerification: async (email) => {
        const response = await fetch(`${API_URL}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return handleResponse(response);
    },
    
    logout: () => {
        setToken(null);
    }
};

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

    // Login function - calls real API with verification check
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        setRequiresVerification(false);
        
        try {
            const response = await authAPI.login(email, password);
            
            if (response.success && response.token) {
                setToken(response.token);
                const name = response.user?.fullName || email.split('@')[0];
                setUserName(name);
                setUserEmail(email);
                return { success: true };
            } else {
                // Check if error is due to unverified email
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

    // Register function - sends verification email
    const register = async (email, password, fullName) => {
        setIsLoading(true);
        setError(null);
        setRequiresVerification(false);
        
        try {
            const response = await authAPI.register(email, password, fullName);
            
            if (response.success) {
                // Check if verification is required
                if (response.requiresVerification) {
                    setRequiresVerification(true);
                    return { 
                        success: true, 
                        requiresVerification: true,
                        message: response.message,
                        email: response.email || email
                    };
                }
                
                // If no verification required (legacy or already verified)
                if (response.token) {
                    setToken(response.token);
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

    // Verify email function - AUTOMATICALLY LOGS USER IN
    const verifyEmail = async (email, code) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.verifyEmail(email, code);
            
            if (response.success && response.token) {
                // Store token and user info
                setToken(response.token);
                const name = response.user?.fullName || email.split('@')[0];
                setUserName(name);
                setUserEmail(email);
                
                // Clear verification flag
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

    // Resend verification code
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

    // Logout function
    const logout = () => {
        authAPI.logout();
        setToken(null);
        setUserName(null);
        setUserEmail(null);
        setError(null);
        setRequiresVerification(false);
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return !!getToken() && !!userName;
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