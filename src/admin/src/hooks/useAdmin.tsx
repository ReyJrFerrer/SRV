import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  adminServiceCanister,
  AdminServiceError,
  FrontendSystemStats,
} from "../services/adminServiceCanister";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import { MediaServiceError } from "../services/mediaServiceCanister";
import {
  serviceCanister,
  ServiceData,
  CategoryData,
} from "../services/serviceCanister";

// Interface for service provider data
export interface ServiceProviderData {
  id: string;
  name: string;
  phone: string;
  totalEarnings: number;
  pendingCommission: number;
  settledCommission: number;
  lastActivity: Date;
  outstandingBalance?: number;
  pendingOrders?: number;
  overdueOrders?: number;
  totalOrdersCompleted?: number;
  averageOrderValue?: number;
  nextDeadline?: Date;
  status?: string;
}

// Granular loading states interface
interface AdminLoadingStates {
  systemStats: boolean;
  serviceProviders: boolean;
  users: boolean;
  services: boolean;
  serviceCategories: boolean;
  bookings: boolean;
}

// Admin hook return type
interface UseAdminReturn {
  // Loading states
  loading: AdminLoadingStates;

  // Data states
  systemStats: FrontendSystemStats | null;
  serviceProviders: ServiceProviderData[];
  users: Profile[];
  bookings: any[];
  commissionTransactions: any[];

  // Service data states
  services: ServiceData[];
  serviceCategories: CategoryData[];

  // System Statistics
  refreshSystemStats: (showSuccessToast?: boolean) => Promise<void>;

  // User Management
  refreshUsers: (showSuccessToast?: boolean) => Promise<void>;
  updateUserLockStatus: (userId: string, isLocked: boolean) => void;
  getUserLockStatus: (userId: string) => boolean;

  // Service Provider Management
  refreshServiceProviders: (showSuccessToast?: boolean) => Promise<void>;

  // Service Management
  refreshServices: (showSuccessToast?: boolean) => Promise<void>;
  refreshServiceCategories: (showSuccessToast?: boolean) => Promise<void>;
  refreshBookings: (showSuccessToast?: boolean) => Promise<void>;
  getServicesWithCertificates: () => Promise<any[]>;
  getReportsFromFeedbackCanister: () => Promise<any[]>;

  // Utility functions
  refreshAll: () => Promise<void>;
}

