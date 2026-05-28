import { getFirebaseFirestore as getDb } from "./firebaseApp";
import { doc, getDoc } from "firebase/firestore";
import {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
} from "firebase/functions";

interface ReputationResult {
  success: boolean;
  data?: {
    trustScore: number;
    trustLevel: string;
    completedBookings: number;
    averageRating: number | null;
    detectionFlags?: string[];
  };
  message?: string;
}

interface Review {
  id: string;
  clientId: string;
  providerId: string;
  rating: number;
  aiAnalysis?: {
    analyzed: boolean;
    isSuspicious?: boolean;
    confidence?: number;
    patterns?: string[];
    threatLevel?: string;
  };
}

class ReputationService {
  private async callReputationAction<T>(
    action: string,
    data?: object,
  ): Promise<T> {
    const functions = getFunctions();
    const reputationAction = httpsCallable(functions, "reputationAction");
    const result: HttpsCallableResult = await reputationAction({
      action,
      ...data,
    });
    return result.data as T;
  }

  private getDefaultReputation() {
    return {
      trustScore: 50,
      trustLevel: "New",
      completedBookings: 0,
      averageRating: null,
      detectionFlags: [],
    };
  }

  async getMyReputationScore(userId: string): Promise<any> {
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const db = getDb();
      const docRef = doc(db, "reputations", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return this.getDefaultReputation();
      }
    } catch (error: any) {
      console.error("Failed to fetch my reputation score:", error);
      throw new Error("Failed to fetch reputation score");
    }
  }

  async getReputationScore(userId: string): Promise<any> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      const db = getDb();
      const docRef = doc(db, "reputations", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return this.getDefaultReputation();
      }
    } catch (error: any) {
      console.error(`Failed to fetch reputation score for ${userId}:`, error);
      throw new Error("Failed to fetch reputation score");
    }
  }

  async initializeMyReputation(userId: string): Promise<ReputationResult> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      const result = await this.callReputationAction<ReputationResult>(
        "initializeReputation",
        { userId },
      );
      console.log("From reputation score", result);
      return result;
    } catch (error) {
      console.error("Error initializing reputation:", error);
      throw error;
    }
  }

  async updateUserReputation(userId: string): Promise<ReputationResult> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      return await this.callReputationAction<ReputationResult>(
        "updateUserReputation",
        { userId },
      );
    } catch (error) {
      console.error("Error updating user reputation:", error);
      throw error;
    }
  }

  async updateProviderReputation(
    providerId: string,
  ): Promise<ReputationResult> {
    if (!providerId) {
      throw new Error("Provider ID is required");
    }

    try {
      return await this.callReputationAction<ReputationResult>(
        "updateProviderReputation",
        { providerId },
      );
    } catch (error) {
      console.error("Error updating provider reputation:", error);
      throw error;
    }
  }

  async processReviewForReputation(review: Review): Promise<ReputationResult> {
    if (!review || !review.id) {
      throw new Error("Review object with ID is required");
    }

    try {
      return await this.callReputationAction<ReputationResult>(
        "processReviewForReputation",
        { review },
      );
    } catch (error) {
      console.error("Error processing review for reputation:", error);
      throw error;
    }
  }

  async deductReputationForCancellation(userId: string): Promise<any> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      return await this.callReputationAction<ReputationResult>(
        "deductReputationForCancellation",
        { userId },
      );
    } catch (error) {
      console.error("Error deducting reputation for cancellation:", error);
      throw error;
    }
  }

  async deductReputationForSuspiciousReview(
    userId: string,
  ): Promise<ReputationResult> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      return await this.callReputationAction<ReputationResult>(
        "deductReputationForSuspiciousReview",
        { userId },
      );
    } catch (error) {
      console.error("Error deducting reputation for suspicious review:", error);
      throw error;
    }
  }
}

const reputationService = new ReputationService();

export default reputationService;
