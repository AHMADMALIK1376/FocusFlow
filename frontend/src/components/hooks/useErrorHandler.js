// src/hooks/useErrorHandler.js
import { useState, useCallback } from 'react';

export const useErrorHandler = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleError = useCallback((err) => {
        console.error('Error caught:', err);
        setError(err.message || 'An error occurred');
        setLoading(false);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const withErrorHandling = useCallback(async (asyncFn, options = {}) => {
        const { showLoading = true, onSuccess = null } = options;
        
        setError(null);
        if (showLoading) setLoading(true);
        
        try {
            const result = await asyncFn();
            if (onSuccess) onSuccess(result);
            return result;
        } catch (err) {
            handleError(err);
            throw err;
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [handleError]);

    return {
        error,
        loading,
        handleError,
        clearError,
        withErrorHandling
    };
};