/**
 * Firebase App Initialization
 *
 * This module provides a centralized Firebase app initialization
 * that can be imported and used across the application.
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import {
  getFunctions,
  Functions,
  connectFunctionsEmulator,
} from "firebase/functions";
import {
  getStorage,
  FirebaseStorage as FBStorage,
  connectStorageEmulator,
} from "firebase/storage";
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

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
let firebaseStorage: FBStorage | null = null;
let firebaseFirestore: Firestore | null = null;
let emulatorsConnected = false;

// Store the IC custom token for restoration after phone verification
// We use localStorage to persist across page reloads
const IC_TOKEN_KEY = "ic_custom_token";
const IC_TOKEN_TIMESTAMP_KEY = "ic_custom_token_timestamp";
const TOKEN_VALIDITY_DURATION = 55 * 60 * 1000; // 55 minutes (tokens expire after 1 hour)

/**
 * Initialize Firebase App
 * This should be called once at app startup
 */
export function initializeFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  functions: Functions;
  storage: FBStorage;
  firestore: Firestore;
} {
  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      firebaseAuth = getAuth(firebaseApp);
      firebaseFunctions = getFunctions(firebaseApp);
      firebaseStorage = getStorage(firebaseApp);
      firebaseFirestore = getFirestore(firebaseApp);

      // Connect to emulators if in development and not already connected
      if (
        !emulatorsConnected &&
        (import.meta.env.DEV || window.location.hostname === "localhost")
      ) {
        try {
          connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", {
            disableWarnings: true,
          });
          connectFunctionsEmulator(firebaseFunctions, "127.0.0.1", 5001);
          connectStorageEmulator(firebaseStorage, "127.0.0.1", 9199);
          connectFirestoreEmulator(firebaseFirestore, "127.0.0.1", 8080);
          emulatorsConnected = true;
          console.log(
            "🔧 Connected to Firebase Emulators (Auth, Functions, Storage, Firestore)",
          );
        } catch (emulatorError) {
          console.warn(
            "Emulator connection skipped (may already be connected):",
            emulatorError,
          );
        }
      }

      console.log("Firebase already initialized");
      return {
        app: firebaseApp,
        auth: firebaseAuth,
        functions: firebaseFunctions,
        storage: firebaseStorage,
        firestore: firebaseFirestore,
      };
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
    firebaseStorage = getStorage(firebaseApp);
    firebaseFirestore = getFirestore(firebaseApp);

    // Connect to emulators in development
    if (import.meta.env.DEV || window.location.hostname === "localhost") {
      try {
        connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", {
          disableWarnings: true,
        });
        connectFunctionsEmulator(firebaseFunctions, "127.0.0.1", 5001);
        connectStorageEmulator(firebaseStorage, "127.0.0.1", 9199);
        connectFirestoreEmulator(firebaseFirestore, "127.0.0.1", 8080);
        emulatorsConnected = true;
        console.log(
          "🔧 Connected to Firebase Emulators (Auth, Functions, Storage, Firestore)",
        );
      } catch (emulatorError) {
        console.warn("Could not connect to emulators:", emulatorError);
      }
    }

    // Set language code for auth (optional)
    firebaseAuth.languageCode = "en";

    console.log("✅ Firebase initialized successfully");
    return {
      app: firebaseApp,
      auth: firebaseAuth,
      functions: firebaseFunctions,
      storage: firebaseStorage,
      firestore: firebaseFirestore,
    };
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
 * Get the Firebase Storage instance
 * Initializes Firebase if not already initialized
 */
export function getFirebaseStorage(): FBStorage {
  if (!firebaseStorage) {
    const { storage } = initializeFirebase();
    return storage;
  }
  return firebaseStorage;
}

/**
 * Get the Firebase Firestore instance
 * Initializes Firebase if not already initialized
 */
export function getFirebaseFirestore(): Firestore {
  if (!firebaseFirestore) {
    const { firestore } = initializeFirebase();
    return firestore;
  }
  return firebaseFirestore;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return getApps().length > 0;
}

/**
 * Store the IC custom token for later restoration
 * This is used to restore the IC-based Firebase session after phone verification
 * Stores in localStorage with timestamp to check validity
 * @param token - The Firebase custom token from IC authentication
 */
export function storeICCustomToken(token: string): void {
  try {
    localStorage.setItem(IC_TOKEN_KEY, token);
    localStorage.setItem(IC_TOKEN_TIMESTAMP_KEY, Date.now().toString());
    console.log(
      "🔐 Stored IC custom token in localStorage for session restoration",
    );
  } catch (error) {
    console.error("Failed to store IC custom token:", error);
  }
}

/**
 * Get the stored IC custom token if it's still valid
 * @returns The stored IC custom token or null if expired/missing
 */
export function getStoredICCustomToken(): string | null {
  try {
    const token = localStorage.getItem(IC_TOKEN_KEY);
    const timestampStr = localStorage.getItem(IC_TOKEN_TIMESTAMP_KEY);

    if (!token || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    const age = now - timestamp;

    // Check if token is still valid (less than 55 minutes old)
    if (age > TOKEN_VALIDITY_DURATION) {
      console.log("⏰ IC custom token expired, clearing...");
      clearICCustomToken();
      return null;
    }

    console.log(
      `✅ IC custom token is valid (age: ${Math.floor(age / 60000)} minutes)`,
    );
    return token;
  } catch (error) {
    console.error("Failed to retrieve IC custom token:", error);
    return null;
  }
}

/**
 * Clear the stored IC custom token
 */
export function clearICCustomToken(): void {
  try {
    localStorage.removeItem(IC_TOKEN_KEY);
    localStorage.removeItem(IC_TOKEN_TIMESTAMP_KEY);
    console.log("🗑️ Cleared stored IC custom token from localStorage");
  } catch (error) {
    console.error("Failed to clear IC custom token:", error);
  }
}
