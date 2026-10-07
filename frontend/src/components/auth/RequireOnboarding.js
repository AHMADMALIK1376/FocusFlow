import React from 'react';
import { Navigate } from 'react-router-dom';
import { needsOnboarding } from '../../features/onboarding/needsOnboarding';

/**
 * Wraps protected app routes. A brand new account (flagged when its email is
 * verified) is sent to the welcome set-up first; everyone else, on any device,
 * goes straight in.
 */
export default function RequireOnboarding({ children }) {
  if (needsOnboarding()) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}
