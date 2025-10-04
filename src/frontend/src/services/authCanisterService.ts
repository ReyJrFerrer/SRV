/**
 * Auth Service (Firebase-based)
 *
 * This service provides authentication and profile management functionality
 * using Firebase Cloud Functions instead of direct canister calls.
 * It maintains the same interface as the previous canister-based service
 * for backward compatibility.
 */

import * as identityBridge from "./identityBridge";

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
}

/**
 * Updates the auth actor with a new identity
 * This is kept for backward compatibility but doesn't create actors anymore
 * Firebase authentication is handled by the AuthContext
 */
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
      console.error("Error fetching service providers:", error);
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
      console.error("Error fetching profile:", error);
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
      console.error("Error fetching my profile:", error);
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
      console.error("Error creating profile:", error);
      throw error;
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
      console.error("Error updating profile:", error);
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
      console.error("Error switching user role:", error);
      throw error;
    }
  },

  /**
   * Set canister references (DEPRECATED - No longer needed with Firebase)
   * Kept for backward compatibility but does nothing
   */
  async setCanisterReferences(
    providedMediaCanisterId?: string,
  ): Promise<string | null> {
    console.log(providedMediaCanisterId);
    console.warn(
      "setCanisterReferences is deprecated in Firebase architecture",
    );
    return null;
  },

  /**
   * Upload a profile picture (DEPRECATED - Use Firebase Storage instead)
   * Kept for backward compatibility but will need to be reimplemented with Firebase Storage
   */
  async uploadProfilePicture(
    fileName: string,
    contentType: string,
    fileData: Uint8Array,
  ): Promise<FrontendProfile | null> {
    console.log(fileName, contentType, fileData);

    throw new Error(
      "Profile picture upload needs to be reimplemented with Firebase Storage",
    );
  },

  /**
   * Remove the current profile picture (DEPRECATED - Use Firebase Storage instead)
   * Kept for backward compatibility but will need to be reimplemented with Firebase Storage
   */
  async removeProfilePicture(): Promise<FrontendProfile | null> {
    throw new Error(
      "Profile picture removal needs to be reimplemented with Firebase Storage",
    );
  },
};

export default authCanisterService;
