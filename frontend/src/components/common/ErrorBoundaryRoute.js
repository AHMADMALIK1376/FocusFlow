// src/components/common/ErrorBoundaryRoute.js
// 404: the page for any address the app doesn't know (the catch-all `*`
// route). The dial sits at zero with nothing found. It must not use
// useRouteError(): that only works with a data router, and the app uses
// <BrowserRouter>, so it used to crash every unknown link.
import React from 'react';
import { SearchX, House, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from 'react-router-dom';
import ErrorScreen, { PrimaryAction, SecondaryAction } from '../errors/ErrorScreen';

function ErrorBoundaryRoute() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <ErrorScreen
            code="404"
            dial={0}
            dialCenter={<SearchX size={34} strokeWidth={1.75} className="text-brand" />}
            title="Page not found"
            message={<>There's no page at <span className="font-bold text-ink">{pathname}</span>. It may have moved, or the link is old or mistyped.</>}
            actions={<>
                <PrimaryAction icon={House} onClick={() => navigate('/dashboard')}>Go to Dashboard</PrimaryAction>
                <SecondaryAction icon={ArrowLeft} onClick={() => navigate(-1)}>Go back</SecondaryAction>
            </>}
        />
    );
}

export default ErrorBoundaryRoute;
