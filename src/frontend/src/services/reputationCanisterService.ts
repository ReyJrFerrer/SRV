import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/reputation";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import { canisterId as bookingCanisterId } from "../../../declarations/booking";
import { canisterId as reviewCanisterId } from "../../../declarations/review";
import { canisterId as serviceCanisterId } from "../../../declarations/service";
import { Identity } from "@dfinity/agent";
import type { _SERVICE as ReputationService } from "../../../declarations/reputation/reputation.did";

/**
 * Creates a reputation actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated ReputationService actor
 */
const createReputationActor = (
  identity?: Identity | null,
): ReputationService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic" &&
        process.env.DFX_NETWORK !== "playground"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as ReputationService;
};

// Singleton actor instance with identity tracking
let reputationActor: ReputationService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the reputation actor with a new identity
 * This should be called when the user's authentication state changes
 */
export const updateReputationActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    reputationActor = createReputationActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current reputation actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getReputationActor = (
  requireAuth: boolean = false,
): ReputationService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!reputationActor) {
    reputationActor = createReputationActor(currentIdentity);
  }

  return reputationActor;
};

class ReputationCanisterService {
  // Set canister references - this is the main function needed
  async setCanisterReferences(): Promise<void> {
    try {
      const actor = getReputationActor(true);
      const result = await actor.setCanisterReferences(
        Principal.fromText(authCanisterId),
        Principal.fromText(bookingCanisterId),
        Principal.fromText(reviewCanisterId),
        Principal.fromText(serviceCanisterId),
      );

      if ("ok" in result) {
      } else {
        // //console.error(
        //   "❌ Failed to set reputation canister references:",
        //   result.err,
        // );
        throw new Error(`Failed to set canister references: ${result.err}`);
      }
    } catch (error) {
      // //console.error("❌ Error setting reputation canister references:", error);
      throw error;
    }
  }

  /**
   * Get the current user's reputation score
   * @returns Promise<ReputationScore> The user's reputation data
   * @throws Error if user is not authenticated or reputation cannot be fetched
   */
  async getMyReputationScore(): Promise<any> {
    try {
      const actor = getReputationActor(true);
      const result = await actor.getMyReputationScore();

      if ("ok" in result) {
        return result.ok;
      } else {
        //console.error("❌ Failed to fetch reputation score:", result.err);
        throw new Error(`Failed to fetch reputation: ${result.err}`);
      }
    } catch (error) {
      //console.error("❌ Error fetching reputation score:", error);
      throw new Error("Network error: Could not fetch reputation score");
    }
  }

  /***
   * Get a user's reputation score
   * @returns Promise<ReputationScore> The user's reputation data
   * @throws Error if user is not authenticated or reputation cannot be fetched
   */
  async getReputationScore(userId: string): Promise<any> {
    try {
      const actor = getReputationActor(true);

      const userPrincipal = Principal.fromText(userId);
      const result = await actor.getReputationScore(userPrincipal);
      if ("ok" in result) {
        return result.ok;
      } else {
        //console.error("❌ Failed to fetch reputation score:", result.err);
        throw new Error(`Failed to fetch reputation: ${result.err}`);
      }
    } catch (error) {
      //console.error("❌ Error fetching reputation score:", error);
      throw new Error("Network error: Could not fetch reputation score");
    }
  }

  /**
   * Initialize reputation for a new user
   * @returns Promise<ReputationScore> The initialized reputation data
   */
  async initializeMyReputation(): Promise<any> {
    try {
      const actor = getReputationActor(true);
      const result = await actor.initializeReputation(
        currentIdentity?.getPrincipal()!,
        BigInt(Date.now() * 1_000_000), // Convert to nanoseconds
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        //console.error("❌ Failed to initialize reputation:", result.err);
        throw new Error(`Failed to initialize reputation: ${result.err}`);
      }
    } catch (error) {
      //console.error("❌ Error initializing reputation:", error);
      throw new Error("Network error: Could not initialize reputation");
    }
  }
}

// Export singleton instance
const reputationCanisterService = new ReputationCanisterService();

export default reputationCanisterService;
