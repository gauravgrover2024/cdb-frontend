import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spin } from "antd";

const ProtectedRoute = ({ element, requiredRoles = [], fallback = null }) => {
  const { user, loading } = useAuth();

  // Wait for the initial /me fetch before making any access decision
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No role restriction — any authenticated user may access
  if (requiredRoles.length === 0) {
    return element;
  }

  const hasAccess = requiredRoles.includes(user.role);

  if (!hasAccess) {
    return (
      fallback || (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="space-y-4 text-center max-w-md">
            <div className="text-6xl">🔒</div>
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
              Please contact your administrator.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    );
  }

  return element;
};

export default ProtectedRoute;
