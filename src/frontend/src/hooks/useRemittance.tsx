// import { useState, useEffect, useCallback, useMemo } from "react";
// import { useAuth } from "../context/AuthContext";
// import {
//   getProviderDashboard,
//   getProviderAnalytics,
//   getProviderOrders,
//   getOrder,
//   uploadAndSubmitPaymentProof,
//   submitPaymentProof,
//   uploadRemittancePaymentProofs,
//   quoteCommission,
//   generateSettlementInstruction,
//   updateRemittanceActor,
//   type RemittanceOrder,
//   type ProviderDashboard,
//   type ProviderAnalytics,
//   type CommissionQuote,
//   type SettlementInstruction,
// } from "../services/remittanceCanisterService";

// // Hook interface for comprehensive remittance functionality
// export interface RemittanceHook {
//   // Data
//   dashboard: ProviderDashboard | null;
//   analytics: ProviderAnalytics | null;
//   orders: RemittanceOrder[];

//   // Loading states
//   loading: boolean;
//   dashboardLoading: boolean;
//   analyticsLoading: boolean;
//   ordersLoading: boolean;

//   // Error states
//   error: string | null;
//   dashboardError: string | null;
//   analyticsError: string | null;
//   ordersError: string | null;

//   // Core functions
//   loadDashboard: () => Promise<void>;
//   loadAnalytics: (fromDate?: Date, toDate?: Date) => Promise<void>;
//   loadOrders: () => Promise<void>;
//   refreshAll: () => Promise<void>;

//   // Order management
//   getOrderById: (orderId: string) => Promise<RemittanceOrder | null>;
//   uploadAndSubmitPayment: (
//     orderId: string,
//     amountPaid: number,
//     files: File[],
//   ) => Promise<RemittanceOrder>;
//   submitPayment: (
//     orderId: string,
//     mediaIds: string[],
//   ) => Promise<RemittanceOrder>;
//   uploadPaymentProofs: (files: File[]) => Promise<string[]>;

//   // Commission and settlement
//   getCommissionQuote: (
//     amount: number,
//     serviceType: string,
//     serviceDate: Date,
//   ) => Promise<CommissionQuote>;
//   getSettlementInstructions: (
//     orderId: string,
//   ) => Promise<SettlementInstruction>;

//   // Utility functions
//   clearErrors: () => void;
//   retry: (operation: () => Promise<void>) => Promise<void>;
//   isOperationInProgress: (operation: string) => boolean;

//   // Analytics helpers
//   getOutstandingBalance: () => number;
//   getPendingOrdersCount: () => number;
//   getOverdueOrdersCount: () => number;
//   getTotalCommissionPaid: () => number;
// }

// // Operation tracking for loading states
// interface OperationState {
//   [key: string]: boolean;
// }

// export const useRemittance = (): RemittanceHook => {
//   const { identity, isAuthenticated } = useAuth();

//   // Core data state
//   const [dashboard, setDashboard] = useState<ProviderDashboard | null>(null);
//   const [analytics, setAnalytics] = useState<ProviderAnalytics | null>(null);
//   const [orders, setOrders] = useState<RemittanceOrder[]>([]);

//   // Loading states
//   const [loading, setLoading] = useState(false);
//   const [dashboardLoading, setDashboardLoading] = useState(false);
//   const [analyticsLoading, setAnalyticsLoading] = useState(false);
//   const [ordersLoading, setOrdersLoading] = useState(false);

//   // Error states
//   const [error, setError] = useState<string | null>(null);
//   const [dashboardError, setDashboardError] = useState<string | null>(null);
//   const [analyticsError, setAnalyticsError] = useState<string | null>(null);
//   const [ordersError, setOrdersError] = useState<string | null>(null);

//   // Operation tracking
//   const [operations, setOperations] = useState<OperationState>({});

//   // Provider ID from identity
//   const providerId = useMemo(() => {
//     if (!isAuthenticated || !identity) return null;
//     try {
//       return identity.getPrincipal();
//     } catch (error) {
//       //console.error("Failed to get provider ID:", error);
//       return null;
//     }
//   }, [identity, isAuthenticated]);

//   // Update remittance actor when identity changes
//   useEffect(() => {
//     updateRemittanceActor(identity);
//   }, [identity]);

//   // Helper function to set operation state
//   const setOperationState = useCallback(
//     (operation: string, inProgress: boolean) => {
//       setOperations((prev) => ({ ...prev, [operation]: inProgress }));
//     },
//     [],
//   );

//   // Helper function to handle errors
//   const handleError = useCallback((error: unknown, context: string) => {
//     const errorMessage =
//       error instanceof Error ? error.message : `Unknown error in ${context}`;
//     //console.error(`Remittance hook error (${context}):`, error);
//     return errorMessage;
//   }, []);

