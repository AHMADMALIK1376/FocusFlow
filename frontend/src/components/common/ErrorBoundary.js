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
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);
        this.setState({ errorInfo });

        if (process.env.NODE_ENV === 'production') {
            this.logErrorToService(error, errorInfo);
        }
    }

    logErrorToService = async (error, errorInfo) => {
        try {
            // placeholder for error tracking service
            void error;
            void errorInfo;
        } catch (e) {
            console.error('Failed to log error to service:', e);
        }
    };

    handleReset = () => {
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
            return (
                <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
                    <div className="bg-surface rounded-token-lg p-8 max-w-md text-center shadow-neu border border-[rgb(var(--ink)/0.08)]">
                        <div className="text-7xl mb-4 animate-bounce">😵</div>

                        <h1 className="text-2xl font-black text-ink mb-2">
                            Something went wrong
                        </h1>

                        <p className="text-muted mb-6 text-sm">
                            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>

                        <div className="flex gap-3 justify-center mb-4">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 bg-brand text-on-brand rounded-token-sm font-bold text-sm hover:bg-brand-deep transition-all"
                            >
                                🔄 Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-6 py-3 bg-surface-2 text-ink rounded-token-sm font-bold text-sm hover:bg-[rgb(var(--ink)/0.08)] transition-all"
                            >
                                🏠 Go Home
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-4">
                                <button
                                    onClick={this.toggleDetails}
                                    className="text-xs text-muted hover:text-ink transition-colors"
                                >
                                    {this.state.showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
                                </button>

                                {this.state.showDetails && (
                                    <div className="mt-3 text-left">
                                        <div className="bg-surface-2 rounded-token-md p-4 overflow-auto max-h-64 border border-[rgb(var(--ink)/0.08)]">
                                            <p className="text-xs font-bold text-focus mb-2">
                                                Error: {this.state.error?.message}
                                            </p>
                                            <pre className="text-xs text-muted whitespace-pre-wrap">
                                                {this.state.error?.stack}
                                            </pre>
                                            {this.state.errorInfo && (
                                                <>
                                                    <p className="text-xs font-bold text-focus mt-3 mb-2">
                                                        Component Stack:
                                                    </p>
                                                    <pre className="text-xs text-muted whitespace-pre-wrap">
                                                        {this.state.errorInfo.componentStack}
                                                    </pre>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-[10px] text-muted mt-6">
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
