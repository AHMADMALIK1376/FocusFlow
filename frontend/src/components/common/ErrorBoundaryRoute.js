// src/components/common/ErrorBoundaryRoute.js
// The "page not found" screen for any address the app doesn't know (the
// catch-all `*` route). It must not use useRouteError(): that only works with a
// data router, and the app uses <BrowserRouter>, so it crashed every unknown
// link into the general error screen.
import React from 'react';
import { SearchX, House, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from 'react-router-dom';

function ErrorBoundaryRoute() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
            <div className="bg-surface rounded-token-lg p-8 max-w-md text-center shadow-neu border border-[rgb(var(--ink)/0.08)]">
                <span className="mx-auto mb-4 w-20 h-20 rounded-[28px] bg-grad-hero shadow-clay-brand flex items-center justify-center text-on-brand">
                    <SearchX size={38} strokeWidth={1.75} />
                </span>
                <h1 className="text-2xl font-black text-ink mb-2">Page Not Found</h1>
                <p className="text-muted mb-6 text-sm break-words">
                    There's no page at <span className="font-bold text-ink">{pathname}</span>. The link may be old or mistyped.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-brand text-on-brand rounded-token-sm font-bold text-sm hover:bg-brand-deep transition-all"
                    >
                        <House size={15} className="inline -mt-0.5 mr-1.5" />Go to Dashboard
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-surface-2 text-ink rounded-token-sm font-bold text-sm hover:bg-[rgb(var(--ink)/0.08)] transition-all"
                    >
                        <ArrowLeft size={15} className="inline -mt-0.5 mr-1.5" />Go back
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ErrorBoundaryRoute;