//   // Load provider dashboard
//   const loadDashboard = useCallback(async () => {
//     if (!providerId) {
//       setDashboardError("Authentication required");
//       return;
//     }

//     setDashboardLoading(true);
//     setDashboardError(null);
//     setOperationState("loadDashboard", true);

//     try {
//       const dashboardData = await getProviderDashboard(providerId);
//       setDashboard(dashboardData);
//       setDashboardError(null);
//     } catch (error) {
//       const errorMessage = handleError(error, "loadDashboard");
//       setDashboardError(errorMessage);
//       setError(errorMessage);
//     } finally {
//       setDashboardLoading(false);
//       setOperationState("loadDashboard", false);
//     }
//   }, [providerId, handleError, setOperationState]);

//   // Load provider analytics
//   const loadAnalytics = useCallback(
//     async (fromDate?: Date, toDate?: Date) => {
//       if (!providerId) {
//         setAnalyticsError("Authentication required");
//         return;
//       }

//       setAnalyticsLoading(true);
//       setAnalyticsError(null);
//       setOperationState("loadAnalytics", true);

//       try {
//         const analyticsData = await getProviderAnalytics(
//           providerId,
//           fromDate,
//           toDate,
//         );
//         setAnalytics(analyticsData);
//         setAnalyticsError(null);
//       } catch (error) {
//         const errorMessage = handleError(error, "loadAnalytics");
//         setAnalyticsError(errorMessage);
//         setError(errorMessage);
//       } finally {
//         setAnalyticsLoading(false);
//         setOperationState("loadAnalytics", false);
//       }
//     },
//     [providerId, handleError, setOperationState],
//   );

//   // Load provider orders
//   const loadOrders = useCallback(async () => {
//     if (!providerId) {
//       setOrdersError("Authentication required");
//       return;
//     }

//     setOrdersLoading(true);
//     setOrdersError(null);
//     setOperationState("loadOrders", true);

//     try {
//       const ordersData = await getProviderOrders(providerId);
//       setOrders(ordersData);
//       setOrdersError(null);
//     } catch (error) {
//       const errorMessage = handleError(error, "loadOrders");
//       setOrdersError(errorMessage);
//       setError(errorMessage);
//     } finally {
//       setOrdersLoading(false);
//       setOperationState("loadOrders", false);
//     }
//   }, [providerId, handleError, setOperationState]);

//   // Refresh all data
//   const refreshAll = useCallback(async () => {
//     if (!providerId) return;

//     setLoading(true);
//     setError(null);

//     try {
//       await Promise.allSettled([
//         loadDashboard(),
//         loadAnalytics(),
//         loadOrders(),
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   }, [providerId, loadDashboard, loadAnalytics, loadOrders]);

//   // Get order by ID
//   const getOrderById = useCallback(
//     async (orderId: string): Promise<RemittanceOrder | null> => {
//       setOperationState("getOrder", true);
//       try {
//         return await getOrder(orderId);
//       } catch (error) {
//         const errorMessage = handleError(error, "getOrderById");
//         setError(errorMessage);
//         throw new Error(errorMessage);
//       } finally {
//         setOperationState("getOrder", false);
//       }
//     },
//     [handleError, setOperationState],
//   );

//   // Upload and submit payment proof
//   const uploadAndSubmitPayment = useCallback(
//     async (
//       orderId: string,
//       amountPaid: number,
//       files: File[],
//     ): Promise<RemittanceOrder> => {
//       setOperationState("uploadAndSubmitPayment", true);
//       try {
//         const result = await uploadAndSubmitPaymentProof(
//           orderId,
//           amountPaid,
//           files,
//         );
//         // Refresh orders after successful submission
//         await loadOrders();
//         return result;
//       } catch (error) {
//         const errorMessage = handleError(error, "uploadAndSubmitPayment");
//         setError(errorMessage);
//         throw new Error(errorMessage);
//       } finally {
//         setOperationState("uploadAndSubmitPayment", false);
//       }
//     },
//     [handleError, setOperationState, loadOrders],
//   );

//   // Submit payment proof with existing media IDs
//   const submitPayment = useCallback(
//     async (orderId: string, mediaIds: string[]): Promise<RemittanceOrder> => {
//       setOperationState("submitPayment", true);
//       try {
//         const result = await submitPaymentProof(orderId, mediaIds);
//         // Refresh orders after successful submission
//         await loadOrders();
//         return result;
//       } catch (error) {
//         const errorMessage = handleError(error, "submitPayment");
//         setError(errorMessage);
//         throw new Error(errorMessage);
//       } finally {
//         setOperationState("submitPayment", false);
//       }
//     },
//     [handleError, setOperationState, loadOrders],
//   );

