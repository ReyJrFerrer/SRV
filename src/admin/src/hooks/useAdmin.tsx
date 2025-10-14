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
  ServiceProviderData as RemittanceServiceProviderData,
  FrontendRemittanceOrder as RemittanceOrder,
  FrontendProviderDashboard,
  FrontendProviderAnalytics,
  FrontendSettlementInstruction,
  RemittanceOrdersPage,
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
  remittanceOrders: boolean;
  remittanceProviders: boolean;
  remittanceStats: boolean;
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

  // Remittance Management
  refreshRemittanceOrders: (showSuccessToast?: boolean) => Promise<void>;
  refreshRemittanceProviders: (showSuccessToast?: boolean) => Promise<void>;
  refreshRemittanceStats: (showSuccessToast?: boolean) => Promise<void>;
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
  validateRemittancePayment: (
    orderId: string,
    approved: boolean,
    reason?: string,
  ) => Promise<void>;
  cancelRemittanceOrder: (orderId: string) => Promise<void>;
  getProviderDashboard: (
    providerId: string,
  ) => Promise<FrontendProviderDashboard>;
  getProviderAnalytics: (
    providerId: string,
    fromDate?: Date,
    toDate?: Date,
  ) => Promise<FrontendProviderAnalytics>;
  generateSettlementInstruction: (
    orderId: string,
  ) => Promise<FrontendSettlementInstruction>;

  // Utility functions
  refreshAll: () => Promise<void>;
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
    remittanceOrders: false,
    remittanceProviders: false,
    remittanceStats: false,
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

  // Remittance Management Functions
  const refreshRemittanceOrders = useCallback(
    async (showSuccessToast = false) => {
      updateLoadingState("remittanceOrders", true);
      try {
        // Mock data for remittance orders
        const mockOrders: RemittanceOrder[] = [
          {
            id: "order-001",
            serviceProviderId: "provider-001",
            serviceType: "cat-001",
            amount: 250000, // ₱2,500
            commissionAmount: 7500, // ₱75
            paymentMethod: "CashOnHand",
            status: "AwaitingPayment",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            paymentSubmittedAt: undefined,
            paymentProofMediaIds: [],
            commissionRuleId: "rule-default-commission",
            commissionVersion: 1,
            updatedAt: new Date(),
          },
          {
            id: "order-002",
            serviceProviderId: "provider-002",
            serviceType: "cat-002",
            amount: 150000, // ₱1,500
            commissionAmount: 4500, // ₱45
            paymentMethod: "CashOnHand",
            status: "PaymentSubmitted",
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            paymentSubmittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            paymentProofMediaIds: ["media-001", "media-002"],
            commissionRuleId: "rule-default-commission",
            commissionVersion: 1,
            updatedAt: new Date(),
          },
          {
            id: "order-003",
            serviceProviderId: "provider-003",
            serviceType: "cat-003",
            amount: 500000, // ₱5,000
            commissionAmount: 15000, // ₱150
            paymentMethod: "CashOnHand",
            status: "PaymentValidated",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            paymentSubmittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            paymentProofMediaIds: ["media-003"],
            commissionRuleId: "rule-premium-services",
            commissionVersion: 1,
            updatedAt: new Date(),
          },
          {
            id: "order-004",
            serviceProviderId: "provider-001",
            serviceType: "cat-004",
            amount: 80000, // ₱800
            commissionAmount: 2400, // ₱24
            paymentMethod: "CashOnHand",
            status: "AwaitingPayment",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            paymentSubmittedAt: undefined,
            paymentProofMediaIds: [],
            commissionRuleId: "rule-default-commission",
            commissionVersion: 1,
            updatedAt: new Date(),
          },
          {
            id: "order-005",
            serviceProviderId: "provider-004",
            serviceType: "cat-005",
            amount: 1200000, // ₱12,000
            commissionAmount: 36000, // ₱360
            paymentMethod: "CashOnHand",
            status: "PaymentSubmitted",
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
            paymentSubmittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            paymentProofMediaIds: ["media-004", "media-005", "media-006"],
            commissionRuleId: "rule-premium-services",
            commissionVersion: 1,
            updatedAt: new Date(),
          },
        ];

        setRemittanceOrders(mockOrders);
        if (showSuccessToast) {
          toast.success("Remittance orders refreshed successfully");
        }
      } catch (error) {
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
        // Mock data for remittance providers
        const mockProviders: RemittanceServiceProviderData[] = [
          {
            id: "provider-001",
            name: "Juan Dela Cruz",
            phone: "+63 912 345 6789",
            totalEarnings: 125000, // ₱1,250
            pendingCommission: 7500, // ₱75
            settledCommission: 117500, // ₱1,175
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            outstandingBalance: 7500, // ₱75
            pendingOrders: 1,
            overdueOrders: 1,
            totalOrdersCompleted: 15,
            averageOrderValue: 8333, // ₱83.33
            nextDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          },
          {
            id: "provider-002",
            name: "Maria Santos",
            phone: "+63 917 234 5678",
            totalEarnings: 85000, // ₱850
            pendingCommission: 4500, // ₱45
            settledCommission: 80500, // ₱805
            lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            outstandingBalance: 4500, // ₱45
            pendingOrders: 1,
            overdueOrders: 0,
            totalOrdersCompleted: 8,
            averageOrderValue: 10625, // ₱106.25
            nextDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
          },
          {
            id: "provider-003",
            name: "Pedro Rodriguez",
            phone: "+63 918 345 6789",
            totalEarnings: 250000, // ₱2,500
            pendingCommission: 0, // ₱0
            settledCommission: 250000, // ₱2,500
            lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            outstandingBalance: 0, // ₱0
            pendingOrders: 0,
            overdueOrders: 0,
            totalOrdersCompleted: 20,
            averageOrderValue: 12500, // ₱125
            nextDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
          },
          {
            id: "provider-004",
            name: "Ana Garcia",
            phone: "+63 919 456 7890",
            totalEarnings: 180000, // ₱1,800
            pendingCommission: 36000, // ₱360
            settledCommission: 144000, // ₱1,440
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            outstandingBalance: 36000, // ₱360
            pendingOrders: 1,
            overdueOrders: 0,
            totalOrdersCompleted: 12,
            averageOrderValue: 15000, // ₱150
            nextDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          },
          {
            id: "provider-005",
            name: "Carlos Lopez",
            phone: "+63 920 567 8901",
            totalEarnings: 95000, // ₱950
            pendingCommission: 0, // ₱0
            settledCommission: 95000, // ₱950
            lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            outstandingBalance: 0, // ₱0
            pendingOrders: 0,
            overdueOrders: 0,
            totalOrdersCompleted: 6,
            averageOrderValue: 15833, // ₱158.33
            nextDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
        ];

        setRemittanceProviders(mockProviders);
        if (showSuccessToast) {
          toast.success("Remittance providers refreshed successfully");
        }
      } catch (error) {
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
        // Mock data for remittance statistics
        const mockStats = {
          totalOrders: 25,
          totalSettledOrders: 18,
          totalPendingOrders: 7,
          totalOverdueOrders: 1,
          totalCommissionPaid: 425000, // ₱4,250
          totalServiceAmount: 14150000, // ₱141,500
          averageOrderValue: 566000, // ₱5,660
          averageCommissionRate: 3.0, // 3%
          totalProviders: 5,
          activeProviders: 4,
          averageSettlementTime: 2.5, // 2.5 days
          commissionRulesCount: 2,
          lastUpdated: new Date(),
        };

        setRemittanceStats(mockStats);
        if (showSuccessToast) {
          toast.success("Remittance statistics refreshed successfully");
        }
      } catch (error) {
        handleError(error, "Failed to refresh remittance statistics");
      } finally {
        updateLoadingState("remittanceStats", false);
      }
    },
    [updateLoadingState, handleError],
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

  const validateRemittancePayment = useCallback(
    async (orderId: string, approved: boolean, reason?: string) => {
      updateLoadingState("paymentValidation", true);
      try {
        await remittanceServiceCanister.validatePaymentByAdmin(
          orderId,
          approved,
          reason,
        );
        await refreshRemittanceOrders();
        toast.success(
          `Payment ${approved ? "approved" : "rejected"} successfully`,
        );
      } catch (error) {
        handleError(
          error,
          `Failed to ${approved ? "approve" : "reject"} payment`,
        );
      } finally {
        updateLoadingState("paymentValidation", false);
      }
    },
    [updateLoadingState, handleError, refreshRemittanceOrders],
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

  const getProviderDashboard = useCallback(
    async (providerId: string) => {
      try {
        // Mock data for provider dashboard
        const mockDashboard: FrontendProviderDashboard = {
          providerId: providerId,
          outstandingBalance: 7500, // ₱75
          pendingOrders: 1,
          overdueOrders: 1,
          nextDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          ordersAwaitingPayment: [
            {
              id: "order-001",
              serviceProviderId: "provider-001",
              serviceType: "cat-001",
              amount: 250000, // ₱2,500
              commissionAmount: 7500, // ₱75
              paymentMethod: "CashOnHand",
              status: "AwaitingPayment",
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              paymentSubmittedAt: undefined,
              paymentProofMediaIds: [],
              commissionRuleId: "rule-default-commission",
              commissionVersion: 1,
              updatedAt: new Date(),
            },
          ],
          ordersPendingValidation: [],
          totalCommissionPaid: 117500, // ₱1,175
          totalOrdersCompleted: 15,
        };

        return mockDashboard;
      } catch (error) {
        handleError(error, "Failed to get provider dashboard");
        throw error;
      }
    },
    [handleError],
  );

  const getProviderAnalytics = useCallback(
    async (providerId: string, _fromDate?: Date, _toDate?: Date) => {
      try {
        // Mock data for provider analytics
        const mockAnalytics: FrontendProviderAnalytics = {
          providerId: providerId,
          totalOrders: 15,
          settledOrders: 12,
          pendingOrders: 3,
          totalCommissionPaid: 125000, // ₱1,250
          totalServiceAmount: 4166667, // ₱41,666.67
          averageOrderValue: 277778, // ₱2,777.78
          dateRange: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            to: new Date(), // now
          },
        };

        return mockAnalytics;
      } catch (error) {
        handleError(error, "Failed to get provider analytics");
        throw error;
      }
    },
    [handleError],
  );

  const generateSettlementInstruction = useCallback(
    async (orderId: string) => {
      try {
        // Mock data for settlement instruction
        const mockSettlement: FrontendSettlementInstruction = {
          corporateGcashAccount: "09123456789",
          commissionAmount: 7500, // ₱75
          referenceNumber: `REF-${orderId}`,
          instructions:
            "Please deposit the commission amount to the specified GCash account. Include the reference number in the transaction. Send proof of payment via the app.",
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        };

        return mockSettlement;
      } catch (error) {
        handleError(error, "Failed to generate settlement instruction");
        throw error;
      }
    },
    [handleError],
  );

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
      refreshRemittanceOrders(),
      refreshRemittanceProviders(),
      refreshRemittanceStats(),
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
    refreshRemittanceOrders,
    refreshRemittanceProviders,
    refreshRemittanceStats,
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

    // Remittance data states
    remittanceOrders,
    remittanceProviders,
    remittanceStats,

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

    // Remittance Management
    refreshRemittanceOrders,
    refreshRemittanceProviders,
    refreshRemittanceStats,
    queryRemittanceOrders,
    getRemittanceOrder,
    validateRemittancePayment,
    cancelRemittanceOrder,
    getProviderDashboard,
    getProviderAnalytics,
    generateSettlementInstruction,

    // Utility functions
    refreshAll,
  };
};
