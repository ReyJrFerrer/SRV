import { getFirebaseFirestore as getDb } from "./firebaseApp";
import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

class ReputationService {
  /**
   * Get the current user's reputation score
   * @returns Promise<any> The user's reputation data
   * @throws Error if user is not authenticated or reputation cannot be fetched
   */
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
        // Return default object if doesn't exist
        return {
          trustScore: 50,
          trustLevel: "New",
          completedBookings: 0,
          averageRating: null,
        };
      }
    } catch (error: any) {
      console.error("Failed to fetch my reputation score:", error);
      throw new Error("Failed to fetch reputation score");
    }
  }

  /***
   * Get a user's reputation score
   * @returns Promise<any> The user's reputation data
   * @throws Error if reputation cannot be fetched
   */
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
        // Return default object if doesn't exist
        return {
          trustScore: 50,
          trustLevel: "New",
          completedBookings: 0,
          averageRating: null,
        };
      }
    } catch (error: any) {
      console.error(`Failed to fetch reputation score for ${userId}:`, error);
      throw new Error("Failed to fetch reputation score");
    }
  }

  /**
   * Initialize reputation for a new user
   * @returns Promise<any> The initialized reputation data
   */
  async initializeMyReputation(userId: string): Promise<any> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      const functions = getFunctions();
      const initializeReputation = httpsCallable(
        functions,
        "initializeReputation",
      );

      const result = await initializeReputation({ userId });

      console.log("From reputation score", result.data);
      return result.data;
    } catch (error) {
      console.error("Error initializing reputation:", error);
      throw error;
    }
  }
}

// Export singleton instance
const reputationService = new ReputationService();

export default reputationService;
