import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import bookingCanisterService, {
  ClientAnalytics,
} from "../services/bookingCanisterService";

/**
 * Custom hook to manage client analytics data
 */
export const useClientAnalytics = () => {
  const { isAuthenticated, identity } = useAuth();

  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (isAuthenticated && identity) {
      setLoading(true);
      setError(null);
      try {
        const clientAnalytics = await bookingCanisterService.getClientAnalytics(
          identity.getPrincipal(),
        );
        setAnalytics(clientAnalytics);
      } catch (err) {
        //console.error("Failed to fetch client analytics:", err);
        setError("Could not load your analytics data.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      setAnalytics(null);
    }
  }, [isAuthenticated, identity]);

  // Fetch analytics when authentication status changes
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /**
   * Format currency value for display
   */
  const formatCurrency = (amount: number): string => {
    return `₱${amount.toLocaleString("en-PH")}`;
  };

  /**
   * Format date for display
   */
  const formatMemberSince = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  /**
   * Get formatted statistics for display
   */
  const getFormattedStats = () => {
    if (!analytics) {
      return {
        totalBookings: "0",
        servicesCompleted: "0",
        totalSpent: "₱0",
        memberSince: "Unknown",
      };
    }

    return {
      totalBookings: analytics.totalBookings.toString(),
      servicesCompleted: analytics.servicesCompleted.toString(),
      totalSpent: formatCurrency(analytics.totalSpent),
      memberSince: formatMemberSince(analytics.memberSince),
    };
  };

  return {
    analytics,
    loading,
    error,
    fetchAnalytics,
    getFormattedStats,
  };
};

export default useClientAnalytics;
