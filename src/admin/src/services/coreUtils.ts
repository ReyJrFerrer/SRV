import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";
import { AdminServiceError } from "./serviceTypes";

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
 */
export const callFirebaseFunction = async (
  functionName: string,
  payload: any,
) => {
  try {
    requireAuth();
    const callable = httpsCallable(functions, functionName);

    // Call the function with data directly
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
 * Updates the current identity
 */
export const updateAdminActor = (_identity: any) => {
  return null;
};

// Export functions for direct use
export { functions };
