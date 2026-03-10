import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

export default function ProtectedRoute({ children }) {
  const { userName } = useUser();

  if (!userName) {
    return <Navigate to="/login" replace />;
  }

  return children;
}