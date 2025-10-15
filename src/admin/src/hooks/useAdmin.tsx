import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  adminServiceCanister,
  AdminServiceError,
  FrontendSystemStats,
} from "../services/adminServiceCanister";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import {
  remittanceServiceCanister,
  RemittanceServiceError,
  ServiceProviderData as RemittanceServiceProviderData,
  FrontendRemittanceOrder as RemittanceOrder,
  RemittanceOrdersPage,
} from "../services/remittanceServiceCanister";
import {
  MediaServiceError,
} from "../services/mediaServiceCanister";
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
  remittanceOrders: boolean;
  remittanceProviders: boolean;
  remittanceStats: boolean;
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

  // Remittance data states
  remittanceOrders: RemittanceOrder[];
  remittanceProviders: RemittanceServiceProviderData[];
  remittanceStats: {
    totalOrders: number;
    totalSettledOrders: number;
    totalPendingOrders: number;
    totalCommissionPaid: number;
    totalServiceAmount: number;
    totalOverdueOrders: number;
    averageOrderValue: number;
    averageCommissionRate: number;
  } | null;

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


  // Remittance Management
  refreshRemittanceOrders: (showSuccessToast?: boolean) => Promise<void>;
  refreshRemittanceProviders: (showSuccessToast?: boolean) => Promise<void>;
  refreshRemittanceStats: (showSuccessToast?: boolean) => Promise<void>;

  // Service Management
  refreshServices: (showSuccessToast?: boolean) => Promise<void>;
  refreshServiceCategories: (showSuccessToast?: boolean) => Promise<void>;
  refreshBookings: (showSuccessToast?: boolean) => Promise<void>;
  getServicesWithCertificates: () => Promise<any[]>;
  getReportsFromFeedbackCanister: () => Promise<any[]>;
  queryRemittanceOrders: (
    filter?: {
      status?: (
        | "AwaitingPayment"
        | "PaymentSubmitted"
        | "PaymentValidated"
        | "Cancelled"
        | "Settled"
      )[];
      serviceProviderId?: string;
      fromDate?: Date;
      toDate?: Date;
    },
    page?: {
      cursor?: string;
      size?: number;
    },
  ) => Promise<RemittanceOrdersPage>;
  getRemittanceOrder: (orderId: string) => Promise<RemittanceOrder | null>;
  cancelRemittanceOrder: (orderId: string) => Promise<void>;

  // Utility functions
  refreshAll: () => Promise<void>;
}

