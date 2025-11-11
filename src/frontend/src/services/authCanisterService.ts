/**
 * Auth Service (Firebase-based)
 *
 * This service provides authentication and profile management functionality
 * using Firebase Cloud Functions instead of direct canister calls.
 * It maintains the same interface as the previous canister-based service
 * for backward compatibility.
 */

import * as identityBridge from "./identityBridge";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

// Frontend-compatible Profile interface
export interface FrontendProfile {
  id: string;
  name: string;
  phone: string;
  role: "Client" | "ServiceProvider"; // Original role (everyone is ServiceProvider for discoverability)
  activeRole: "Client" | "ServiceProvider"; // Current UI preference/mode
  profilePicture?: {
    imageUrl: string | null; // Asset URL or null
    thumbnailUrl: string | null; // Asset URL or null
  };
  biography?: string;
  createdAt: Date;
  updatedAt: Date;
  locked?: boolean; // Account suspension status
  suspensionEndDate?: Date | null; // When suspension expires (null for indefinite)
  isOnboarded?: boolean; // Provider onboarding status for payment functionality
}

/**
 * Helper function to convert Firestore profile data to FrontendProfile
 * @param firestoreProfile Profile data from Firestore
 * @returns FrontendProfile object
 */
function convertFirestoreProfile(firestoreProfile: any): FrontendProfile {
  return {
    id: firestoreProfile.id,
    name: firestoreProfile.name,
    phone: firestoreProfile.phone,
    role: firestoreProfile.role,
    activeRole: firestoreProfile.activeRole,
    profilePicture: firestoreProfile.profilePicture || undefined,
    biography: firestoreProfile.biography || undefined,
    createdAt: new Date(firestoreProfile.createdAt),
    updatedAt: new Date(firestoreProfile.updatedAt),
    locked: firestoreProfile.locked || false, // Default to false if not specified
    suspensionEndDate: firestoreProfile.suspensionEndDate
      ? new Date(firestoreProfile.suspensionEndDate)
      : firestoreProfile.suspensionEndDate === null
        ? null
        : undefined,
    isOnboarded: firestoreProfile.isOnboarded || false, // Default to false if not specified
  };
}

// Auth Service Functions (Firebase-based)
export const authCanisterService = {
  /**
   * Get all service providers via Firebase Cloud Function
   */
  async getAllServiceProviders(): Promise<FrontendProfile[]> {
    try {
      const result = await identityBridge.getAllServiceProviders();

      if (result.success && result.providers) {
        return result.providers.map(convertFirestoreProfile);
      }

      throw new Error("Failed to fetch service providers");
    } catch (error) {
      throw new Error(`Failed to fetch service providers: ${error}`);
    }
  },

  /**
   * Get a specific profile by user ID (Principal)
   * @param userId The principal ID of the user to fetch
   */
  async getProfile(userId: string): Promise<FrontendProfile | null> {
    try {
      const result = await identityBridge.getProfile(userId);

      if (result.success && result.profile) {
        return convertFirestoreProfile(result.profile);
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get the current user's profile (requires authentication)
   */
  async getMyProfile(): Promise<FrontendProfile | null> {
    try {
      // Call without userId to get current user's profile
      const result = await identityBridge.getProfile();

      if (result.success && result.profile) {
        return convertFirestoreProfile(result.profile);
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Create a new profile (requires authentication)
   * @param name User's name
   * @param phone User's phone number
   * @param activeRole User's preferred role/mode (Client or ServiceProvider)
   */
  async createProfile(
    name: string,
    phone: string,
    activeRole: "Client" | "ServiceProvider",
  ): Promise<FrontendProfile | null> {
    try {
      const result = await identityBridge.createProfile(
        name,
        phone,
        activeRole,
      );

      if (result.success && result.profile) {
        return convertFirestoreProfile(result.profile);
      }

      throw new Error("Failed to create profile");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validate phone number before receiving the OTP
   * @param phone User's phone number
   */
  async validatePhone(phone: string): Promise<boolean> {
    try {
      const result = await identityBridge.validatePhone(phone);
      return result.success;
    } catch (error) {
      return false;
    }
  },

  /**
   * Update an existing profile (requires authentication)
   * @param name Optional new name
   * @param phone Optional new phone number
   */
  async updateProfile(
    name?: string,
    phone?: string,
  ): Promise<FrontendProfile | null> {
    try {
      const result = await identityBridge.updateProfile(name, phone);

      if (result.success && result.profile) {
        return convertFirestoreProfile(result.profile);
      }

      throw new Error("Failed to update profile");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Switch user active role between Client and ServiceProvider (requires authentication)
   * Toggles the user's active role preference while keeping them discoverable as a service provider
   */
  async switchUserRole(): Promise<FrontendProfile | null> {
    try {
      const result = await identityBridge.switchUserRole();

      if (result.success && result.profile) {
        return convertFirestoreProfile(result.profile);
      }

      throw new Error("Failed to switch user role");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload a profile picture
   * @param fileName Name of the file
   * @param contentType MIME type of the file
   * @param fileData File data as Uint8Array
   */
  async uploadProfilePicture(
    fileName: string,
    contentType: string,
    fileData: Uint8Array,
  ): Promise<FrontendProfile | null> {
    try {
      // Convert Uint8Array to base64
      const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      };

      const base64Data = uint8ArrayToBase64(fileData);

      const result = await identityBridge.uploadProfilePicture(
        fileName,
        contentType,
        base64Data,
      );

      if (result.success && result.profile) {
        return convertFirestoreProfile(result.profile);
      }

      throw new Error("Failed to upload profile picture");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Remove the current profile picture
   */
  async removeProfilePicture(): Promise<FrontendProfile | null> {
    try {
      const result = await identityBridge.removeProfilePicture();

      if (result.success && result.profile) {
        return convertFirestoreProfile(result.profile);
      }

      throw new Error("Failed to remove profile picture");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user active status (for login/logout tracking)
   */
  async updateUserActiveStatus(isActive: boolean): Promise<void> {
    try {
      const functions = getFirebaseFunctions();
      const updateActiveStatusFn = httpsCallable(
        functions,
        "updateUserActiveStatus",
      );

      const result: any = await updateActiveStatusFn({
        isActive: isActive,
      });

      if (!result.data?.success) {
        throw new Error(
          result.data?.message || "Failed to update user active status",
        );
      }
    } catch (error) {
      throw error;
    }
  },
};

export default authCanisterService;
