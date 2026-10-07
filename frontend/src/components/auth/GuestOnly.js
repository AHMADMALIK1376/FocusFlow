import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";
import { getToken } from "../../services/api";

// For the pages meant for people who are signed out ("/", sign-in, sign-up).
// A student who is already signed in goes straight to the dashboard, so opening
// the site never asks them to sign in again.
export default function GuestOnly({ children }) {
  const { userName } = useUser();
  if (getToken() && userName) return <Navigate to="/dashboard" replace />;
  return children;
}