export const useAdmin = (): UseAdminReturn => {
  // Initialize loading states
  const [loading, setLoading] = useState<AdminLoadingStates>({
    systemStats: false,
    serviceProviders: false,
    users: false,
    remittanceOrders: false,
    remittanceProviders: false,
    remittanceStats: false,
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

  // Remittance data states
  const [remittanceOrders, setRemittanceOrders] = useState<RemittanceOrder[]>(
    [],
  );
  const [remittanceProviders, setRemittanceProviders] = useState<
    RemittanceServiceProviderData[]
  >([]);
  const [remittanceStats, setRemittanceStats] = useState<{
    totalOrders: number;
    totalSettledOrders: number;
    totalPendingOrders: number;
    totalCommissionPaid: number;
    totalServiceAmount: number;
    totalOverdueOrders: number;
    averageOrderValue: number;
    averageCommissionRate: number;
  } | null>(null);

  // Service data states
  const [services, setServices] = useState<ServiceData[]>([]);
  const [serviceCategories, setServiceCategories] = useState<CategoryData[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [commissionTransactions, setCommissionTransactions] = useState<any[]>([]);

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
      error instanceof RemittanceServiceError ||
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
        const providers =
          await remittanceServiceCanister.getAllServiceProviders();
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

  // Remittance Management Functions
  const refreshRemittanceOrders = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("remittanceOrders", true);
      try {
        console.log("Calling queryOrders...");
        const ordersPage = await remittanceServiceCanister.queryOrders();
        console.log("Received remittance orders:", ordersPage);
        setRemittanceOrders(ordersPage.items);
        if (showSuccessToast) {
          toast.success("Remittance orders refreshed successfully");
        }
      } catch (error) {
        console.error("Error refreshing remittance orders:", error);
        handleError(error, "Failed to refresh remittance orders");
      } finally {
        updateLoadingState("remittanceOrders", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const refreshRemittanceProviders = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("remittanceProviders", true);
      try {
        console.log("Calling getAllServiceProviders...");
        const providers = await remittanceServiceCanister.getAllServiceProviders();
        console.log("Received remittance providers:", providers);
        setRemittanceProviders(providers);
        if (showSuccessToast) {
          toast.success("Remittance providers refreshed successfully");
        }
      } catch (error) {
        console.error("Error refreshing remittance providers:", error);
        handleError(error, "Failed to refresh remittance providers");
      } finally {
        updateLoadingState("remittanceProviders", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const refreshRemittanceStats = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("remittanceStats", true);
      try {
        console.log("Calling getSystemRemittanceStats...");
        const stats = await remittanceServiceCanister.getSystemRemittanceStats();
        console.log("Received remittance stats:", stats);
        setRemittanceStats(stats);
        if (showSuccessToast) {
          toast.success("Remittance statistics refreshed successfully");
        }
      } catch (error) {
        console.error("Error refreshing remittance stats:", error);
        handleError(error, "Failed to refresh remittance statistics");
      } finally {
        updateLoadingState("remittanceStats", false);
      }
    },
    [updateLoadingState, handleError],
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
        console.log("🔍 [refreshBookings] Raw bookings data from service:", data.bookings);
        console.log("🔍 [refreshBookings] Raw commission transactions:", data.commissionTransactions);
        console.log("🔍 [refreshBookings] Bookings length:", data.bookings?.length || 0);
        console.log("🔍 [refreshBookings] Commission transactions length:", data.commissionTransactions?.length || 0);
        setBookings(data.bookings);
        setCommissionTransactions(data.commissionTransactions);
        if (showSuccessToast) {
          toast.success(`Successfully loaded ${data.bookings.length} bookings and ${data.commissionTransactions.length} commission transactions`);
        }
      } catch (error) {
        console.error("❌ [refreshBookings] Error refreshing bookings:", error);
        handleError(error, "Failed to refresh bookings");
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
          toast.success(`Successfully loaded ${categories.length} service categories`);
        }
      } catch (error) {
        handleError(error, "Failed to refresh service categories");
      } finally {
        updateLoadingState("serviceCategories", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const getServicesWithCertificates = useCallback(
    async () => {
      try {
        const services = await adminServiceCanister.getServicesWithCertificates();
        return services;
      } catch (error) {
        handleError(error, "Failed to get services with certificates");
        return [];
      }
    },
    [handleError],
  );

  const getReportsFromFeedbackCanister = useCallback(
    async () => {
      try {
        const { getReportsFromFeedbackCanister } = await import("../services/adminServiceCanister");
        const reports = await getReportsFromFeedbackCanister();
        return reports;
      } catch (error) {
        handleError(error, "Failed to get reports from feedback canister");
        return [];
      }
    },
    [handleError],
  );

  const queryRemittanceOrders = useCallback(
    async (
      filter?: {
        status?: (
          | "AwaitingPayment"
          | "PaymentSubmitted"
          | "PaymentValidated"
          | "Cancelled"
          | "Settled"
        )[];
        serviceProviderId?: string;
        fromDate?: Date;
        toDate?: Date;
      },
      page?: {
        cursor?: string;
        size?: number;
      },
    ) => {
      try {
        return await remittanceServiceCanister.queryOrders(filter as any, page);
      } catch (error) {
        handleError(error, "Failed to query remittance orders");
        throw error;
      }
    },
    [handleError],
  );

  const getRemittanceOrder = useCallback(
    async (orderId: string) => {
      try {
        return await remittanceServiceCanister.getOrder(orderId);
      } catch (error) {
        handleError(error, "Failed to get remittance order");
        throw error;
      }
    },
    [handleError],
  );


  const cancelRemittanceOrder = useCallback(
    async (orderId: string) => {
      try {
        await remittanceServiceCanister.cancelOrder(orderId);
        await refreshRemittanceOrders();
        toast.success("Order cancelled successfully");
      } catch (error) {
        handleError(error, "Failed to cancel order");
      }
    },
    [handleError, refreshRemittanceOrders],
  );




  // Utility function to refresh all data
  const refreshAll = useCallback(async () => {
    try {
      // First, refresh all data in parallel (except system stats)
      const refreshPromises = [
        refreshUsers(),
        refreshServiceProviders(),
        refreshRemittanceOrders(),
        refreshRemittanceProviders(),
        refreshRemittanceStats(),
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
    refreshRemittanceOrders,
    refreshRemittanceProviders,
    refreshRemittanceStats,
    refreshServices,
    refreshServiceCategories,
    refreshBookings,
    handleError,
  ]);

  // Refresh system stats when bookings change
  useEffect(() => {
    if (bookings.length > 0 || commissionTransactions.length > 0) {
      console.log("🔄 [useAdmin] Bookings or commission transactions changed, refreshing system stats...");
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

    // Remittance data states
    remittanceOrders,
    remittanceProviders,
    remittanceStats,

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


    // Remittance Management
    refreshRemittanceOrders,
    refreshRemittanceProviders,
    refreshRemittanceStats,
    queryRemittanceOrders,
    getRemittanceOrder,
    cancelRemittanceOrder,

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
