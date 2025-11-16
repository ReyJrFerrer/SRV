// Imports
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/reputation";
import { Identity } from "@dfinity/agent";
import type { _SERVICE as ReputationService } from "../../../declarations/reputation/reputation.did";

// Actor factory
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
          : "https://id.ai",
    },
  }) as ReputationService;
};

// Actor state
let reputationActor: ReputationService | null = null;
let currentIdentity: Identity | null = null;

// Identity updates
export const updateReputationActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    reputationActor = createReputationActor(identity);
    currentIdentity = identity;
  }
};

// Actor accessor
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
  async getMyReputationScore(): Promise<any> {
    try {
      const actor = getReputationActor(true);
      const result = await actor.getMyReputationScore();

      if ("ok" in result) {
        return result.ok;
      } else {
        throw new Error("Failed to fetch reputation score");
      }
    } catch (error: any) {
      if (
        error?.message?.includes("Invalid signature") ||
        error?.message?.includes("signature could not be verified")
      ) {
        throw new Error(
          "Session expired: Please refresh the page and log in again",
        );
      }
      throw error;
    }
  }

  async getReputationScore(userId: string): Promise<any> {
    try {
      const actor = getReputationActor();

      const userPrincipal = Principal.fromText(userId);
      const result = await actor.getReputationScore(userPrincipal);
      if ("ok" in result) {
        return result.ok;
      }
    } catch (error: any) {
      if (
        error?.message?.includes("Invalid signature") ||
        error?.message?.includes("signature could not be verified")
      ) {
        throw new Error(
          "Reputation cannot be retrieved: Please refresh the page and log in again",
        );
      }
      throw error;
    }
  }

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
        throw new Error(`Failed to initialize reputation: ${result.err}`);
      }
    } catch (error) {
      // throw new Error("Network error: Could not initialize reputation");
    }
  }
}

// Export
const reputationCanisterService = new ReputationCanisterService();

export default reputationCanisterService;
