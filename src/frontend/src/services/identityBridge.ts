/**
 * Identity Bridge Service
 *
 * This service handles the integration between Internet Identity and Firebase Auth.
 * It communicates with the Identity Bridge Cloud Function to exchange IC principals
 * for Firebase custom tokens.
 */

import { signInWithCustomToken, User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";

const FIREBASE_PROJECT_ID = "devsrv-rey";
const FIREBASE_REGION = "us-central1";

// Determine if we're in development mode
const isDevelopment =
  import.meta.env.DEV || window.location.hostname === "localhost";

// Use Firebase emulator in development, production URL in production
const IDENTITY_BRIDGE_URL = isDevelopment
  ? `http://127.0.0.1:5001/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}/signInWithInternetIdentity`
  : `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/signInWithInternetIdentity`;

interface IdentityBridgeResponse {
  success: boolean;
  customToken: string;
  principal: string;
  hasProfile: boolean;
  needsProfile: boolean;
  message: string;
}

interface IdentityBridgeError {
  error: string;
  details?: string;
}

interface SignInResult {
  user: User;
  hasProfile: boolean;
  needsProfile: boolean;
  message: string;
}

/**
 * Exchange Internet Identity Principal for Firebase Auth
 * @param principal - The Internet Identity Principal as string
 * @returns SignInResult with Firebase User and profile status
 */
export async function signInWithInternetIdentity(
  principal: string,
): Promise<SignInResult> {
  try {
    console.log("🔗 Calling Identity Bridge for principal:", principal);

    // Call the Identity Bridge Cloud Function
    const response = await fetch(IDENTITY_BRIDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        principal: principal,
      }),
    });

    if (!response.ok) {
      const errorData: IdentityBridgeError = await response.json();
      throw new Error(
        errorData.details || errorData.error || "Authentication failed",
      );
    }

    const data: IdentityBridgeResponse = await response.json();

    console.log("✅ Identity Bridge response:", {
      hasProfile: data.hasProfile,
      needsProfile: data.needsProfile,
      message: data.message,
    });

    if (!data.success || !data.customToken) {
      throw new Error("Invalid response from Identity Bridge");
    }

    // Sign in to Firebase with the custom token
    const auth = getFirebaseAuth();
    const userCredential = await signInWithCustomToken(auth, data.customToken);

    console.log("✅ Firebase sign-in successful");

    return {
      user: userCredential.user,
      hasProfile: data.hasProfile,
      needsProfile: data.needsProfile,
      message: data.message,
    };
  } catch (error) {
    console.error("❌ Error in signInWithInternetIdentity:", error);
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for creating a profile
 * @param name - User's name
 * @param phone - User's phone number
 * @param role - User's initial role (Client or ServiceProvider)
 * @returns Profile data
 */
export async function createProfile(
  name: string,
  phone: string,
  role: "Client" | "ServiceProvider",
): Promise<any> {
  try {
    const functions = getFirebaseFunctions();
    const createProfileFn = httpsCallable(functions, "createProfile");

    const result = await createProfileFn({
      name,
      phone,
      role,
    });

    return result.data;
  } catch (error) {
    console.error("Error creating profile:", error);
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
    const functions = getFirebaseFunctions();
    const getProfileFn = httpsCallable(functions, "getProfile");

    const result = await getProfileFn({
      userId,
    });

    return result.data;
  } catch (error) {
    console.error("Error getting profile:", error);
    throw error;
  }
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
    const functions = getFirebaseFunctions();
    const updateProfileFn = httpsCallable(functions, "updateProfile");

    const result = await updateProfileFn({
      name,
      phone,
    });

    return result.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for switching user role
 * @returns Updated profile data
 */
export async function switchUserRole(): Promise<any> {
  try {
    const functions = getFirebaseFunctions();
    const switchRoleFn = httpsCallable(functions, "switchUserRole");

    const result = await switchRoleFn({});

    return result.data;
  } catch (error) {
    console.error("Error switching role:", error);
    throw error;
  }
}

/**
 * Call Firebase Cloud Function for getting all service providers
 * @returns List of service providers
 */
export async function getAllServiceProviders(): Promise<any> {
  try {
    const functions = getFirebaseFunctions();
    const getProvidersFn = httpsCallable(functions, "getAllServiceProviders");

    const result = await getProvidersFn({});

    return result.data;
  } catch (error) {
    console.error("Error getting service providers:", error);
    throw error;
  }
}
