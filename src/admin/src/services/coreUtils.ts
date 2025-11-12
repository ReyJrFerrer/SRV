import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";
import { AdminServiceError } from "./serviceTypes";

// Get Firebase instances from singleton
const auth = getFirebaseAuth();
const functions = getFirebaseFunctions();

/**
 * Helper function to create AdminServiceError
 */
export const createAdminError = (
  message: string,
  code: string,
  details?: any,
): AdminServiceError => {
  return new AdminServiceError({
    message,
    code,
    details,
  } as AdminServiceError);
};

/**
 * Check if user is authenticated
 */
export const requireAuth = () => {
  if (!auth.currentUser) {
    throw createAdminError(
      "Authentication required: Please log in as an admin to perform this action",
      "AUTH_REQUIRED",
    );
  }
};

/**
 * Helper function to call Firebase Cloud Functions
 * Follows the established pattern of wrapping payload in data object
 */
export const callFirebaseFunction = async (functionName: string, payload: any) => {
  try {
    requireAuth(); // Ensure user is authenticated
    const callable = httpsCallable(functions, functionName);

    // Call the function with data directly (admin.js expects: data.data || data)
    const result = await callable(payload);

    if ((result.data as any).success) {
      return (result.data as any).data || (result.data as any).message;
    } else {
      throw new Error((result.data as any).message || "Function call failed");
    }
  } catch (error: any) {
    console.error(`Error calling ${functionName}:`, error);
    throw new AdminServiceError({
      message: error.message || `Failed to call ${functionName}`,
      code: error.code || "FIREBASE_FUNCTION_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

/**
 * Updates the current identity (compatibility function)
 * Note: Admin service uses Firebase auth, not IC identity
 */
export const updateAdminActor = (_identity: any) => {
  // Admin service uses Firebase authentication, not IC identity
  return null; // Firebase doesn't use actors
};

// Export functions for direct use
export { functions };

