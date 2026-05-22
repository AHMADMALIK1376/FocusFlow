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

    // Login function - calls real API
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.login(email, password);
            
            if (response.success && response.token) {
                setToken(response.token);
                const name = response.user?.fullName || email.split('@')[0];
                setUserName(name);
                setUserEmail(email);
                return { success: true };
            } else {
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

    // Register function - calls real API
    const register = async (email, password, fullName) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authAPI.register(email, password, fullName);
            
            if (response.success && response.token) {
                setToken(response.token);
                setUserName(fullName || email.split('@')[0]);
                setUserEmail(email);
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

    // Logout function
    const logout = () => {
        authAPI.logout();
        setToken(null);
        setUserName(null);
        setUserEmail(null);
        setError(null);
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
                login,
                register,
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