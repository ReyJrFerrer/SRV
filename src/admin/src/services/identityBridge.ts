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

let auth: Auth | null = null;
let functions: Functions | null = null;

function ensureAuth(): Auth {
  if (!auth) {
    initializeFirebase();
    auth = getFirebaseAuth();
  }
  return auth;
}

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
  customToken: string;
}

export async function signInWithInternetIdentity(
  principal: string,
  sessionDuration: number = 7 * 24 * 60 * 60 * 1000,
  email?: string,
): Promise<SignInResult> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "signInWithInternetIdentity",
      payload: { principal, email },
    });
    const data = result.data as IdentityBridgeResponse;

    if (!data.success || !data.customToken) {
      throw new Error("Error signing in with Internet Identity");
    }

    const authInstance = ensureAuth();
    const userCredential = await signInWithCustomToken(
      authInstance,
      data.customToken,
    );

    await new Promise<void>((resolve) => {
      const unsubscribe = authInstance.onAuthStateChanged((user) => {
        if (user && user.uid === userCredential.user.uid) {
          unsubscribe();
          resolve();
        }
      });
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 2000);
    });

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

export async function createProfile(
  name: string,
  phone: string,
  role: "Client" | "ServiceProvider" | "Admin",
  email?: string,
): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "createProfile",
      payload: {
        name,
        phone,
        role,
        email,
      },
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function validatePhone(phone: string): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "validatePhoneNumber",
      payload: {
        phone,
      },
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function getProfile(userId?: string): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "getProfile",
      payload: {
        userId,
      },
    });

    return result.data;
  } catch (error) {}
}

export async function updateProfile(
  name?: string,
  phone?: string,
): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "updateProfile",
      payload: {
        name,
        phone,
      },
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function switchUserRole(): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "switchUserRole",
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function getAllServiceProviders(): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "getAllServiceProviders",
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function uploadProfilePicture(
  fileName: string,
  contentType: string,
  fileData: string,
): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "uploadProfilePicture",
      payload: {
        fileName,
        contentType,
        fileData,
      },
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function removeProfilePicture(): Promise<any> {
  try {
    const functionsInstance = ensureFunctions();
    const accountActionFn = httpsCallable(functionsInstance, "accountAction");

    const result = await accountActionFn({
      action: "removeProfilePicture",
    });

    return result.data;
  } catch (error) {
    throw error;
  }
}