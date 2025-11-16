// Imports
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import reputationCanisterService, {
  updateReputationActor,
} from "../services/reputationCanisterService";

// Types
export interface ReputationScore {
  userId: string;
  trustScore: number;
  trustLevel: "New" | "Low" | "Medium" | "High" | "VeryHigh";
  completedBookings: number;
  averageRating?: number;
  detectionFlags: string[];
  lastUpdated: number;
}
// Hook
export const useReputation = () => {
  const { isAuthenticated, identity } = useAuth();

  const [reputation, setReputation] = useState<ReputationScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserReputation = useMemo(
    () =>
      async (userId: string): Promise<ReputationScore | null> => {
        try {
          updateReputationActor(identity || null);

          try {
            const reputationData =
              await reputationCanisterService.getReputationScore(userId);

            const formattedReputation: ReputationScore = {
              userId: reputationData.userId.toString(),
              trustScore: Number(reputationData.trustScore),
              trustLevel: reputationData.trustLevel.hasOwnProperty("New")
                ? "New"
                : reputationData.trustLevel.hasOwnProperty("Low")
                  ? "Low"
                  : reputationData.trustLevel.hasOwnProperty("Medium")
                    ? "Medium"
                    : reputationData.trustLevel.hasOwnProperty("High")
                      ? "High"
                      : "VeryHigh",
              completedBookings: Number(reputationData.completedBookings),
              averageRating: reputationData.averageRating
                ? Number(reputationData.averageRating[0])
                : undefined,
              detectionFlags: reputationData.detectionFlags.map(
                (flag: any) => Object.keys(flag)[0],
              ),
              lastUpdated: Number(reputationData.lastUpdated),
            };

            return formattedReputation;
          } catch (fetchError: any) {
            if (
              fetchError.message.includes("No reputation score found") ||
              fetchError.message.includes("not found")
            ) {
              return {
                userId,
                trustScore: 50,
                trustLevel: "New",
                completedBookings: 0,
                averageRating: undefined,
                detectionFlags: [],
                lastUpdated: Date.now() * 1_000_000,
              };
            } else {
              throw fetchError;
            }
          }
        } catch (err: any) {
          if (
            err.message.includes("Network error") ||
            err.message.includes("fetch")
          ) {
            return {
              userId,
              trustScore: 50,
              trustLevel: "New",
              completedBookings: 0,
              averageRating: undefined,
              detectionFlags: [],
              lastUpdated: Date.now() * 1_000_000,
            };
          }

          return null;
        }
      },
    [isAuthenticated, identity],
  );

  const fetchReputation = useCallback(async () => {
    if (!isAuthenticated || !identity) {
      setLoading(false);
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      updateReputationActor(identity);

      try {
        const reputationData =
          await reputationCanisterService.getMyReputationScore();

        const formattedReputation: ReputationScore = {
          userId: reputationData.userId.toString(),
          trustScore: Number(reputationData.trustScore),
          trustLevel: reputationData.trustLevel.hasOwnProperty("New")
            ? "New"
            : reputationData.trustLevel.hasOwnProperty("Low")
              ? "Low"
              : reputationData.trustLevel.hasOwnProperty("Medium")
                ? "Medium"
                : reputationData.trustLevel.hasOwnProperty("High")
                  ? "High"
                  : "VeryHigh",
          completedBookings: Number(reputationData.completedBookings),
          averageRating: reputationData.averageRating
            ? Number(reputationData.averageRating[0])
            : undefined,
          detectionFlags: reputationData.detectionFlags.map(
            (flag: any) => Object.keys(flag)[0],
          ),
          lastUpdated: Number(reputationData.lastUpdated),
        };

        setReputation(formattedReputation);
      } catch (fetchError: any) {
        if (fetchError.message.includes("No reputation score found")) {
          const initialReputation =
            await reputationCanisterService.initializeMyReputation();

          const formattedReputation: ReputationScore = {
            userId: initialReputation.userId.toString(),
            trustScore: Number(initialReputation.trustScore),
            trustLevel: "New",
            completedBookings: 0,
            averageRating: undefined,
            detectionFlags: [],
            lastUpdated: Number(initialReputation.lastUpdated),
          };

          setReputation(formattedReputation);
        } else {
          throw fetchError;
        }
      }
    } catch (err: any) {
      if (
        err.message.includes("Network error") ||
        err.message.includes("fetch")
      ) {
        setError("Network error: Could not fetch reputation score");
      } else {
        setError("Could not load reputation data");
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, identity]);

  const refreshReputation = useCallback(async () => {
    await fetchReputation();
  }, [fetchReputation]);

  const forceRefreshReputation = useCallback(async () => {
    setReputation(null);
    setLoading(true);
    setError(null);
    await fetchReputation();
  }, [fetchReputation]);

  const getReputationDisplay = useCallback(() => {
    if (!reputation) return null;

    return {
      score: Math.round(reputation.trustScore),
      level: reputation.trustLevel,
      bookings: reputation.completedBookings,
      rating: reputation.averageRating,
    };
  }, [reputation]);

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  return {
    reputation,
    loading,
    error,
    refreshReputation,
    forceRefreshReputation,
    getReputationDisplay,
    fetchUserReputation,
    isAuthenticated,
  };
};
