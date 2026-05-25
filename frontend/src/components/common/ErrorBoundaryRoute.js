// src/components/common/ErrorBoundaryRoute.js
import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

function ErrorBoundaryRoute() {
    const error = useRouteError();
    let errorMessage = 'Something went wrong';
    let errorStatus = 500;

    if (isRouteErrorResponse(error)) {
        errorStatus = error.status;
        errorMessage = error.statusText || error.data?.message || 'Page not found';
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return (
        <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl border border-gray-100">
                <div className="text-7xl mb-4">
                    {errorStatus === 404 ? '🔍' : '😵'}
                </div>
                <h1 className="text-2xl font-black text-gray-800 mb-2">
                    {errorStatus === 404 ? 'Page Not Found' : 'Application Error'}
                </h1>
                <p className="text-gray-500 mb-6 text-sm">
                    {errorMessage}
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="magic-btn px-6 py-3 text-sm"
                    >
                        🏠 Go to Dashboard
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ErrorBoundaryRoute;