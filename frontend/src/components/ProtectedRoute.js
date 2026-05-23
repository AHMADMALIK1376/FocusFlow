import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";
import { getToken } from "../services/api";

export default function ProtectedRoute({ children }) {
  const { userName } = useUser();
  const token = getToken();

  // Check both token AND userName
  if (!token || !userName) {
    return <Navigate to="/login" replace />;
  }

  return children;
}