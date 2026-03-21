import { auth } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { apiClient } from "./client";

const googleProvider = new GoogleAuthProvider();

/**
 * Register user with Firebase and create user in database
 */
export const registerWithEmail = async (name, email, password, role = "staff") => {
  try {
    // Create user in Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get Firebase token
    const token = await firebaseUser.getIdToken();

    // Register user in backend database
    const response = await apiClient.post("/api/auth/register", {
      name,
      email,
      role,
      firebaseIdToken: token,
    });

    if (response?.success) {
      // Store both tokens
      sessionStorage.setItem("firebaseToken", token);
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data));

      return {
        success: true,
        data: response.data,
      };
    }
  } catch (error) {
    console.error("Registration error:", error);
    throw {
      message: error.message || "Registration failed",
      code: error.code,
      isPending: error.message?.includes("Account pending approval"),
      status: error.status,
    };
  }
};

/**
 * Login with email and password
 */
export const loginWithEmail = async (email, password) => {
  try {
    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get Firebase token
    const token = await firebaseUser.getIdToken();

    // Verify with backend
    const response = await apiClient.post("/api/auth/login", {
      email,
      firebaseIdToken: token,
    });

    if (response?.success) {
      // Store both tokens
      sessionStorage.setItem("firebaseToken", token);
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data));

      return {
        success: true,
        data: response.data,
      };
    }
  } catch (error) {
    console.error("Login error:", error);
    throw {
      message: error.message || "Login failed",
      code: error.code,
      isPending: error.message?.includes("Account pending approval"),
      status: error.status,
    };
  }
};

/**
 * Login with Google
 */
export const loginWithGoogle = async () => {
  try {
    googleProvider.setCustomParameters({
      prompt: "select_account",
    });

    // Sign in with Google
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Get Firebase token
    const token = await firebaseUser.getIdToken();

    // Create or verify user in backend
    const response = await apiClient.post("/api/auth/google-login", {
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      firebaseIdToken: token,
    });

    if (response?.success) {
      // Store both tokens
      sessionStorage.setItem("firebaseToken", token);
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data));

      return {
        success: true,
        data: response.data,
      };
    }
  } catch (error) {
    console.error("Google login error:", error);
    throw {
      message: error.message || "Google login failed",
      code: error.code,
      isPending: error.message?.includes("Account pending approval"),
      status: error.status,
    };
  }
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    sessionStorage.clear();
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw {
      message: error.message || "Logout failed",
      code: error.code,
    };
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Get Firebase token
 */
export const getFirebaseToken = async () => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};
