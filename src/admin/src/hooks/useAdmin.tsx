import { useState, useCallback } from "react";
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

// Toast notification function (placeholder - can be replaced with actual toast library)
const showToast = (
  message: string,
  type: "success" | "error" | "info" = "info",
) => {
  // TODO: Replace with actual toast notification system
  if (type === "error") {
    console.error("Toast Error:", message);
    alert(`Error: ${message}`);
  } else if (type === "success") {
    console.log("Toast Success:", message);
    alert(`Success: ${message}`);
  } else {
    console.info("Toast Info:", message);
    alert(`Info: ${message}`);
  }
};

// Interface for service provider data (mock data structure)
export interface ServiceProviderData {
  id: string;
  name: string;
  phone: string;
  totalEarnings: number;
  pendingCommission: number;
  settledCommission: number;
  lastActivity: Date;
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

  // System Statistics
  refreshSystemStats: () => Promise<void>;

  // Service Provider Management (mock functions for now)
  refreshServiceProviders: () => Promise<void>;

  // Pending Validations
  refreshPendingValidations: () => Promise<void>;
  validatePayment: (
    orderId: string,
    approved: boolean,
    reason?: string,
  ) => Promise<void>;
  viewMediaItems: (mediaIds: string[]) => Promise<FrontendMediaItem[]>;
  getOrderWithMedia: (
    orderId: string,
  ) => Promise<{
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
}

// Mock data for service providers (will be replaced with real API calls)
const mockServiceProviders: ServiceProviderData[] = [
  {
    id: "sp1",
    name: "Juan Dela Cruz",
    phone: "+63 917 123 4567",
    totalEarnings: 15750.5,
    pendingCommission: 1250.0,
    settledCommission: 14500.5,
    lastActivity: new Date("2025-08-17"),
  },
  {
    id: "sp2",
    name: "Maria Santos",
    phone: "+63 918 234 5678",
    totalEarnings: 22300.75,
    pendingCommission: 2100.25,
    settledCommission: 20200.5,
    lastActivity: new Date("2025-08-16"),
  },
  {
    id: "sp3",
    name: "Roberto Garcia",
    phone: "+63 919 345 6789",
    totalEarnings: 8900.0,
    pendingCommission: 0.0,
    settledCommission: 8900.0,
    lastActivity: new Date("2025-08-15"),
  },
];

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
  });

  // Initialize data states
  const [systemStats, setSystemStats] = useState<FrontendSystemStats | null>(
    null,
  );
  const [serviceProviders, setServiceProviders] =
    useState<ServiceProviderData[]>(mockServiceProviders);
  const [pendingValidations, setPendingValidations] = useState<
    FrontendRemittanceOrder[]
  >([]);
  const [commissionRules, setCommissionRules] = useState<
    FrontendCommissionRule[]
  >([]);
  const [userRoles, setUserRoles] = useState<FrontendUserRoleAssignment[]>([]);
  const [systemSettings, setSystemSettings] =
    useState<FrontendSystemSettings | null>(null);

  // Helper function to handle loading state updates
  const updateLoadingState = useCallback(
    (key: keyof AdminLoadingStates, value: boolean) => {
      setLoading((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Helper function to handle errors
  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`Admin Hook Error (${context}):`, error);

    if (error instanceof AdminServiceError) {
      showToast(`${context}: ${error.message}`, "error");
    } else if (error instanceof Error) {
      showToast(`${context}: ${error.message}`, "error");
    } else {
      showToast(`${context}: An unexpected error occurred`, "error");
    }
  }, []);

  // System Statistics
  const refreshSystemStats = useCallback(async () => {
    updateLoadingState("systemStats", true);
    try {
      const stats = await adminServiceCanister.getSystemStats();
      setSystemStats(stats);
      showToast("System statistics updated successfully", "success");
    } catch (error) {
      handleError(error, "Failed to refresh system statistics");
    } finally {
      updateLoadingState("systemStats", false);
    }
  }, [updateLoadingState, handleError]);

  // Service Provider Management (mock for now)
  const refreshServiceProviders = useCallback(async () => {
    updateLoadingState("serviceProviders", true);
    try {
      // TODO: Replace with actual API call to get service providers with commission data
      // This would likely involve calling multiple services to aggregate the data
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setServiceProviders(mockServiceProviders);
      showToast("Service provider data updated successfully", "success");
    } catch (error) {
      handleError(error, "Failed to refresh service providers");
    } finally {
      updateLoadingState("serviceProviders", false);
    }
  }, [updateLoadingState, handleError]);

  // Pending Validations
  const refreshPendingValidations = useCallback(async () => {
    updateLoadingState("pendingValidations", true);
    try {
      const validations = await adminServiceCanister.getPendingValidations();
      setPendingValidations(validations);
      showToast("Pending validations updated successfully", "success");
    } catch (error) {
      handleError(error, "Failed to refresh pending validations");
    } finally {
      updateLoadingState("pendingValidations", false);
    }
  }, [updateLoadingState, handleError]);

  const validatePayment = useCallback(
    async (orderId: string, approved: boolean, reason?: string) => {
      updateLoadingState("paymentValidation", true);
      try {
        await adminServiceCanister.validatePayment(orderId, approved, reason);

        // Remove the validated order from pending validations
        setPendingValidations((prev) => prev.filter((v) => v.id !== orderId));

        const action = approved ? "approved" : "rejected";
        showToast(
          `Payment for order ${orderId} has been ${action} successfully`,
          "success",
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
          await adminServiceCanister.getRemittanceMediaItems(mediaIds);
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
        const result =
          await adminServiceCanister.getRemittanceOrderWithMedia(orderId);
        return result;
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
      showToast("Commission rules updated successfully", "success");
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
        showToast(
          `${newRules.length} commission rule(s) created successfully`,
          "success",
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
        showToast(
          `${updatedRules.length} commission rule(s) updated successfully`,
          "success",
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
        showToast(
          `Commission rule ${ruleId} (v${version}) activated successfully`,
          "success",
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
        showToast(
          `Commission rule ${ruleId} deactivated successfully`,
          "success",
        );
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
      showToast("User roles updated successfully", "success");
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
        showToast(`Admin role assigned to user ${userId}`, "success");
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
        showToast(`Role removed from user ${userId}`, "success");
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
      showToast("System settings updated successfully", "success");
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
        showToast("System settings updated successfully", "success");
      } catch (error) {
        handleError(error, "Failed to update system settings");
      } finally {
        updateLoadingState("systemSettings", false);
      }
    },
    [updateLoadingState, handleError, refreshSystemSettings],
  );

  // Utility function to refresh all data
  const refreshAll = useCallback(async () => {
    const refreshPromises = [
      refreshSystemStats(),
      refreshServiceProviders(),
      refreshPendingValidations(),
      refreshCommissionRules(),
      refreshUserRoles(),
      refreshSystemSettings(),
    ];

    try {
      await Promise.allSettled(refreshPromises);
      showToast("All admin data refreshed successfully", "success");
    } catch (error) {
      handleError(error, "Failed to refresh all data");
    }
  }, [
    refreshSystemStats,
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

    // System Statistics
    refreshSystemStats,

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
  };
};
