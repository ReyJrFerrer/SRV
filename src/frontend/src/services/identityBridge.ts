/**
 * Identity Bridge Service
 *
 * This service handles the integration between Internet Identity and Firebase Auth.
 * It communicates with the Identity Bridge Cloud Function to exchange IC principals
 * for Firebase custom tokens.
 */

import { signInWithCustomToken, User, Auth } from "firebase/auth";
import { httpsCallable, Functions } from "firebase/functions";
import {
  getFirebaseAuth,
  getFirebaseFunctions,
  initializeFirebase,
} from "./firebaseApp";
import { sessionManager, SessionData } from "../utils/sessionPersistence";

// Cached instances
let auth: Auth | null = null;
let functions: Functions | null = null;

/**
 * Ensure Firebase is initialized and return auth instance
 */
function ensureAuth(): Auth {
  if (!auth) {
    initializeFirebase();
    auth = getFirebaseAuth();
  }
  return auth;
}

/**
 * Ensure Firebase is initialized and return functions instance
 */
function ensureFunctions(): Functions {
  if (!functions) {
    initializeFirebase();
    functions = getFirebaseFunctions();
  }
  return functions;
}

interface IdentityBridgeResponse {
  success: boolean;
  customToken: string;
  principal: string;
  hasProfile: boolean;
  needsProfile: boolean;
  message: string;
}

interface SignInResult {
  user: User;
  hasProfile: boolean;
  needsProfile: boolean;
  message: string;
  customToken: string; // Return token for session storage
}

/**
 * Exchange Internet Identity Principal for Firebase Auth
 * @param principal - The Internet Identity Principal as string
 * @param sessionDuration - Session duration in milliseconds
 * @returns SignInResult with Firebase User and profile status
 */
export async function signInWithInternetIdentity(
  principal: string,
  sessionDuration: number = 7 * 24 * 60 * 60 * 1000, // Default 7 days in ms
): Promise<SignInResult> {
  try {
    // Call the Identity Bridge Cloud Function using Firebase SDK
    const functionsInstance = ensureFunctions();
    const signInFn = httpsCallable<
      { principal: string },
      IdentityBridgeResponse
    >(functionsInstance, "signInWithInternetIdentity");

    const result = await signInFn({ principal });
    const data = result.data;

    if (!data.success || !data.customToken) {
      throw new Error("Error signing in with Internet Identity");
    }

    // Sign in to Firebase with the custom token
    const authInstance = ensureAuth();
    const userCredential = await signInWithCustomToken(
      authInstance,
      data.customToken,
    );

    // CRITICAL: Wait for onAuthStateChanged to fire
    // This ensures the auth state is fully propagated before we return
    await new Promise<void>((resolve) => {
      const unsubscribe = authInstance.onAuthStateChanged((user) => {
        if (user && user.uid === userCredential.user.uid) {
          unsubscribe();
          resolve();
        }
      });

      // Failsafe timeout in case the listener doesn't fire
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 2000);
    });

    // Store session in SessionManager
    const sessionData: SessionData = {
      principal: data.principal,
      firebaseToken: data.customToken,
      expiresAt: Date.now() + sessionDuration,
      lastRefresh: Date.now(),
      lastFirebaseRefresh: Date.now(),
      hasProfile: data.hasProfile,
      needsProfile: data.needsProfile,
      sessionDuration,
    };
    await sessionManager.storeSession(sessionData);

    return {
      user: userCredential.user,
      hasProfile: data.hasProfile,
      needsProfile: data.needsProfile,
      message: data.message,
      customToken: data.customToken,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for creating a profile
 * @param name - User's name
 * @param phone - User's phone number
 * @param role - User's initial role (Client, ServiceProvider, or Admin)
 * @returns Profile data
 */
export async function createProfile(
  name: string,
  phone: string,
  role: "Client" | "ServiceProvider" | "Admin",
): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const createProfileFn = httpsCallable(functionsInstance, "createProfile");

    const result = await createProfileFn({
      name,
      phone,
      role,
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for validating phone number
 * @param phone - User's phone number
 */
export async function validatePhone(phone: string): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const validatePhoneFn = httpsCallable(
      functionsInstance,
      "validatePhoneNumber",
    );

    const result = await validatePhoneFn({
      phone,
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for getting a profile
 * @param userId - Optional user ID, defaults to current user
 * @returns Profile data
 */
export async function getProfile(userId?: string): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const getProfileFn = httpsCallable(functionsInstance, "getProfile");

    const result = await getProfileFn({
      userId,
    });

    return result.data;
  } catch (error) {}
}

/**
 * Call Firebase Cloud Function for updating a profile
 * @param name - Optional new name
 * @param phone - Optional new phone number
 * @returns Updated profile data
 */
export async function updateProfile(
  name?: string,
  phone?: string,
): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const updateProfileFn = httpsCallable(functionsInstance, "updateProfile");

    const result = await updateProfileFn({
      name,
      phone,
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for switching user role
 * @returns Updated profile data
 */
export async function switchUserRole(): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const switchRoleFn = httpsCallable(functionsInstance, "switchUserRole");

    const result = await switchRoleFn({});

    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for getting all service providers
 * @returns List of service providers
 */
export async function getAllServiceProviders(): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const getProvidersFn = httpsCallable(
      functionsInstance,
      "getAllServiceProviders",
    );

    const result = await getProvidersFn({});

    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Upload profile picture
 */
export async function uploadProfilePicture(
  fileName: string,
  contentType: string,
  fileData: string, // base64 encoded
): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const uploadPictureFn = httpsCallable(
      functionsInstance,
      "uploadProfilePicture",
    );

    const result = await uploadPictureFn({
      fileName,
      contentType,
      fileData,
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Remove profile picture
 */
export async function removeProfilePicture(): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const removePictureFn = httpsCallable(
      functionsInstance,
      "removeProfilePicture",
    );

    const result = await removePictureFn({});

    return result.data;
  } catch (error) {
    throw error;
  }
}
