// Feedback Canister Service
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/feedback";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import type { _SERVICE as FeedbackService } from "../../../declarations/feedback/feedback.did";
import { Identity } from "@dfinity/agent";

// Frontend-compatible interfaces
export interface AppFeedback {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  rating: number; // 1-5 stars
  comment?: string; // Optional written review
  createdAt: Date;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: Array<[number, number]>; // [rating, count] pairs
  totalWithComments: number;
  latestFeedback?: AppFeedback;
}

export interface SubmitFeedbackRequest {
  rating: number;
  comment?: string;
}

/**
 * Creates a feedback actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated FeedbackService actor
 */
const createFeedbackActor = (identity?: Identity | null): FeedbackService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as FeedbackService;
};

// Singleton actor instance with identity tracking
let feedbackActor: FeedbackService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Gets or creates the feedback actor with the current identity
 * @param identity The user's identity
 * @returns The feedback actor instance
 */
const getFeedbackActor = (identity?: Identity | null): FeedbackService => {
  // Create new actor if identity changed or doesn't exist
  if (!feedbackActor || currentIdentity !== identity) {
    feedbackActor = createFeedbackActor(identity);
    currentIdentity = identity ?? null; // Convert undefined to null
  }
  return feedbackActor;
};

/**
 * Converts backend AppFeedback to frontend format
 */
const adaptBackendFeedback = (backendFeedback: any): AppFeedback => {
  return {
    id: backendFeedback.id,
    userId: backendFeedback.userId.toText(),
    userName: backendFeedback.userName,
    userPhone: backendFeedback.userPhone,
    rating: Number(backendFeedback.rating),
    comment: backendFeedback.comment?.[0] || undefined,
    createdAt: new Date(Number(backendFeedback.createdAt) / 1_000_000), // Convert from nanoseconds
  };
};

/**
 * Converts backend FeedbackStats to frontend format
 */
const adaptBackendFeedbackStats = (backendStats: any): FeedbackStats => {
  return {
    totalFeedback: Number(backendStats.totalFeedback),
    averageRating: Number(backendStats.averageRating),
    ratingDistribution: backendStats.ratingDistribution.map(
      ([rating, count]: [any, any]) => [Number(rating), Number(count)],
    ),
    totalWithComments: Number(backendStats.totalWithComments),
    latestFeedback: backendStats.latestFeedback?.[0]
      ? adaptBackendFeedback(backendStats.latestFeedback[0])
      : undefined,
  };
};

// Feedback Service Functions

/**
 * Initialize feedback canister with required references
 * @param identity User identity
 */
export const initializeFeedbackCanister = async (
  identity?: Identity | null,
): Promise<void> => {
  try {
    const actor = getFeedbackActor(identity);

    // Set canister references (auth canister)
    await actor.setCanisterReferences([Principal.fromText(authCanisterId)]);
    console.log("Feedback canister initialized successfully");
  } catch (error) {
    console.error("Failed to initialize feedback canister:", error);
    throw error;
  }
};

/**
 * Submit user feedback
 * @param request The feedback submission request
 * @param identity User identity
 * @returns The created feedback
 */
export const submitFeedback = async (
  request: SubmitFeedbackRequest,
  identity?: Identity | null,
): Promise<AppFeedback> => {
  try {
    const actor = getFeedbackActor(identity);

    const result = await actor.submitFeedback(
      BigInt(request.rating),
      request.comment ? [request.comment] : [],
    );

    if ("ok" in result) {
      return adaptBackendFeedback(result.ok);
    } else {
      throw new Error(result.err);
    }
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    throw error;
  }
};

/**
 * Get all feedback (admin function)
 * @param identity User identity
 * @returns Array of all feedback
 */
export const getAllFeedback = async (
  identity?: Identity | null,
): Promise<AppFeedback[]> => {
  try {
    const actor = getFeedbackActor(identity);
    const backendFeedback = await actor.getAllFeedback();

    return backendFeedback.map(adaptBackendFeedback);
  } catch (error) {
    console.error("Failed to get all feedback:", error);
    throw error;
  }
};

/**
 * Get current user's feedback
 * @param identity User identity
 * @returns Array of user's feedback
 */
export const getMyFeedback = async (
  identity?: Identity | null,
): Promise<AppFeedback[]> => {
  try {
    const actor = getFeedbackActor(identity);
    const backendFeedback = await actor.getMyFeedback();

    return backendFeedback.map(adaptBackendFeedback);
  } catch (error) {
    console.error("Failed to get user feedback:", error);
    throw error;
  }
};

/**
 * Get feedback statistics
 * @param identity User identity
 * @returns Feedback statistics
 */
export const getFeedbackStats = async (
  identity?: Identity | null,
): Promise<FeedbackStats> => {
  try {
    const actor = getFeedbackActor(identity);
    const backendStats = await actor.getFeedbackStats();

    return adaptBackendFeedbackStats(backendStats);
  } catch (error) {
    console.error("Failed to get feedback stats:", error);
    throw error;
  }
};

/**
 * Get recent feedback with a limit
 * @param limit Maximum number of feedback items to return
 * @param identity User identity
 * @returns Array of recent feedback
 */
export const getRecentFeedback = async (
  limit: number,
  identity?: Identity | null,
): Promise<AppFeedback[]> => {
  try {
    const actor = getFeedbackActor(identity);
    const backendFeedback = await actor.getRecentFeedback(BigInt(limit));

    return backendFeedback.map(adaptBackendFeedback);
  } catch (error) {
    console.error("Failed to get recent feedback:", error);
    throw error;
  }
};

/**
 * Get feedback by ID
 * @param feedbackId The feedback ID
 * @param identity User identity
 * @returns The feedback item
 */
export const getFeedbackById = async (
  feedbackId: string,
  identity?: Identity | null,
): Promise<AppFeedback> => {
  try {
    const actor = getFeedbackActor(identity);
    const result = await actor.getFeedbackById(feedbackId);

    if ("ok" in result) {
      return adaptBackendFeedback(result.ok);
    } else {
      throw new Error(result.err);
    }
  } catch (error) {
    console.error("Failed to get feedback by ID:", error);
    throw error;
  }
};

export default {
  initializeFeedbackCanister,
  submitFeedback,
  getAllFeedback,
  getMyFeedback,
  getFeedbackStats,
  getRecentFeedback,
  getFeedbackById,
};
