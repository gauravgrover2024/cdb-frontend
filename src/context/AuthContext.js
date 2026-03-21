import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // true while the initial /me fetch is in flight
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the current user's fresh data from the backend using the stored JWT.
   * Called once on app mount and can be called again to force-refresh.
   */
  const fetchMe = useCallback(async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get("/api/auth/me");
      const freshUser = res?.data;

      if (freshUser) {
        // Keep sessionStorage in sync so legacy reads still work
        sessionStorage.setItem("user", JSON.stringify(freshUser));
        setUser(freshUser);
      } else {
        throw new Error("Empty user payload");
      }
    } catch (err) {
      // Token is expired, invalid, or the account was deactivated/deleted
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on mount
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setUser(null);
  }, []);

  const refreshUser = fetchMe;

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
