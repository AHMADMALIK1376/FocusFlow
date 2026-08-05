// src/components/common/ErrorBoundary.js
// Catches a crash anywhere below it and shows the 500 page (errors/CrashScreen).
import React from 'react';
import CrashScreen from '../errors/CrashScreen';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <CrashScreen
                    error={this.state.error}
                    componentStack={this.state.errorInfo?.componentStack}
                    onReload={this.handleReset}
                    onHome={this.handleGoHome}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
