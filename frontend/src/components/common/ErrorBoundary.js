// src/components/common/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null,
            showDetails: false
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console
        console.error('❌ ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);
        
        this.setState({ errorInfo });
        
        // Optionally send to logging service in production
        if (process.env.NODE_ENV === 'production') {
            this.logErrorToService(error, errorInfo);
        }
    }

    logErrorToService = async (error, errorInfo) => {
        try {
            // Send to your error tracking service (Sentry, LogRocket, etc.)
            // Example: fetch('/api/log-error', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         error: error.message,
            //         stack: error.stack,
            //         componentStack: errorInfo.componentStack,
            //         url: window.location.href,
            //         userAgent: navigator.userAgent,
            //         timestamp: new Date().toISOString()
            //     })
            // });
        } catch (e) {
            console.error('Failed to log error to service:', e);
        }
    };

    handleReset = () => {
        // Clear error state and reload the page
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/dashboard';
    };

    toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl border border-gray-100">
                        {/* Error Icon */}
                        <div className="text-7xl mb-4 animate-bounce">😵</div>
                        
                        {/* Error Title */}
                        <h1 className="text-2xl font-black text-gray-800 mb-2">
                            Something went wrong
                        </h1>
                        
                        {/* Error Message */}
                        <p className="text-gray-500 mb-6 text-sm">
                            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-center mb-4">
                            <button
                                onClick={this.handleReset}
                                className="magic-btn px-6 py-3 text-sm"
                            >
                                🔄 Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all"
                            >
                                🏠 Go Home
                            </button>
                        </div>
                        
                        {/* Technical Details (Development Only) */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-4">
                                <button
                                    onClick={this.toggleDetails}
                                    className="text-xs text-gray-400 hover:text-focusPurple transition-colors"
                                >
                                    {this.state.showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
                                </button>
                                
                                {this.state.showDetails && (
                                    <div className="mt-3 text-left">
                                        <div className="bg-gray-100 rounded-xl p-4 overflow-auto max-h-64">
                                            <p className="text-xs font-bold text-red-600 mb-2">
                                                Error: {this.state.error?.message}
                                            </p>
                                            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                                {this.state.error?.stack}
                                            </pre>
                                            {this.state.errorInfo && (
                                                <>
                                                    <p className="text-xs font-bold text-red-600 mt-3 mb-2">
                                                        Component Stack:
                                                    </p>
                                                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                                        {this.state.errorInfo.componentStack}
                                                    </pre>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Support Message */}
                        <p className="text-[10px] text-gray-400 mt-6">
                            If the problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;