import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  adminServiceCanister,
  FrontendSystemStats,
} from "../services/adminServiceCanister";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import { handleError, isNetworkError } from "../utils/errorUtils";
import {
  serviceCanister,
  ServiceData,
  CategoryData,
} from "../services/serviceCanister";

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

interface AdminLoadingStates {
  systemStats: boolean;
  serviceProviders: boolean;
  users: boolean;
  services: boolean;
  serviceCategories: boolean;
  bookings: boolean;
}

interface UseAdminReturn {
  loading: AdminLoadingStates;
  systemStats: FrontendSystemStats | null;
  serviceProviders: ServiceProviderData[];
  users: Profile[];
  bookings: any[];
  commissionTransactions: any[];
  services: ServiceData[];
  serviceCategories: CategoryData[];
  refreshSystemStats: (showSuccessToast?: boolean) => Promise<void>;
  refreshUsers: (showSuccessToast?: boolean) => Promise<void>;
  updateUserLockStatus: (userId: string, isLocked: boolean) => void;
  getUserLockStatus: (userId: string) => boolean;
  refreshServiceProviders: (showSuccessToast?: boolean) => Promise<void>;
  refreshServices: (showSuccessToast?: boolean) => Promise<void>;
  refreshServiceCategories: (showSuccessToast?: boolean) => Promise<void>;
  refreshBookings: (showSuccessToast?: boolean) => Promise<void>;
  getServicesWithCertificates: () => Promise<any[]>;
  getReportsFromFeedbackCanister: () => Promise<any[]>;
  refreshAll: () => Promise<void>;
}

export const useAdmin = (): UseAdminReturn => {
  const [loading, setLoading] = useState<AdminLoadingStates>({
    systemStats: false,
    serviceProviders: false,
    users: false,
    services: false,
    serviceCategories: false,
    bookings: false,
  });

  const [systemStats, setSystemStats] = useState<FrontendSystemStats | null>(
    null,
  );
  const [serviceProviders, setServiceProviders] = useState<
    ServiceProviderData[]
  >([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [serviceCategories, setServiceCategories] = useState<CategoryData[]>(
    [],
  );
  const [bookings, setBookings] = useState<any[]>([]);
  const [commissionTransactions, setCommissionTransactions] = useState<any[]>(
    [],
  );

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

  useEffect(() => {
    refreshAll();
  }, []);

  const updateLoadingState = useCallback(
    (key: keyof AdminLoadingStates, value: boolean) => {
      setLoading((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleErrorCallback = useCallback((error: unknown, context: string) => {
    handleError(error, context, toast);
  }, []);

  const refreshSystemStats = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("systemStats", true);
      try {
        const stats = await adminServiceCanister.getSystemStats();
        setSystemStats(stats);
        if (showSuccessToast) {
          toast.success("System statistics updated successfully");
        }
      } catch (error) {
        console.error("[refreshSystemStats] Error:", error);
        handleErrorCallback(error, "Failed to refresh system statistics");
      } finally {
        updateLoadingState("systemStats", false);
      }
    },
    [updateLoadingState, handleErrorCallback],
  );

  const refreshUsers = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("users", true);
      try {
        const allUsers = await adminServiceCanister.getAllUsers();
        setUsers(allUsers);

        try {
          const lockStatuses =
            await adminServiceCanister.getAllUserLockStatuses();
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
          console.warn(
            "Failed to fetch user lock statuses, continuing with cached data:",
            error,
          );
        }

        if (showSuccessToast) {
          toast.success("Users updated successfully");
        }
      } catch (error) {
        handleErrorCallback(error, "Failed to refresh users");
      } finally {
        updateLoadingState("users", false);
      }
    },
    [updateLoadingState, handleErrorCallback],
  );

  const refreshServiceProviders = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("serviceProviders", true);
      try {
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
        handleErrorCallback(error, "Failed to refresh service providers");
      } finally {
        updateLoadingState("serviceProviders", false);
      }
    },
    [updateLoadingState, handleErrorCallback],
  );

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

  const getUserLockStatus = useCallback(
    (userId: string): boolean => {
      return userLockStatus[userId] || false;
    },
    [userLockStatus],
  );

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
        handleErrorCallback(error, "Failed to refresh services");
      } finally {
        updateLoadingState("services", false);
      }
    },
    [updateLoadingState, handleErrorCallback],
  );

  const refreshBookings = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("bookings", true);
      try {
        const data = await adminServiceCanister.getBookingsData();
        setBookings(data.bookings);
        setCommissionTransactions(data.commissionTransactions);
        if (showSuccessToast) {
          toast.success(
            `Successfully loaded ${data.bookings.length} bookings and ${data.commissionTransactions.length} commission transactions`,
          );
        }
      } catch (error: any) {
        if (!isNetworkError(error)) {
          console.error("[refreshBookings] Error refreshing bookings:", error);
          handleErrorCallback(error, "Failed to refresh bookings");
        }
      } finally {
        updateLoadingState("bookings", false);
      }
    },
    [updateLoadingState, handleErrorCallback],
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
        handleErrorCallback(error, "Failed to refresh service categories");
      } finally {
        updateLoadingState("serviceCategories", false);
      }
    },
    [updateLoadingState, handleErrorCallback],
  );

  const getServicesWithCertificates = useCallback(async () => {
    try {
      const services = await adminServiceCanister.getServicesWithCertificates();
      return services;
    } catch (error) {
      handleErrorCallback(error, "Failed to get services with certificates");
      return [];
    }
  }, [handleErrorCallback]);

  const getReportsFromFeedbackCanister = useCallback(async () => {
    try {
      const { getReportsFromFeedbackCanister } = await import(
        "../services/adminServiceCanister"
      );
      const reports = await getReportsFromFeedbackCanister();
      return reports;
    } catch (error) {
      handleErrorCallback(
        error,
        "Failed to get reports from feedback canister",
      );
      return [];
    }
  }, [handleErrorCallback]);

  const refreshAll = useCallback(async () => {
    try {
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
      handleErrorCallback(error, "Failed to refresh all data");
    }
  }, [
    refreshSystemStats,
    refreshUsers,
    refreshServiceProviders,
    refreshServices,
    refreshServiceCategories,
    refreshBookings,
    handleErrorCallback,
  ]);

  useEffect(() => {
    if (bookings.length > 0 || commissionTransactions.length > 0) {
      refreshSystemStats();
    }
  }, [bookings, commissionTransactions, refreshSystemStats]);

  return {
    loading,
    systemStats,
    serviceProviders,
    users,
    services,
    serviceCategories,
    bookings,
    commissionTransactions,
    refreshSystemStats,
    refreshUsers,
    updateUserLockStatus,
    getUserLockStatus,
    refreshServiceProviders,
    refreshServices,
    refreshServiceCategories,
    refreshBookings,
    getServicesWithCertificates,
    getReportsFromFeedbackCanister,
    refreshAll,
  };
};
