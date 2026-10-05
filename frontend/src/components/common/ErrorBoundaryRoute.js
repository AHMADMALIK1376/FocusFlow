// src/components/common/ErrorBoundaryRoute.js
import React from 'react';
import { SearchX, TriangleAlert, House, RotateCw } from "lucide-react";
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
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
            <div className="bg-surface rounded-token-lg p-8 max-w-md text-center shadow-neu border border-[rgb(var(--ink)/0.08)]">
                <span className="mx-auto mb-4 w-20 h-20 rounded-[28px] bg-grad-hero shadow-clay-brand flex items-center justify-center text-on-brand">
                    {errorStatus === 404 ? <SearchX size={38} strokeWidth={1.75} /> : <TriangleAlert size={38} strokeWidth={1.75} />}
                </span>
                <h1 className="text-2xl font-black text-ink mb-2">
                    {errorStatus === 404 ? 'Page Not Found' : 'Application Error'}
                </h1>
                <p className="text-muted mb-6 text-sm">
                    {errorMessage}
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => { window.location.href = '/dashboard'; }}
                        className="px-6 py-3 bg-brand text-on-brand rounded-token-sm font-bold text-sm hover:bg-brand-deep transition-all"
                    >
                        <House size={15} className="inline -mt-0.5 mr-1.5" />Go to Dashboard
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-surface-2 text-ink rounded-token-sm font-bold text-sm hover:bg-[rgb(var(--ink)/0.08)] transition-all"
                    >
                        <RotateCw size={15} className="inline -mt-0.5 mr-1.5" />Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ErrorBoundaryRoute;
