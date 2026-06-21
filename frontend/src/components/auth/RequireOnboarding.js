import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePreferences } from '../../preferences/usePreferences';

/**
 * Wraps protected app routes. If onboardingComplete is false, redirect to /onboarding.
 */
export default function RequireOnboarding({ children }) {
  const { onboardingComplete } = usePreferences();
  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}
