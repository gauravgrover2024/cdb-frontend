import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
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
    // localStorage-first so login survives new tabs
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Migrate session tokens to localStorage if needed
      if (!localStorage.getItem("token")) localStorage.setItem("token", token);

      // Create controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const res = await apiClient.get("/api/auth/me", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const freshUser = res?.data;

      if (freshUser) {
        // Persist user to both storages
        localStorage.setItem("user", JSON.stringify(freshUser));
        sessionStorage.setItem("user", JSON.stringify(freshUser));
        setUser(freshUser);
      } else {
        throw new Error("Empty user payload");
      }
    } catch (err) {
      // Token is expired, invalid, or the account was deactivated/deleted
      // Or request timed out - that's okay, we'll let the user proceed
      console.warn("Auth/me fetch error:", err.message);

      // Only clear tokens if it's a 401/403 error, not timeout
      if (err.status === 401 || err.status === 403) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }
      // For timeouts or other errors, keep the existing token/user for now
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
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