//   // Upload payment proofs
//   const uploadPaymentProofs = useCallback(
//     async (files: File[]): Promise<string[]> => {
//       setOperationState("uploadPaymentProofs", true);
//       try {
//         return await uploadRemittancePaymentProofs(files);
//       } catch (error) {
//         const errorMessage = handleError(error, "uploadPaymentProofs");
//         setError(errorMessage);
//         throw new Error(errorMessage);
//       } finally {
//         setOperationState("uploadPaymentProofs", false);
//       }
//     },
//     [handleError, setOperationState],
//   );

//   // Get commission quote
//   const getCommissionQuote = useCallback(
//     async (
//       amount: number,
//       serviceType: string,
//       serviceDate: Date,
//     ): Promise<CommissionQuote> => {
//       setOperationState("getCommissionQuote", true);
//       try {
//         return await quoteCommission(amount, serviceType, serviceDate);
//       } catch (error) {
//         const errorMessage = handleError(error, "getCommissionQuote");
//         setError(errorMessage);
//         throw new Error(errorMessage);
//       } finally {
//         setOperationState("getCommissionQuote", false);
//       }
//     },
//     [handleError, setOperationState],
//   );

//   // Get settlement instructions
//   const getSettlementInstructions = useCallback(
//     async (orderId: string): Promise<SettlementInstruction> => {
//       setOperationState("getSettlementInstructions", true);
//       try {
//         return await generateSettlementInstruction(orderId);
//       } catch (error) {
//         const errorMessage = handleError(error, "getSettlementInstructions");
//         setError(errorMessage);
//         throw new Error(errorMessage);
//       } finally {
//         setOperationState("getSettlementInstructions", false);
//       }
//     },
//     [handleError, setOperationState],
//   );

//   // Utility functions
//   const clearErrors = useCallback(() => {
//     setError(null);
//     setDashboardError(null);
//     setAnalyticsError(null);
//     setOrdersError(null);
//   }, []);

//   const retry = useCallback(
//     async (operation: () => Promise<void>) => {
//       clearErrors();
//       try {
//         await operation();
//       } catch (error) {
//         const errorMessage = handleError(error, "retry");
//         setError(errorMessage);
//       }
//     },
//     [clearErrors, handleError],
//   );

//   const isOperationInProgress = useCallback(
//     (operation: string) => {
//       return !!operations[operation];
//     },
//     [operations],
//   );

//   // Analytics helper functions
//   const getOutstandingBalance = useCallback(() => {
//     return dashboard?.outstandingBalance || 0;
//   }, [dashboard]);

//   const getPendingOrdersCount = useCallback(() => {
//     return dashboard?.pendingOrders || 0;
//   }, [dashboard]);

//   const getOverdueOrdersCount = useCallback(() => {
//     return dashboard?.overdueOrders || 0;
//   }, [dashboard]);

//   const getTotalCommissionPaid = useCallback(() => {
//     return dashboard?.totalCommissionPaid || 0;
//   }, [dashboard]);

//   // Initialize data on mount and when providerId changes
//   useEffect(() => {
//     if (providerId) {
//       refreshAll();
//     }
//   }, [providerId, refreshAll]);

//   // Auto-refresh data every 5 minutes (like other hooks)
//   useEffect(() => {
//     if (!providerId) return;

//     const interval = setInterval(
//       () => {
//         refreshAll();
//       },
//       5 * 60 * 1000,
//     ); // 5 minutes

//     return () => clearInterval(interval);
//   }, [providerId, refreshAll]);

//   return {
//     // Data
//     dashboard,
//     analytics,
//     orders,

//     // Loading states
//     loading,
//     dashboardLoading,
//     analyticsLoading,
//     ordersLoading,

//     // Error states
//     error,
//     dashboardError,
//     analyticsError,
//     ordersError,

//     // Core functions
//     loadDashboard,
//     loadAnalytics,
//     loadOrders,
//     refreshAll,

//     // Order management
//     getOrderById,
//     uploadAndSubmitPayment,
//     submitPayment,
//     uploadPaymentProofs,

//     // Commission and settlement
//     getCommissionQuote,
//     getSettlementInstructions,

//     // Utility functions
//     clearErrors,
//     retry,
//     isOperationInProgress,

//     // Analytics helpers
//     getOutstandingBalance,
//     getPendingOrdersCount,
//     getOverdueOrdersCount,
//     getTotalCommissionPaid,
//   };
// };
