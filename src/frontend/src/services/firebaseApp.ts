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
import {
  getDatabase,
  Database,
  connectDatabaseEmulator,
} from "firebase/database";

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
let firebaseDatabase: Database | null = null;
let emulatorsConnected = false;

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
  database: Database;
} {
  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      firebaseAuth = getAuth(firebaseApp);
      firebaseFunctions = getFunctions(firebaseApp);
      firebaseStorage = getStorage(firebaseApp);
      firebaseFirestore = getFirestore(firebaseApp);
      firebaseDatabase = getDatabase(
        firebaseApp,
        import.meta.env.VITE_FIREBASE_DATABASE_URL,
      );

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
          connectDatabaseEmulator(firebaseDatabase, "127.0.0.1", 9000);
          emulatorsConnected = true;
        } catch (emulatorError) {}
      }
      return {
        app: firebaseApp,
        auth: firebaseAuth,
        functions: firebaseFunctions,
        storage: firebaseStorage,
        firestore: firebaseFirestore,
        database: firebaseDatabase,
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
      throw new Error("Firebase configuration is incomplete");
    }

    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseFunctions = getFunctions(firebaseApp);
    firebaseStorage = getStorage(firebaseApp);
    firebaseFirestore = getFirestore(firebaseApp);
    firebaseDatabase = getDatabase(
      firebaseApp,
      import.meta.env.VITE_FIREBASE_DATABASE_URL,
    );

    // Connect to emulators in development
    if (import.meta.env.DEV || window.location.hostname === "localhost") {
      try {
        connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", {
          disableWarnings: true,
        });
        connectFunctionsEmulator(firebaseFunctions, "127.0.0.1", 5001);
        connectStorageEmulator(firebaseStorage, "127.0.0.1", 9199);
        connectFirestoreEmulator(firebaseFirestore, "127.0.0.1", 8080);
        connectDatabaseEmulator(firebaseDatabase, "127.0.0.1", 9000);
        emulatorsConnected = true;
      } catch (emulatorError) {}
    }

    // Set language code for auth (optional)
    firebaseAuth.languageCode = "en";

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      functions: firebaseFunctions,
      storage: firebaseStorage,
      firestore: firebaseFirestore,
      database: firebaseDatabase,
    };
  } catch (error) {
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
 * Get the Firebase Realtime Database instance
 * Initializes Firebase if not already initialized
 */
export function getFirebaseDatabase(): Database {
  if (!firebaseDatabase) {
    const { database } = initializeFirebase();
    return database;
  }
  return firebaseDatabase;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return getApps().length > 0;
}

/**
 * Clear any legacy session storage
 * @deprecated Use SessionManager instead
 */
export function clearICCustomToken(): void {
  try {
    // Clear old token storage keys for backward compatibility
    localStorage.removeItem("ic_custom_token");
    localStorage.removeItem("ic_custom_token_timestamp");
  } catch (error) {}
}
