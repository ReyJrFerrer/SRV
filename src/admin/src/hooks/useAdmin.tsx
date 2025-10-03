import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  adminServiceCanister,
  AdminServiceError,
  FrontendCommissionRule,
  FrontendCommissionRuleDraft,
  FrontendSystemSettings,
  FrontendUserRoleAssignment,
  FrontendRemittanceOrder,
  FrontendMediaItem,
  FrontendSystemStats,
} from "../services/adminServiceCanister";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import {
  remittanceServiceCanister,
  RemittanceServiceError,
} from "../services/remittanceServiceCanister";
import {
  mediaServiceCanister,
  MediaServiceError,
} from "../services/mediaServiceCanister";

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
}

// Granular loading states interface
interface AdminLoadingStates {
  systemStats: boolean;
  serviceProviders: boolean;
  pendingValidations: boolean;
  commissionRules: boolean;
  userRoles: boolean;
  systemSettings: boolean;
  paymentValidation: boolean;
  mediaItems: boolean;
  users: boolean;
}

// Admin hook return type
interface UseAdminReturn {
  // Loading states
  loading: AdminLoadingStates;

  // Data states
  systemStats: FrontendSystemStats | null;
  serviceProviders: ServiceProviderData[];
  pendingValidations: FrontendRemittanceOrder[];
  commissionRules: FrontendCommissionRule[];
  userRoles: FrontendUserRoleAssignment[];
  systemSettings: FrontendSystemSettings | null;
  users: Profile[];

  // System Statistics
  refreshSystemStats: (showSuccessToast?: boolean) => Promise<void>;

  // User Management
  refreshUsers: (showSuccessToast?: boolean) => Promise<void>;
  updateUserLockStatus: (userId: string, isLocked: boolean) => void;
  getUserLockStatus: (userId: string) => boolean;

  // Service Provider Management
  refreshServiceProviders: (showSuccessToast?: boolean) => Promise<void>;

  // Pending Validations
  refreshPendingValidations: (showSuccessToast?: boolean) => Promise<void>;
  validatePayment: (
    orderId: string,
    approved: boolean,
    reason?: string,
  ) => Promise<void>;
  viewMediaItems: (mediaIds: string[]) => Promise<FrontendMediaItem[]>;
  getOrderWithMedia: (orderId: string) => Promise<{
    order: FrontendRemittanceOrder;
    mediaItems: FrontendMediaItem[];
  }>;

  // Commission Rules Management
  refreshCommissionRules: () => Promise<void>;
  createCommissionRules: (
    rules: FrontendCommissionRuleDraft[],
  ) => Promise<void>;
  updateCommissionRules: (
    rules: FrontendCommissionRuleDraft[],
  ) => Promise<void>;
  activateRule: (ruleId: string, version: number) => Promise<void>;
  deactivateRule: (ruleId: string) => Promise<void>;
  getCommissionRule: (ruleId: string) => Promise<FrontendCommissionRule | null>;

  // User Role Management
  refreshUserRoles: () => Promise<void>;
  assignAdminRole: (userId: string, scope?: string) => Promise<void>;
  removeUserRole: (userId: string) => Promise<void>;
  checkAdminRole: (userId: string) => Promise<boolean>;
  getUserRole: (userId: string) => Promise<FrontendUserRoleAssignment | null>;

  // System Settings Management
  refreshSystemSettings: () => Promise<void>;
  updateSystemSettings: (settings: {
    corporateGcashAccount?: string;
    settlementDeadlineHours?: number;
    maxCommissionRateBps?: number;
    minOrderAmount?: number;
    maxOrderAmount?: number;
  }) => Promise<void>;

  // Utility functions
  refreshAll: () => Promise<void>;
  initializeCanisterReferences: () => Promise<void>;
}

