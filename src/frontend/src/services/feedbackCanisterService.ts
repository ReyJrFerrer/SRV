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

export interface AppReport {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  description: string;
  createdAt: Date;
}

export interface ReportStats {
  totalReports: number;
  latestReport?: AppReport;
}

export interface SubmitReportRequest {
  description: string;
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
 * Converts backend AppReport to frontend format
 */
const adaptBackendReport = (backendReport: any): AppReport => {
  return {
    id: backendReport.id,
    userId: backendReport.userId.toText(),
    userName: backendReport.userName,
    userPhone: backendReport.userPhone,
    description: backendReport.description,
    createdAt: new Date(Number(backendReport.createdAt) / 1_000_000), // Convert from nanoseconds
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
    //console.log("Feedback canister initialized successfully");
  } catch (error) {
    //console.error("Failed to initialize feedback canister:", error);
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
    //console.error("Failed to submit feedback:", error);
    throw error;
  }
};

/**
 * Submit user report
 * @param request The report submission request
 * @param identity User identity
 * @returns The created report
 */
export const submitReport = async (
  request: SubmitReportRequest,
  identity?: Identity | null,
): Promise<AppReport> => {
  try {
    const actor = getFeedbackActor(identity);

    const result = await actor.submitReport(request.description);

    if ("ok" in result) {
      return adaptBackendReport(result.ok);
    } else {
      throw new Error(result.err);
    }
  } catch (error) {
    //console.error("Failed to submit report:", error);
    throw error;
  }
};

export default {
  initializeFeedbackCanister,
  submitFeedback,
  submitReport,
};
