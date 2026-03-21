import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";

// Hardcoded config for testing
const firebaseConfig = {
  apiKey: "AIzaSyB8JeqkeK9dWgNuSwIDNO37FiExZGpXTWM",
  authDomain: "acillp01.firebaseapp.com",
  projectId: "acillp01",
  storageBucket: "acillp01.firebasestorage.app",
  messagingSenderId: "63976409535",
  appId: "1:63976409535:web:c13b575ec9062232ff790a",
  measurementId: "G-7V49LWJZNV"
};


let app;
let auth;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firebase Auth and set persistence
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
    });

} catch (error) {
  console.error("❌ Firebase initialization error:", error);
  throw error;
}

export { auth, app };
