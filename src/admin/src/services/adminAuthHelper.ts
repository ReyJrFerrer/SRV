/**
 * Admin Authentication Helper
 * Utilities for admin-specific authentication and profile setup
 */

import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

const functions = getFirebaseFunctions();

export interface CreateAdminProfileResult {
  success: boolean;
  message: string;
  uid: string;
  needsSignOut: boolean;
}

/**
 * Creates admin profile and assign admin role
 *
 * @param uid - Firebase UID
 * @param principal - Internet Identity principal
 * @param name - Optional admin name
 * @param phone - Optional phone number
 * @returns Result with success status and UID
 */
export async function createAdminProfile(
  uid: string,
  principal: string,
  name?: string,
  phone?: string,
): Promise<CreateAdminProfileResult> {
  try {
    const createAdminFn = httpsCallable(functions, "createAdminProfile");

    const result = await createAdminFn({
      uid,
      principal,
      name,
      phone,
    });

    const data = result.data as CreateAdminProfileResult;

    if (data.success) {
      console.log("Admin profile created:", data.message);
      console.log("UID:", data.uid);

      if (data.needsSignOut) {
        console.log(
          "Please sign out and sign in again to refresh your admin token",
        );
      }
    }

    return data;
  } catch (error) {
    console.error("Failed to create admin profile:", error);
    throw error;
  }
}
