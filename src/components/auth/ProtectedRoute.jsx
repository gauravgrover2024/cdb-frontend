import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '../../hooks/useRBAC';

const ProtectedRoute = ({ 
  element, 
  requiredRoles = [],
  fallback = null 
}) => {
  const { canAccess } = useRBAC();

  if (requiredRoles.length === 0) {
    return element;
  }

  const hasAccess = canAccess(requiredRoles);

  if (!hasAccess) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">🔒</div>
            <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
            <p className="text-slate-600">
              You don't have permission to access this page. 
              Please contact your administrator.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-block mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-smooth"
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