export const useAdmin = (): UseAdminReturn => {
  // Initialize loading states
  const [loading, setLoading] = useState<AdminLoadingStates>({
    systemStats: false,
    serviceProviders: false,
    pendingValidations: false,
    commissionRules: false,
    userRoles: false,
    systemSettings: false,
    paymentValidation: false,
    mediaItems: false,
    users: false,
  });

  // Initialize data states
  const [systemStats, setSystemStats] = useState<FrontendSystemStats | null>(
    null,
  );
  const [serviceProviders, setServiceProviders] = useState<
    ServiceProviderData[]
  >([]);
  const [pendingValidations, setPendingValidations] = useState<
    FrontendRemittanceOrder[]
  >([]);
  const [commissionRules, setCommissionRules] = useState<
    FrontendCommissionRule[]
  >([]);
  const [userRoles, setUserRoles] = useState<FrontendUserRoleAssignment[]>([]);
  const [systemSettings, setSystemSettings] =
    useState<FrontendSystemSettings | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);

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

  // System Statistics - silent by default
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

  // Pending Validations
  const refreshPendingValidations = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("pendingValidations", true);
      try {
        const validations =
          await remittanceServiceCanister.getPendingValidations();
        setPendingValidations(validations);
        if (showSuccessToast) {
          toast.success("Pending validations updated successfully");
        }
      } catch (error) {
        handleError(error, "Failed to refresh pending validations");
        // Set empty array on error
        setPendingValidations([]);
      } finally {
        updateLoadingState("pendingValidations", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const validatePayment = useCallback(
    async (orderId: string, approved: boolean, reason?: string) => {
      updateLoadingState("paymentValidation", true);
      try {
        await remittanceServiceCanister.validatePaymentByAdmin(
          orderId,
          approved,
          reason,
        );

        // Remove the validated order from pending validations
        setPendingValidations((prev) => prev.filter((v) => v.id !== orderId));

        const action = approved ? "approved" : "rejected";
        toast.success(
          `Payment for order ${orderId} has been ${action} successfully`,
        );
      } catch (error) {
        handleError(error, "Failed to validate payment");
      } finally {
        updateLoadingState("paymentValidation", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const viewMediaItems = useCallback(
    async (mediaIds: string[]): Promise<FrontendMediaItem[]> => {
      updateLoadingState("mediaItems", true);
      try {
        const mediaItems =
          await mediaServiceCanister.getRemittanceMediaItems(mediaIds);
        return mediaItems;
      } catch (error) {
        handleError(error, "Failed to load media items");
        return [];
      } finally {
        updateLoadingState("mediaItems", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const getOrderWithMedia = useCallback(
    async (orderId: string) => {
      updateLoadingState("mediaItems", true);
      try {
        // Get the order from remittance service
        const order = await remittanceServiceCanister.getOrder(orderId);
        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }

        // Get the media items from media service
        const mediaItems = await mediaServiceCanister.getRemittanceMediaItems(
          order.paymentProofMediaIds,
        );

        return { order, mediaItems };
      } catch (error) {
        handleError(error, "Failed to load order with media");
        throw error;
      } finally {
        updateLoadingState("mediaItems", false);
      }
    },
    [updateLoadingState, handleError],
  );

  // Commission Rules Management
  const refreshCommissionRules = useCallback(async () => {
    updateLoadingState("commissionRules", true);
    try {
      const rules = await adminServiceCanister.listRules();
      setCommissionRules(rules);
      toast.success("Commission rules updated successfully");
    } catch (error) {
      handleError(error, "Failed to refresh commission rules");
    } finally {
      updateLoadingState("commissionRules", false);
    }
  }, [updateLoadingState, handleError]);

  const createCommissionRules = useCallback(
    async (rules: FrontendCommissionRuleDraft[]) => {
      updateLoadingState("commissionRules", true);
      try {
        const newRules =
          await adminServiceCanister.upsertCommissionRules(rules);
        setCommissionRules((prev) => [...prev, ...newRules]);
        toast.success(
          `${newRules.length} commission rule(s) created successfully`,
        );
      } catch (error) {
        handleError(error, "Failed to create commission rules");
      } finally {
        updateLoadingState("commissionRules", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const updateCommissionRules = useCallback(
    async (rules: FrontendCommissionRuleDraft[]) => {
      updateLoadingState("commissionRules", true);
      try {
        const updatedRules =
          await adminServiceCanister.upsertCommissionRules(rules);
        // Update existing rules in state
        setCommissionRules((prev) => {
          const updatedState = [...prev];
          updatedRules.forEach((updatedRule) => {
            const index = updatedState.findIndex(
              (r) => r.id === updatedRule.id,
            );
            if (index !== -1) {
              updatedState[index] = updatedRule;
            }
          });
          return updatedState;
        });
        toast.success(
          `${updatedRules.length} commission rule(s) updated successfully`,
        );
      } catch (error) {
        handleError(error, "Failed to update commission rules");
      } finally {
        updateLoadingState("commissionRules", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const activateRule = useCallback(
    async (ruleId: string, version: number) => {
      updateLoadingState("commissionRules", true);
      try {
        await adminServiceCanister.activateRule(ruleId, version);
        // Refresh the rules to get updated activation status
        await refreshCommissionRules();
        toast.success(
          `Commission rule ${ruleId} (v${version}) activated successfully`,
        );
      } catch (error) {
        handleError(error, "Failed to activate commission rule");
      } finally {
        updateLoadingState("commissionRules", false);
      }
    },
    [updateLoadingState, handleError, refreshCommissionRules],
  );

  const deactivateRule = useCallback(
    async (ruleId: string) => {
      updateLoadingState("commissionRules", true);
      try {
        await adminServiceCanister.deactivateRule(ruleId);
        // Update the rule status in state
        setCommissionRules((prev) =>
          prev.map((rule) =>
            rule.id === ruleId ? { ...rule, isActive: false } : rule,
          ),
        );
        toast.success(`Commission rule ${ruleId} deactivated successfully`);
      } catch (error) {
        handleError(error, "Failed to deactivate commission rule");
      } finally {
        updateLoadingState("commissionRules", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const getCommissionRule = useCallback(
    async (ruleId: string): Promise<FrontendCommissionRule | null> => {
      updateLoadingState("commissionRules", true);
      try {
        const rule = await adminServiceCanister.getRule(ruleId);
        return rule;
      } catch (error) {
        handleError(error, "Failed to get commission rule");
        return null;
      } finally {
        updateLoadingState("commissionRules", false);
      }
    },
    [updateLoadingState, handleError],
  );

  // User Role Management
  const refreshUserRoles = useCallback(async () => {
    updateLoadingState("userRoles", true);
    try {
      const roles = await adminServiceCanister.listUserRoles();
      setUserRoles(roles);
      toast.success("User roles updated successfully");
    } catch (error) {
      handleError(error, "Failed to refresh user roles");
    } finally {
      updateLoadingState("userRoles", false);
    }
  }, [updateLoadingState, handleError]);

  const assignAdminRole = useCallback(
    async (userId: string, scope?: string) => {
      updateLoadingState("userRoles", true);
      try {
        await adminServiceCanister.assignRole(userId, scope);
        // Refresh user roles to get updated list
        await refreshUserRoles();
        toast.success(`Admin role assigned to user ${userId}`);
      } catch (error) {
        handleError(error, "Failed to assign admin role");
      } finally {
        updateLoadingState("userRoles", false);
      }
    },
    [updateLoadingState, handleError, refreshUserRoles],
  );

  const removeUserRole = useCallback(
    async (userId: string) => {
      updateLoadingState("userRoles", true);
      try {
        await adminServiceCanister.removeRole(userId);
        // Remove the user from state
        setUserRoles((prev) => prev.filter((role) => role.userId !== userId));
        toast.success(`Role removed from user ${userId}`);
      } catch (error) {
        handleError(error, "Failed to remove user role");
      } finally {
        updateLoadingState("userRoles", false);
      }
    },
    [updateLoadingState, handleError],
  );

  const checkAdminRole = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        return await adminServiceCanister.hasAdminRole(userId);
      } catch (error) {
        handleError(error, "Failed to check admin role");
        return false;
      }
    },
    [handleError],
  );

  const getUserRole = useCallback(
    async (userId: string): Promise<FrontendUserRoleAssignment | null> => {
      try {
        return await adminServiceCanister.getUserRole(userId);
      } catch (error) {
        handleError(error, "Failed to get user role");
        return null;
      }
    },
    [handleError],
  );

  // System Settings Management
  const refreshSystemSettings = useCallback(async () => {
    updateLoadingState("systemSettings", true);
    try {
      const settings = await adminServiceCanister.getSettings();
      setSystemSettings(settings);
      toast.success("System settings updated successfully");
    } catch (error) {
      handleError(error, "Failed to refresh system settings");
    } finally {
      updateLoadingState("systemSettings", false);
    }
  }, [updateLoadingState, handleError]);

  const updateSystemSettings = useCallback(
    async (settings: {
      corporateGcashAccount?: string;
      settlementDeadlineHours?: number;
      maxCommissionRateBps?: number;
      minOrderAmount?: number;
      maxOrderAmount?: number;
    }) => {
      updateLoadingState("systemSettings", true);
      try {
        await adminServiceCanister.setSettings(settings);
        // Refresh settings to get updated values
        await refreshSystemSettings();
        toast.success("System settings updated successfully");
      } catch (error) {
        handleError(error, "Failed to update system settings");
      } finally {
        updateLoadingState("systemSettings", false);
      }
    },
    [updateLoadingState, handleError, refreshSystemSettings],
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

  // Initialize canister references
  const initializeCanisterReferences = useCallback(async () => {
    try {
      await adminServiceCanister.setCanisterReferences();
    } catch (error) {}
  }, []);

  // Utility function to refresh all data
  const refreshAll = useCallback(async () => {
    const refreshPromises = [
      refreshSystemStats(),
      refreshUsers(),
      refreshServiceProviders(),
      refreshPendingValidations(),
      refreshCommissionRules(),
      refreshUserRoles(),
      refreshSystemSettings(),
    ];

    try {
      await Promise.allSettled(refreshPromises);
      toast.success("All admin data refreshed successfully");
    } catch (error) {
      handleError(error, "Failed to refresh all data");
    }
  }, [
    refreshSystemStats,
    refreshUsers,
    refreshServiceProviders,
    refreshPendingValidations,
    refreshCommissionRules,
    refreshUserRoles,
    refreshSystemSettings,
    handleError,
  ]);

  return {
    // Loading states
    loading,

    // Data states
    systemStats,
    serviceProviders,
    pendingValidations,
    commissionRules,
    userRoles,
    systemSettings,
    users,

    // System Statistics
    refreshSystemStats,

    // User Management
    refreshUsers,
    updateUserLockStatus,
    getUserLockStatus,

    // Service Provider Management
    refreshServiceProviders,

    // Pending Validations
    refreshPendingValidations,
    validatePayment,
    viewMediaItems,
    getOrderWithMedia,

    // Commission Rules Management
    refreshCommissionRules,
    createCommissionRules,
    updateCommissionRules,
    activateRule,
    deactivateRule,
    getCommissionRule,

    // User Role Management
    refreshUserRoles,
    assignAdminRole,
    removeUserRole,
    checkAdminRole,
    getUserRole,

    // System Settings Management
    refreshSystemSettings,
    updateSystemSettings,

    // Utility functions
    refreshAll,
    initializeCanisterReferences,
  };
};