export const useAdmin = (): UseAdminReturn => {
  // Initialize loading states
  const [loading, setLoading] = useState<AdminLoadingStates>({
    systemStats: false,
    serviceProviders: false,
    users: false,
    services: false,
    serviceCategories: false,
    bookings: false,
  });

  // Initialize data states
  const [systemStats, setSystemStats] = useState<FrontendSystemStats | null>(
    null,
  );
  const [serviceProviders, setServiceProviders] = useState<
    ServiceProviderData[]
  >([]);
  const [users, setUsers] = useState<Profile[]>([]);

  // Service data states
  const [services, setServices] = useState<ServiceData[]>([]);
  const [serviceCategories, setServiceCategories] = useState<CategoryData[]>(
    [],
  );
  const [bookings, setBookings] = useState<any[]>([]);
  const [commissionTransactions, setCommissionTransactions] = useState<any[]>(
    [],
  );

  // Initialize userLockStatus from localStorage
  const [userLockStatus, setUserLockStatus] = useState<Record<string, boolean>>(
    () => {
      try {
        const saved = localStorage.getItem("adminUserLockStatus");
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    },
  );

  // Initial data loading
  useEffect(() => {
    console.log("🚀 [useAdmin] Initial data loading...");
    refreshAll();
  }, []);

  // Helper function to handle loading state updates
  const updateLoadingState = useCallback(
    (key: keyof AdminLoadingStates, value: boolean) => {
      setLoading((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Helper function to handle errors
  const handleError = useCallback((error: unknown, context: string) => {
    if (
      error instanceof AdminServiceError ||
      error instanceof MediaServiceError
    ) {
      toast.error(`${context}: ${error.message}`);
    } else if (error instanceof Error) {
      toast.error(`${context}: ${error.message}`);
    } else {
      toast.error(`${context}: An unexpected error occurred`);
    }
  }, []);

  // System Statistics
  const refreshSystemStats = useCallback(
    async (showSuccessToast = false) => {
      console.log("🔄 [refreshSystemStats] Starting system stats refresh...");
      updateLoadingState("systemStats", true);
      try {
        const stats = await adminServiceCanister.getSystemStats();
        console.log("🔄 [refreshSystemStats] Received stats:", stats);
        setSystemStats(stats);
        if (showSuccessToast) {
          toast.success("System statistics updated successfully");
        }
      } catch (error) {
        console.error("❌ [refreshSystemStats] Error:", error);
        handleError(error, "Failed to refresh system statistics");
      } finally {
        updateLoadingState("systemStats", false);
      }
    },
    [updateLoadingState, handleError],
  );

  // User Management
  const refreshUsers = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("users", true);
      try {
        const allUsers = await adminServiceCanister.getAllUsers();
        setUsers(allUsers);

        // Also fetch and sync lock statuses from Firestore
        try {
          const lockStatuses =
            await adminServiceCanister.getAllUserLockStatuses();
          // Batch update localStorage with lock statuses from Firestore
          setUserLockStatus((prevStatus) => {
            const newStatus = { ...prevStatus, ...lockStatuses };
            try {
              localStorage.setItem(
                "adminUserLockStatus",
                JSON.stringify(newStatus),
              );
            } catch (error) {
              console.error(
                "Failed to save lock statuses to localStorage:",
                error,
              );
            }
            return newStatus;
          });
        } catch (error) {
          // If fetching lock statuses fails, log but don't fail the whole refresh
          console.warn(
            "Failed to fetch user lock statuses, continuing with cached data:",
            error,
          );
        }

        if (showSuccessToast) {
          toast.success("Users updated successfully");
        }
      } catch (error) {
        handleError(error, "Failed to refresh users");
      } finally {
        updateLoadingState("users", false);
      }
    },
    [updateLoadingState, handleError],
  );

  // Service Provider Management
  const refreshServiceProviders = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("serviceProviders", true);
      try {
        // Get service providers from users with ServiceProvider role
        const allUsers = await adminServiceCanister.getAllUsers();
        const providers = allUsers
          .filter((user) => {
            if (typeof user.activeRole === "string") {
              return user.activeRole === "ServiceProvider";
            } else if (user.activeRole && typeof user.activeRole === "object") {
              return "ServiceProvider" in user.activeRole;
            }
            return false;
          })
          .map((user) => ({
            id: user.id.toString(),
            name: user.name,
            phone: user.phone,
            totalEarnings: 0,
            pendingCommission: 0,
            settledCommission: 0,
            lastActivity: user.updatedAt
              ? new Date(Number(user.updatedAt) / 1000000)
              : new Date(),
          }));
        setServiceProviders(providers);
        if (showSuccessToast) {
          toast.success("Service provider data updated successfully");
        }
      } catch (error) {
        handleError(error, "Failed to refresh service providers");
      } finally {
        updateLoadingState("serviceProviders", false);
      }
    },
    [updateLoadingState, handleError],
  );

  // Update user lock status in local state and localStorage
  const updateUserLockStatus = useCallback(
    (userId: string, isLocked: boolean) => {
      setUserLockStatus((prevStatus) => {
        const newStatus = { ...prevStatus, [userId]: isLocked };

        try {
          localStorage.setItem(
            "adminUserLockStatus",
            JSON.stringify(newStatus),
          );
        } catch (error) {
          console.error("Failed to save lock status to localStorage:", error);
        }

        return newStatus;
      });
    },
    [],
  );

  // Get user lock status
  const getUserLockStatus = useCallback(
    (userId: string): boolean => {
      return userLockStatus[userId] || false;
    },
    [userLockStatus],
  );

  // Service Management Functions
  const refreshServices = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("services", true);
      try {
        const services = await serviceCanister.getAllServices();
        setServices(services);
        if (showSuccessToast) {
          toast.success(`Successfully loaded ${services.length} services`);
        }
      } catch (error) {
        handleError(error, "Failed to refresh services");
      } finally {
        updateLoadingState("services", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const refreshBookings = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("bookings", true);
      try {
        console.log("🔍 [refreshBookings] Calling getBookingsData...");
        const data = await adminServiceCanister.getBookingsData();
        console.log(
          "🔍 [refreshBookings] Raw bookings data from service:",
          data.bookings,
        );
        console.log(
          "🔍 [refreshBookings] Raw commission transactions:",
          data.commissionTransactions,
        );
        console.log(
          "🔍 [refreshBookings] Bookings length:",
          data.bookings?.length || 0,
        );
        console.log(
          "🔍 [refreshBookings] Commission transactions length:",
          data.commissionTransactions?.length || 0,
        );
        setBookings(data.bookings);
        setCommissionTransactions(data.commissionTransactions);
        if (showSuccessToast) {
          toast.success(
            `Successfully loaded ${data.bookings.length} bookings and ${data.commissionTransactions.length} commission transactions`,
          );
        }
      } catch (error: any) {
        // Suppress CORS/network errors - they're already handled gracefully in getBookingsData
        const isNetworkError =
          error?.code === "ERR_FAILED" ||
          error?.message?.includes("CORS") ||
          error?.name === "FirebaseError" ||
          (error?.code && String(error.code).includes("internal"));

        if (!isNetworkError) {
          console.error(
            "❌ [refreshBookings] Error refreshing bookings:",
            error,
          );
          handleError(error, "Failed to refresh bookings");
        }
        // Data gracefully falls back to systemStats, so no action needed
      } finally {
        updateLoadingState("bookings", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const refreshServiceCategories = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("serviceCategories", true);
      try {
        const categories = await serviceCanister.getAllCategories();
        setServiceCategories(categories);
        if (showSuccessToast) {
          toast.success(
            `Successfully loaded ${categories.length} service categories`,
          );
        }
      } catch (error) {
        handleError(error, "Failed to refresh service categories");
      } finally {
        updateLoadingState("serviceCategories", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const getServicesWithCertificates = useCallback(async () => {
    try {
      const services = await adminServiceCanister.getServicesWithCertificates();
      return services;
    } catch (error) {
      handleError(error, "Failed to get services with certificates");
      return [];
    }
  }, [handleError]);

  const getReportsFromFeedbackCanister = useCallback(async () => {
    try {
      const { getReportsFromFeedbackCanister } = await import(
        "../services/adminServiceCanister"
      );
      const reports = await getReportsFromFeedbackCanister();
      return reports;
    } catch (error) {
      handleError(error, "Failed to get reports from feedback canister");
      return [];
    }
  }, [handleError]);

  // Utility function to refresh all data
  const refreshAll = useCallback(async () => {
    try {
      // First, refresh all data in parallel (except system stats)
      const refreshPromises = [
        refreshUsers(),
        refreshServiceProviders(),
        refreshServices(),
        refreshServiceCategories(),
        refreshBookings(),
      ];

      await Promise.allSettled(refreshPromises);
      await refreshSystemStats();

      toast.success("All admin data refreshed successfully");
    } catch (error) {
      handleError(error, "Failed to refresh all data");
    }
  }, [
    refreshSystemStats,
    refreshUsers,
    refreshServiceProviders,
    refreshServices,
    refreshServiceCategories,
    refreshBookings,
    handleError,
  ]);

  // Refresh system stats when bookings change
  useEffect(() => {
    if (bookings.length > 0 || commissionTransactions.length > 0) {
      console.log(
        "🔄 [useAdmin] Bookings or commission transactions changed, refreshing system stats...",
      );
      refreshSystemStats();
    }
  }, [bookings, commissionTransactions, refreshSystemStats]);

  return {
    // Loading states
    loading,

    // Data states
    systemStats,
    serviceProviders,
    users,

    // Service data states
    services,
    serviceCategories,
    bookings,
    commissionTransactions,

    // System Statistics
    refreshSystemStats,

    // User Management
    refreshUsers,
    updateUserLockStatus,
    getUserLockStatus,

    // Service Provider Management
    refreshServiceProviders,

    // Service Management
    refreshServices,
    refreshServiceCategories,
    refreshBookings,
    getServicesWithCertificates,
    getReportsFromFeedbackCanister,

    // Utility functions
    refreshAll,
  };
};
