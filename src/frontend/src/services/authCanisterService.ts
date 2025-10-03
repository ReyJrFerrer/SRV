// Auth Canister Service
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/auth";
import { canisterId as reputationCanisterId } from "../../../declarations/reputation";
import { canisterId as mediaCanisterId } from "../../../declarations/media";
import type {
  _SERVICE as AuthService,
  UserRole,
} from "../../../declarations/auth/auth.did";
import { adaptBackendProfile } from "../utils/assetResolver";
import { Identity } from "@dfinity/agent";

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
 * Creates an auth actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated AuthService actor
 */
const createAuthActor = (identity?: Identity | null): AuthService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host: 
        process.env.DFX_NETWORK !== "ic" &&
        process.env.DFX_NETWORK !== "playground"
          ? "http://localhost:4943"
          : "https://id.ai",
    },
  }) as AuthService;
};

// Singleton actor instance with identity tracking
let authActor: AuthService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the auth actor with a new identity
 * This should be called when the user's authentication state changes
 */
export const updateAuthActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    authActor = createAuthActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current auth actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getAuthActor = (requireAuth: boolean = false): AuthService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!authActor) {
    authActor = createAuthActor(currentIdentity);
  }

  return authActor;
};
// Auth Canister Service Functions
export const authCanisterService = {
  /**
   * Get all service providers from the auth canister
   */
  async getAllServiceProviders(): Promise<FrontendProfile[]> {
    try {
      const actor = getAuthActor();
      const profiles = await actor.getAllServiceProviders();

      // Convert backend profiles to frontend-compatible format
      return profiles.map((profile) => adaptBackendProfile(profile));
    } catch (error) {
      //console.error("Error fetching service providers:", error);
      throw new Error(`Failed to fetch service providers: ${error}`);
    }
  },

  /**
   * Get a specific profile by Principal ID
   * @param userId The principal ID of the user to fetch
   */
  async getProfile(userId: string): Promise<FrontendProfile | null> {
    try {
      const actor = getAuthActor();

      // Convert string to Principal
      const userPrincipal = Principal.fromText(userId);

      const result = await actor.getProfile(userPrincipal);

      if ("ok" in result) {
        return adaptBackendProfile(result.ok);
      } else {
        return null;
      }
    } catch (error) {
      //console.error("Error fetching profile:", error);
      //console.error("UserId that caused error:", userId);
      throw new Error(`Failed to fetch profile: ${error}`);
    }
  },

  /**
   * Get the current user's profile (requires authentication)
   */
  async getMyProfile(): Promise<FrontendProfile | null> {
    try {
      const actor = getAuthActor(true); // Requires authentication
      const result = await actor.getMyProfile();

      if ("ok" in result) {
        return adaptBackendProfile(result.ok);
      } else {
        //console.error("Error fetching my profile:", result.err);
        return null;
      }
    } catch (error) {
      //console.error("Error fetching my profile:", error);
      throw new Error(`Failed to fetch my profile: ${error}`);
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
      const actor = getAuthActor(true); // Requires authentication
      const userRole: UserRole = { [activeRole]: null } as UserRole;
      const result = await actor.createProfile(name, phone, userRole);

      if ("ok" in result) {
        return adaptBackendProfile(result.ok);
      } else {
        //console.error("Error creating profile:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error creating profile:", error);
      throw new Error(`Failed to create profile: ${error}`);
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
      const actor = getAuthActor(true); // Requires authentication
      const result = await actor.updateProfile(
        name ? [name] : [],
        phone ? [phone] : [],
      );

      if ("ok" in result) {
        return adaptBackendProfile(result.ok);
      } else {
        //console.error("Error updating profile:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error updating profile:", error);
      throw new Error(`Failed to update profile: ${error}`);
    }
  },

  /**
   * Switch user active role between Client and ServiceProvider (requires authentication)
   * Toggles the user's active role preference while keeping them discoverable as a service provider
   */
  async switchUserRole(): Promise<FrontendProfile | null> {
    try {
      const actor = getAuthActor(true); // Requires authentication
      const result = await actor.switchUserRole();

      if ("ok" in result) {
        return adaptBackendProfile(result.ok);
      } else {
        //console.error("Error switching user role:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error switching user role:", error);
      throw new Error(`Failed to switch user role: ${error}`);
    }
  },

  /**
   * Set canister references for auth canister (ADMIN FUNCTION)
   * @param reputationCanisterId Optional reputation canister ID to set
   * @param providedMediaCanisterId Optional media canister ID to set (defaults to built-in mediaCanisterId)
   */
  async setCanisterReferences(
    providedMediaCanisterId?: string,
  ): Promise<string | null> {
    try {
      const actor = getAuthActor(true);
      const result = await actor.setCanisterReferences(
        reputationCanisterId ? [Principal.fromText(reputationCanisterId)] : [],
        providedMediaCanisterId
          ? [Principal.fromText(providedMediaCanisterId)]
          : mediaCanisterId
            ? [Principal.fromText(mediaCanisterId)]
            : [],
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        // //console.error("Error setting canister references:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      // //console.error("Error setting canister references:", error);
      throw new Error(`Failed to set canister references: ${error}`);
    }
  },

  /**
   * Upload a profile picture (requires authentication)
   * @param fileName The name of the file being uploaded
   * @param contentType The MIME type of the file (e.g., 'image/jpeg')
   * @param fileData The binary data of the image file
   */
  async uploadProfilePicture(
    fileName: string,
    contentType: string,
    fileData: Uint8Array,
  ): Promise<FrontendProfile | null> {
    try {
      const actor = getAuthActor(true); // Requires authentication
      const result = await actor.uploadProfilePicture(
        fileName,
        contentType,
        fileData,
      );

      if ("ok" in result) {
        return adaptBackendProfile(result.ok);
      } else {
        //console.error("Error uploading profile picture:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error uploading profile picture:", error);
      throw new Error(`Failed to upload profile picture: ${error}`);
    }
  },

  /**
   * Remove the current profile picture (requires authentication)
   */
  async removeProfilePicture(): Promise<FrontendProfile | null> {
    try {
      const actor = getAuthActor(true); // Requires authentication
      const result = await actor.removeProfilePicture();

      if ("ok" in result) {
        return adaptBackendProfile(result.ok);
      } else {
        //console.error("Error removing profile picture:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error removing profile picture:", error);
      throw new Error(`Failed to remove profile picture: ${error}`);
    }
  },
};

export default authCanisterService;
