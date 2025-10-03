/**
 * Firebase App Initialization
 * 
 * This module provides a centralized Firebase app initialization
 * that can be imported and used across the application.
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, Functions, connectFunctionsEmulator } from "firebase/functions";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseFunctions: Functions | null = null;
let emulatorsConnected = false;

/**
 * Initialize Firebase App
 * This should be called once at app startup
 */
export function initializeFirebase(): { app: FirebaseApp; auth: Auth; functions: Functions } {
  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      firebaseAuth = getAuth(firebaseApp);
      firebaseFunctions = getFunctions(firebaseApp);
      
      // Connect to emulators if in development and not already connected
      if (!emulatorsConnected && (import.meta.env.DEV || window.location.hostname === "localhost")) {
        try {
          connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", { disableWarnings: true });
          connectFunctionsEmulator(firebaseFunctions, "127.0.0.1", 5001);
          emulatorsConnected = true;
          console.log("🔧 Connected to Firebase Emulators");
        } catch (emulatorError) {
          console.warn("Emulator connection skipped (may already be connected):", emulatorError);
        }
      }
      
      console.log("Firebase already initialized");
      return { app: firebaseApp, auth: firebaseAuth, functions: firebaseFunctions };
    }

    // Firebase configuration from environment variables
    const firebaseConfig: FirebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    // Validate required config
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Firebase config missing required fields");
      throw new Error("Firebase configuration is incomplete");
    }

    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseFunctions = getFunctions(firebaseApp);

    // Connect to emulators in development
    if (import.meta.env.DEV || window.location.hostname === "localhost") {
      try {
        connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", { disableWarnings: true });
        connectFunctionsEmulator(firebaseFunctions, "127.0.0.1", 5001);
        emulatorsConnected = true;
        console.log("🔧 Connected to Firebase Emulators");
      } catch (emulatorError) {
        console.warn("Could not connect to emulators:", emulatorError);
      }
    }

    // Set language code for auth (optional)
    firebaseAuth.languageCode = "en";

    console.log("✅ Firebase initialized successfully");
    return { app: firebaseApp, auth: firebaseAuth, functions: firebaseFunctions };
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
    throw error;
  }
}

/**
 * Get the Firebase app instance
 * Initializes if not already initialized
 */
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    const { app } = initializeFirebase();
    return app;
  }
  return firebaseApp;
}

/**
 * Get the Firebase Auth instance
 * Initializes Firebase if not already initialized
 */
export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    const { auth } = initializeFirebase();
    return auth;
  }
  return firebaseAuth;
}

/**
 * Get the Firebase Functions instance
 * Initializes Firebase if not already initialized
 */
export function getFirebaseFunctions(): Functions {
  if (!firebaseFunctions) {
    const { functions } = initializeFirebase();
    return functions;
  }
  return firebaseFunctions;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return getApps().length > 0;
}
