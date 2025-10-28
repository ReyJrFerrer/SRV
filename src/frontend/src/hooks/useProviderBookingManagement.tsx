import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Principal } from "@dfinity/principal";
import {
  Booking,
  BookingStatus,
  bookingCanisterService,
} from "../services/bookingCanisterService";
import {
  FrontendProfile,
  authCanisterService,
} from "../services/authCanisterService";
import {
  Service,
  ServicePackage,
  serviceCanisterService,
} from "../services/serviceCanisterService";
import chatCanisterService from "../services/chatCanisterService";
import { useWallet } from "./useWallet";

// Enhanced Provider Booking interface with client data enrichment and package support
export interface ProviderEnhancedBooking extends Booking {
  // Client data enrichment
  clientProfile?: FrontendProfile;
  clientName?: string;
  clientPhone?: string;
  formattedLocation?: string;

  // Service and package data enrichment
  serviceDetails?: Service;
  packageDetails?: ServicePackage;
  packageName?: string;
  description?: string;

  // Provider-specific computed fields
  isPending?: boolean;
  isUpcoming?: boolean;
  isActive?: boolean;
  isCompleted?: boolean;
  canAccept?: boolean;
  canDecline?: boolean;
  canStart?: boolean;
  canComplete?: boolean;
  canDispute?: boolean;

  // Time calculations
  timeUntilService?: string;
  serviceDuration?: string;
  isOverdue?: boolean;

  // Revenue tracking
  estimatedRevenue?: number;

  // Commission and wallet validation
  estimatedCommission?: number;
  hasInsufficientBalance?: boolean;
  commissionValidationMessage?: string;
  actualRevenue?: number;

  // Data loading status
  isClientDataLoaded?: boolean;
  isServiceDataLoaded?: boolean;
  isPackageDataLoaded?: boolean;
}

// Provider booking analytics interface
export interface ProviderBookingAnalytics {
  totalBookings: number;
  pendingRequests: number;
  acceptedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  disputedBookings: number;

  // Revenue analytics
  totalRevenue: number;
  expectedRevenue: number;
  averageBookingValue: number;

  // Performance metrics
  acceptanceRate: number;
  completionRate: number;
  averageResponseTime: number;
  customerSatisfactionScore?: number;

  // Time-based analytics
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
}

// Loading states for provider operations
interface ProviderLoadingStates {
  bookings: boolean;
  profile: boolean;
  clients: boolean;
  services: boolean;
  packages: boolean;
  analytics: boolean;
  operations: Map<string, boolean>;
}

// Hook interface
interface ProviderBookingManagementHook {
  // Data states
  bookings: ProviderEnhancedBooking[];
  providerProfile: FrontendProfile | null;
  clientProfiles: Map<string, FrontendProfile>;
  serviceDetails: Map<string, Service>;
  packageDetails: Map<string, ServicePackage>;
  analytics: ProviderBookingAnalytics | null;

  // Loading states
  loading: boolean;
  loadingClients: boolean;
  loadingServices: boolean;
  loadingAnalytics: boolean;
  refreshing: boolean;

  // Error state
  error: string | null;

  // Core booking management functions
  loadProviderBookings: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  acceptBooking: (bookingId: string, scheduledDate?: Date) => Promise<void>;
  declineBooking: (bookingId: string, reason?: string) => Promise<void>;
  startBooking: (bookingId: string) => Promise<void>;
  completeBooking: (bookingId: string, amountPaid?: number) => Promise<void>;
  disputeBooking: (bookingId: string, reason: string) => Promise<void>;

  // Individual booking lookup and action functions
  getBookingById: (bookingId: string) => ProviderEnhancedBooking | null;
  getBookingWithClientData: (
    bookingId: string,
  ) => Promise<ProviderEnhancedBooking | null>;
  acceptBookingById: (
    bookingId: string,
    scheduledDate?: Date,
  ) => Promise<boolean>;
  declineBookingById: (bookingId: string, reason?: string) => Promise<boolean>;
  startBookingById: (bookingId: string) => Promise<boolean>;
  completeBookingById: (
    bookingId: string,
    amountPaid?: number,
  ) => Promise<boolean>;
  disputeBookingById: (bookingId: string, reason: string) => Promise<boolean>;
  isBookingActionInProgress: (bookingId: string, action: string) => boolean;

  // Data filtering and categorization
  getBookingsByStatus: (status: BookingStatus) => ProviderEnhancedBooking[];
  getPendingBookings: () => ProviderEnhancedBooking[];
  getUpcomingBookings: () => ProviderEnhancedBooking[];
  getActiveBookings: () => ProviderEnhancedBooking[];
  getCompletedBookings: () => ProviderEnhancedBooking[];
  getTodaysBookings: () => ProviderEnhancedBooking[];
  getOverdueBookings: () => ProviderEnhancedBooking[];

  // Analytics functions
  calculateAnalytics: () => ProviderBookingAnalytics;
  getRevenueByPeriod: (period: "week" | "month" | "year") => number;
  getBookingCountByPeriod: (period: "week" | "month" | "year") => number;

  // New chart data functions
  getMonthlyRevenue: () => { name: string; value: number }[];
  getBookingCountByDay: () => { name: string; value: number }[];

  // Utility functions
  formatBookingDate: (dateString: string) => string;
  formatBookingTime: (dateString: string) => string;
  getStatusColor: (status: BookingStatus) => string;
  getStatusLabel: (status: BookingStatus) => string;
  calculateTimeUntilService: (scheduledDate: string) => string;
  enrichBookingWithClientData: (
    booking: Booking,
  ) => Promise<ProviderEnhancedBooking>;
  formatLocationString: (location: any) => string;

  // State management
  getCurrentProviderId: () => string | null;
  isProviderAuthenticated: () => boolean;
  clearError: () => void;
  isOperationInProgress: (operation: string) => boolean;
  retryOperation: (operation: () => Promise<void>) => Promise<void>;
  // Package helper functions
  getPackageDisplayName: (booking: ProviderEnhancedBooking) => string;
  hasPackage: (booking: ProviderEnhancedBooking) => boolean;
  // Service helper functions
  getServiceDisplayName: (booking: ProviderEnhancedBooking) => string;
  hasServiceDetails: (booking: ProviderEnhancedBooking) => boolean;

  // Commission and wallet validation functions
  checkCommissionValidation: (booking: ProviderEnhancedBooking) => Promise<{
    estimatedCommission: number;
    hasInsufficientBalance: boolean;
    commissionValidationMessage?: string;
  }>;
  canAcceptCashBooking: (booking: ProviderEnhancedBooking) => Promise<boolean>;
  getWalletBalance: () => Promise<number>;
}

// Debounce utility function
const useDebounce = <F extends (...args: any[]) => any>(
  callback: F,
  delay: number,
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef<F>(callback);

  // Update the callback if it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<F>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);

      // Cleanup function to clear the timeout
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    },
    [delay],
  );
};

export const useProviderBookingManagement =
  (): ProviderBookingManagementHook => {
    // Core state management
    const [providerBookings, setProviderBookings] = useState<
      ProviderEnhancedBooking[]
    >([]);
    const [providerProfile, setProviderProfile] =
      useState<FrontendProfile | null>(null);
    const [clientProfiles, setClientProfiles] = useState<
      Map<string, FrontendProfile>
    >(new Map());
    const [serviceDetails, setServiceDetails] = useState<Map<string, Service>>(
      new Map(),
    );
    const [packageDetails, setPackageDetails] = useState<
      Map<string, ServicePackage>
    >(new Map());
    const [analytics, setAnalytics] = useState<ProviderBookingAnalytics | null>(
      null,
    );

    // Loading states
    const [loadingStates, setLoadingStates] = useState<ProviderLoadingStates>({
      bookings: false,
      profile: false,
      clients: false,
      services: false,
      packages: false,
      analytics: false,
      operations: new Map(),
    });

    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Computed loading states
    const loading = useMemo(
      () => loadingStates.bookings || loadingStates.profile,
      [loadingStates.bookings, loadingStates.profile],
    );

    const loadingClients = useMemo(
      () => loadingStates.clients,
      [loadingStates.clients],
    );

    const loadingServices = useMemo(
      () => loadingStates.services || loadingStates.packages,
      [loadingStates.services, loadingStates.packages],
    );

    const loadingAnalytics = useMemo(
      () => loadingStates.analytics,
      [loadingStates.analytics],
    );

    // Wallet management for commission validation
    const {
      balance: walletBalance,
      heldBalance: walletHeldBalance,
      availableBalance: walletAvailableBalance,
      fetchBalance,
    } = useWallet();

    // Utility functions for state management
    const setLoadingState = useCallback(
      (key: keyof ProviderLoadingStates | string, value: boolean) => {
        setLoadingStates((prev) => {
          if (key === "operations") return prev;
          if (typeof key === "string" && key.includes("-")) {
            const newOperations = new Map(prev.operations);
            if (value) {
              newOperations.set(key, value);
            } else {
              newOperations.delete(key);
            }
            return { ...prev, operations: newOperations };
          }
          return { ...prev, [key]: value };
        });
      },
      [],
    );

    const clearError = useCallback(() => setError(null), []);

    const isOperationInProgress = useCallback(
      (operation: string): boolean => {
        return loadingStates.operations.has(operation);
      },
      [loadingStates.operations],
    );

    // Authentication functions
    const getCurrentProviderId = useCallback((): string | null => {
      try {
        return providerProfile?.id || null;
      } catch {
        return null;
      }
    }, [providerProfile]);

    const isProviderAuthenticated = useCallback((): boolean => {
      return (
        providerProfile !== null && providerProfile.role === "ServiceProvider"
      );
    }, [providerProfile]);

    // Error handling functions
    const handleBookingError = useCallback((error: any, operation: string) => {
      //console.error(`Error in ${operation}:`, error);
      const errorMessage = error?.message || `Failed to ${operation}`;
      setError(errorMessage);
    }, []);

    const handleAuthError = useCallback(() => {
      setError("Authentication required. Please log in as a service provider.");
    }, []);

    // Client profile caching functions
    const getCachedClientProfile = useCallback(
      (clientId: string): FrontendProfile | null => {
        return clientProfiles.get(clientId) || null;
      },
      [clientProfiles],
    );

    const cacheClientProfile = useCallback(
      (clientId: string, profile: FrontendProfile) => {
        setClientProfiles((prev) => new Map(prev).set(clientId, profile));
      },
      [],
    );

    // Service and package caching functions
    const cacheServiceDetails = useCallback(
      (serviceId: string, service: Service) => {
        setServiceDetails((prev) => new Map(prev.set(serviceId, service)));
      },
      [],
    );

    const getCachedServiceDetails = useCallback(
      (serviceId: string): Service | null => {
        return serviceDetails.get(serviceId) || null;
      },
      [serviceDetails],
    );

    const cachePackageDetails = useCallback(
      (packageId: string, pkg: ServicePackage) => {
        setPackageDetails((prev) => new Map(prev.set(packageId, pkg)));
      },
      [],
    );

    const getCachedPackageDetails = useCallback(
      (packageId: string): ServicePackage | null => {
        return packageDetails.get(packageId) || null;
      },
      [packageDetails],
    );

    // Enhanced client profile loading
    const loadClientProfile = useCallback(
      async (clientId: string): Promise<FrontendProfile | null> => {
        try {
          // Check cache first
          const cached = getCachedClientProfile(clientId);
          if (cached) {
            return cached;
          }

          setLoadingState("clients", true);

          const profile = await authCanisterService.getProfile(clientId);

          if (profile) {
            cacheClientProfile(clientId, profile);
            return profile;
          } else {
            return null;
          }
        } catch (error) {
          // //console.error(
          //   `❌ Error loading client profile for ${clientId}:`,
          //   error,
          // );
          return null;
        } finally {
          setLoadingState("clients", false);
        }
      },
      [getCachedClientProfile, setLoadingState, cacheClientProfile],
    );

    // Service data loading functions
    const loadServiceDetails = useCallback(
      async (serviceId: string): Promise<Service | null> => {
        try {
          // Check cache first
          const cached = getCachedServiceDetails(serviceId);
          if (cached) {
            return cached;
          }

          setLoadingState("services", true);

          const service = await serviceCanisterService.getService(serviceId);

          if (service) {
            cacheServiceDetails(serviceId, service);
            return service;
          } else {
            return null;
          }
        } catch (error) {
          // //console.error(
          //   `❌ Error loading service details for ${serviceId}:`,
          //   error,
          // );
          return null;
        } finally {
          setLoadingState("services", false);
        }
      },
      [getCachedServiceDetails, setLoadingState, cacheServiceDetails],
    );

    const loadPackageDetails = useCallback(
      async (packageId: string): Promise<ServicePackage | null> => {
        try {
          // Check cache first
          const cached = getCachedPackageDetails(packageId);
          if (cached) {
            return cached;
          }

          setLoadingState("packages", true);

          const pkg = await serviceCanisterService.getPackage(packageId);

          if (pkg) {
            cachePackageDetails(packageId, pkg);
            return pkg;
          } else {
            return null;
          }
        } catch (error) {
          // //console.error(
          //   `❌ Error loading package details for ${packageId}:`,
          //   error,
          // );
          return null;
        } finally {
          setLoadingState("packages", false);
        }
      },
      [getCachedPackageDetails, setLoadingState, cachePackageDetails],
    );

    // Time calculation utilities
    const calculateTimeUntilService = useCallback(
      (scheduledDate: string): string => {
        if (!scheduledDate) return "Not scheduled";

        const now = new Date();
        const serviceDate = new Date(scheduledDate);
        const diffMs = serviceDate.getTime() - now.getTime();

        if (diffMs < 0) return "Overdue";

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
        if (diffHours > 0)
          return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
      },
      [],
    );

    // Location formatting utility
    const formatLocationString = useCallback((location: any): string => {
      if (!location) return "No location provided";

      // Handle string locations
      if (typeof location === "string") return location;

      // Handle object locations with address fields
      if (typeof location === "object") {
        const parts = [];

        if (location.address) parts.push(location.address);
        else {
          if (location.street) parts.push(location.street);
          if (location.city) parts.push(location.city);
          if (location.state) parts.push(location.state);
          if (location.zipCode || location.postalCode)
            parts.push(location.zipCode || location.postalCode);
          if (location.country) parts.push(location.country);
        }

        if (parts.length > 0) return parts.join(", ");

        // If no standard address fields, try to JSON stringify but handle circular refs
        try {
          return JSON.stringify(location);
        } catch {
          return "Complex location object";
        }
      }

      return "Unknown location format";
    }, []);

    // Enhanced booking enrichment with client, service, and package data
    const enrichBookingWithClientData = useCallback(
      async (booking: Booking): Promise<ProviderEnhancedBooking> => {
        try {
          // Load client and service data in parallel
          const [clientProfile, serviceDetails] = await Promise.all([
            loadClientProfile(booking.clientId.toString()),
            booking.serviceId
              ? loadServiceDetails(booking.serviceId)
              : Promise.resolve(null),
          ]);

          // Load all package details for multiple packages
          let packageDetails: ServicePackage | null = null;
          let packageNames: string[] = [];

          if (booking.servicePackageId && booking.servicePackageId.length > 0) {
            const packagePromises = booking.servicePackageId.map((packageId) =>
              loadPackageDetails(packageId),
            );
            const packages = await Promise.all(packagePromises);

            // Use the first package as the primary package details
            packageDetails = packages.find((pkg) => pkg !== null) || null;

            // Collect all package names
            packageNames = packages
              .filter((pkg) => pkg !== null)
              .map((pkg) => pkg!.title);
          }

          const formattedLocation = formatLocationString(booking.location);
          const timeUntilService = booking.requestedDate
            ? calculateTimeUntilService(booking.requestedDate)
            : undefined;

          // Calculate booking properties
          const now = new Date();
          const scheduledDate = booking.requestedDate
            ? new Date(booking.requestedDate)
            : null;
          const isOverdue = scheduledDate
            ? scheduledDate < now && booking.status === "Accepted"
            : false;

          const enhancedBooking: ProviderEnhancedBooking = {
            ...booking,
            // Client data
            clientProfile: clientProfile || undefined,
            clientName: clientProfile?.name || "Unknown Client",
            clientPhone: clientProfile?.phone || "Unknown Phone Number",
            formattedLocation,
            timeUntilService,
            isOverdue,

            // Service and package data - using servicePackageId array
            serviceDetails: serviceDetails || undefined,
            packageDetails: packageDetails || undefined,
            packageName:
              packageNames.length > 0
                ? packageNames.join(", ") // Join multiple package names
                : packageDetails?.title,
            description: packageDetails?.description,

            // Status flags
            isPending: booking.status === "Requested",
            isUpcoming: booking.status === "Accepted",
            isActive: booking.status === "InProgress",
            isCompleted: booking.status === "Completed",

            // Action availability
            canAccept: booking.status === "Requested",
            canDecline: booking.status === "Requested",
            canStart:
              booking.status === "Accepted" && scheduledDate
                ? scheduledDate <= now
                : false,
            canComplete: booking.status === "InProgress",
            canDispute: booking.status === "Completed",

            // Revenue tracking
            estimatedRevenue: booking.price,
            actualRevenue: booking.status === "Completed" ? booking.price : 0,

            // Data loading status
            isClientDataLoaded: !!clientProfile,
            isServiceDataLoaded: !!serviceDetails || !booking.serviceId,
            isPackageDataLoaded:
              !!packageDetails ||
              !booking.servicePackageId ||
              booking.servicePackageId.length === 0, // Consider loaded if no packages
          };
          console.log("From useProviderBookingManagement", enhancedBooking);
          return enhancedBooking;
        } catch (error) {
          //console.error(`❌ Error enriching booking ${booking.id}:`, error);

          // Return booking with minimal enhancement but proper packageName handling
          return {
            ...booking,
            clientName: "Unknown Client",
            formattedLocation: formatLocationString(booking.location),
            packageName: undefined,
            description: undefined,
            isClientDataLoaded: false,
            isServiceDataLoaded: false,
            isPackageDataLoaded: false,
            isPending: booking.status === "Requested",
            isUpcoming: booking.status === "Accepted",
            isActive: booking.status === "InProgress",
            isCompleted: booking.status === "Completed",
            canAccept: booking.status === "Requested",
            canDecline: booking.status === "Requested",
            canStart: booking.status === "Accepted",
            canComplete: booking.status === "InProgress",
            canDispute: booking.status === "Completed",
            estimatedRevenue: booking.price,
            actualRevenue: booking.status === "Completed" ? booking.price : 0,
          };
        }
      },
      [
        loadClientProfile,
        formatLocationString,
        calculateTimeUntilService,
        loadServiceDetails,
        loadPackageDetails,
      ],
    );

    // Enhanced helper functions for better package handling using servicePackageId array
    const getPackageDisplayName = useCallback(
      (booking: ProviderEnhancedBooking): string => {
        if (
          !booking.servicePackageId ||
          booking.servicePackageId.length === 0
        ) {
          return "No Package Selected";
        }

        if (booking.packageDetails?.title) {
          return booking.packageDetails.title;
        }

        if (booking.packageName) {
          return booking.packageName;
        }

        if (booking.isPackageDataLoaded === false) {
          return "Loading Package...";
        }

        if (booking.servicePackageId.length === 1) {
          return `Package ID: ${booking.servicePackageId[0]}`;
        } else {
          return `${booking.servicePackageId.length} Packages Selected`;
        }
      },
      [],
    );

    const hasPackage = useCallback(
      (booking: ProviderEnhancedBooking): boolean => {
        return booking.servicePackageId && booking.servicePackageId.length > 0;
      },
      [],
    );

    // Service helper functions
    const getServiceDisplayName = useCallback(
      (booking: ProviderEnhancedBooking): string => {
        if (booking.serviceDetails?.title) {
          return booking.serviceDetails.title;
        }

        if (booking.serviceName) {
          return booking.serviceName;
        }

        if (booking.isServiceDataLoaded === false) {
          return "Loading Service...";
        }

        return booking.serviceId
          ? `Service ID: ${booking.serviceId}`
          : "Unknown Service";
      },
      [],
    );

    const hasServiceDetails = useCallback(
      (booking: ProviderEnhancedBooking): boolean => {
        return !!booking.serviceDetails || !!booking.serviceName;
      },
      [],
    );

    // Load provider profile
    const loadProviderProfile = useCallback(async () => {
      try {
        setLoadingState("profile", true);
        clearError();

        const profile = await authCanisterService.getMyProfile();
        if (profile && profile.role === "ServiceProvider") {
          setProviderProfile(profile);
        } else {
          handleAuthError();
        }
      } catch (error) {
        handleBookingError(error, "load provider profile");
        handleAuthError();
      } finally {
        setLoadingState("profile", false);
      }
    }, [setLoadingState, clearError, handleBookingError, handleAuthError]);

    // Load provider bookings
    const loadProviderBookings = useCallback(async () => {
      if (!isProviderAuthenticated()) {
        handleAuthError();
        return;
      }

      try {
        setLoadingState("bookings", true);
        clearError();

        const currentProviderId = getCurrentProviderId();
        if (!currentProviderId) {
          throw new Error("No authenticated provider found");
        }

        const providerPrincipal = Principal.fromText(currentProviderId);
        const rawBookings =
          await bookingCanisterService.getProviderBookings(providerPrincipal);

        // Enrich bookings with client data in parallel
        const enrichedBookings = await Promise.all(
          rawBookings.map((booking) => enrichBookingWithClientData(booking)),
        );

        setProviderBookings(enrichedBookings);
      } catch (error) {
        handleBookingError(error, "load provider bookings");
      } finally {
        setLoadingState("bookings", false);
      }
    }, [
      isProviderAuthenticated,
      handleAuthError,
      setLoadingState,
      clearError,
      getCurrentProviderId,
      handleBookingError,
      enrichBookingWithClientData,
    ]);

    // Refresh bookings
    const refreshBookings = useCallback(async () => {
      setRefreshing(true);
      try {
        // Clear all caches to ensure fresh data
        setClientProfiles(new Map());
        setServiceDetails(new Map());
        setPackageDetails(new Map());
        await loadProviderBookings();
      } finally {
        setRefreshing(false);
      }
    }, [loadProviderBookings]);

    // Booking action functions
    const acceptBooking = useCallback(
      async (bookingId: string, scheduledDate?: Date) => {
        try {
          setLoadingState(`accept-${bookingId}`, true);
          clearError();

          const updatedBooking = await bookingCanisterService.acceptBooking(
            bookingId,
            scheduledDate || new Date(),
          );
          // After successfully accepting a booking, try to create a conversation
          if (updatedBooking) {
            try {
              // Convert Principal IDs to strings for comparison
              const clientIdStr = updatedBooking.clientId.toString();
              const providerIdStr = updatedBooking.providerId.toString();

              // Check if a conversation already exists between these users
              const existingConversations =
                await chatCanisterService.getMyConversations();
              const conversationExists = existingConversations.some(
                (conversationSummary) => {
                  const conversation = conversationSummary.conversation;
                  return (
                    (conversation.clientId === clientIdStr &&
                      conversation.providerId === providerIdStr) ||
                    (conversation.clientId === providerIdStr &&
                      conversation.providerId === clientIdStr)
                  );
                },
              );

              // Only create a new conversation if one doesn't exist
              if (!conversationExists) {
                await chatCanisterService.createConversation(
                  clientIdStr,
                  providerIdStr,
                );
                // //console.log(
                //   "Conversation created for accepted booking:",
                //   bookingId,
                // );
              } else {
                //console.log("Conversation already exists between these users");
              }
            } catch (chatError) {
              // Log the error but don't prevent the booking status update
              // //console.error(
              //   "Failed to create conversation for booking:",
              //   bookingId,
              //   chatError,
              // );
            }
          }

          if (updatedBooking) {
            const enrichedBooking =
              await enrichBookingWithClientData(updatedBooking);
            setProviderBookings((prev) =>
              prev.map((booking) =>
                booking.id === bookingId ? enrichedBooking : booking,
              ),
            );
          }
        } catch (error) {
          handleBookingError(error, `accept booking ${bookingId}`);
          throw error;
        } finally {
          setLoadingState(`accept-${bookingId}`, false);
        }
      },
      [
        setLoadingState,
        clearError,
        handleBookingError,
        enrichBookingWithClientData,
      ],
    );

    const declineBooking = useCallback(
      async (bookingId: string) => {
        try {
          setLoadingState(`decline-${bookingId}`, true);
          clearError();

          const updatedBooking =
            await bookingCanisterService.declineBooking(bookingId);

          if (updatedBooking) {
            const enrichedBooking =
              await enrichBookingWithClientData(updatedBooking);
            setProviderBookings((prev) =>
              prev.map((booking) =>
                booking.id === bookingId ? enrichedBooking : booking,
              ),
            );
          }
        } catch (error) {
          handleBookingError(error, `decline booking ${bookingId}`);
          throw error;
        } finally {
          setLoadingState(`decline-${bookingId}`, false);
        }
      },
      [
        setLoadingState,
        clearError,
        handleBookingError,
        enrichBookingWithClientData,
      ],
    );

    const startBooking = useCallback(
      async (bookingId: string) => {
        try {
          setLoadingState(`start-${bookingId}`, true);
          clearError();

          const updatedBooking =
            await bookingCanisterService.startBooking(bookingId);

          if (updatedBooking) {
            const enrichedBooking =
              await enrichBookingWithClientData(updatedBooking);
            setProviderBookings((prev) =>
              prev.map((booking) =>
                booking.id === bookingId ? enrichedBooking : booking,
              ),
            );
          }
        } catch (error) {
          handleBookingError(error, `start booking ${bookingId}`);
          throw error;
        } finally {
          setLoadingState(`start-${bookingId}`, false);
        }
      },
      [
        setLoadingState,
        clearError,
        handleBookingError,
        enrichBookingWithClientData,
      ],
    );

    const completeBooking = useCallback(
      async (bookingId: string, amountPaid?: number) => {
        try {
          setLoadingState(`complete-${bookingId}`, true);
          clearError();

          const updatedBooking = await bookingCanisterService.completeBooking(
            bookingId,
            amountPaid,
          );

          if (updatedBooking) {
            const enrichedBooking =
              await enrichBookingWithClientData(updatedBooking);
            setProviderBookings((prev) =>
              prev.map((booking) =>
                booking.id === bookingId ? enrichedBooking : booking,
              ),
            );
          }
        } catch (error) {
          handleBookingError(error, `complete booking ${bookingId}`);
          throw error;
        } finally {
          setLoadingState(`complete-${bookingId}`, false);
        }
      },
      [
        setLoadingState,
        clearError,
        handleBookingError,
        enrichBookingWithClientData,
      ],
    );

    const disputeBooking = useCallback(
      async (bookingId: string) => {
        try {
          setLoadingState(`dispute-${bookingId}`, true);
          clearError();

          const updatedBooking =
            await bookingCanisterService.disputeBooking(bookingId);

          if (updatedBooking) {
            const enrichedBooking =
              await enrichBookingWithClientData(updatedBooking);
            setProviderBookings((prev) =>
              prev.map((booking) =>
                booking.id === bookingId ? enrichedBooking : booking,
              ),
            );
          }
        } catch (error) {
          handleBookingError(error, `dispute booking ${bookingId}`);
          throw error;
        } finally {
          setLoadingState(`dispute-${bookingId}`, false);
        }
      },
      [
        setLoadingState,
        clearError,
        handleBookingError,
        enrichBookingWithClientData,
      ],
    );

    // Data filtering and categorization functions
    const getBookingsByStatus = useCallback(
      (status: BookingStatus): ProviderEnhancedBooking[] => {
        return providerBookings.filter((booking) => booking.status === status);
      },
      [providerBookings],
    );

    const getPendingBookings = useCallback((): ProviderEnhancedBooking[] => {
      return providerBookings.filter((booking) => booking.isPending);
    }, [providerBookings]);

    const getUpcomingBookings = useCallback((): ProviderEnhancedBooking[] => {
      return providerBookings.filter((booking) => booking.isUpcoming);
    }, [providerBookings]);

    const getActiveBookings = useCallback((): ProviderEnhancedBooking[] => {
      return providerBookings.filter((booking) => booking.isActive);
    }, [providerBookings]);

    const getCompletedBookings = useCallback((): ProviderEnhancedBooking[] => {
      return providerBookings.filter((booking) => booking.isCompleted);
    }, [providerBookings]);

    const getTodaysBookings = useCallback((): ProviderEnhancedBooking[] => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return providerBookings.filter((booking) => {
        if (!booking.scheduledDate) return false;
        const scheduledDate = new Date(booking.scheduledDate);
        return scheduledDate >= today && scheduledDate < tomorrow;
      });
    }, [providerBookings]);

    const getOverdueBookings = useCallback((): ProviderEnhancedBooking[] => {
      return providerBookings.filter((booking) => booking.isOverdue);
    }, [providerBookings]);

    // Analytics calculation
    const calculateAnalytics = useCallback((): ProviderBookingAnalytics => {
      const totalBookings = providerBookings.length;
      const pendingRequests = getPendingBookings().length;
      const acceptedBookings = getBookingsByStatus("Accepted").length;
      const completedBookings = getCompletedBookings().length;
      const cancelledBookings = getBookingsByStatus("Cancelled").length;
      const disputedBookings = getBookingsByStatus("Disputed").length;

      // Revenue calculations
      const totalRevenue =
        completedBookings > 0
          ? providerBookings
              .filter((booking) => booking.isCompleted)
              .reduce((sum, booking) => sum + (booking.actualRevenue || 0), 0)
          : 0;

      const expectedRevenue = providerBookings
        .filter(
          (booking) =>
            booking.status === "Accepted" || booking.status === "InProgress",
        )
        .reduce((sum, booking) => sum + (booking.estimatedRevenue || 0), 0);

      const averageBookingValue =
        totalBookings > 0
          ? providerBookings.reduce((sum, booking) => sum + booking.price, 0) /
            totalBookings
          : 0;

      // Performance metrics
      const totalRequests =
        pendingRequests +
        acceptedBookings +
        getBookingsByStatus("Declined").length;
      const acceptanceRate =
        totalRequests > 0 ? (acceptedBookings / totalRequests) * 100 : 0;
      const completionRate =
        totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

      // Time-based analytics
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const bookingsThisWeek = providerBookings.filter((booking) => {
        const createdDate = new Date(booking.createdAt);
        return createdDate >= weekStart;
      }).length;

      const bookingsThisMonth = providerBookings.filter((booking) => {
        const createdDate = new Date(booking.createdAt);
        return createdDate >= monthStart;
      }).length;

      const revenueThisWeek = providerBookings
        .filter((booking) => {
          const completedDate = booking.completedDate
            ? new Date(booking.completedDate)
            : null;
          return (
            completedDate && completedDate >= weekStart && booking.isCompleted
          );
        })
        .reduce((sum, booking) => sum + (booking.actualRevenue || 0), 0);

      const revenueThisMonth = providerBookings
        .filter((booking) => {
          const completedDate = booking.completedDate
            ? new Date(booking.completedDate)
            : null;
          return (
            completedDate && completedDate >= monthStart && booking.isCompleted
          );
        })
        .reduce((sum, booking) => sum + (booking.actualRevenue || 0), 0);

      return {
        totalBookings,
        pendingRequests,
        acceptedBookings,
        completedBookings,
        cancelledBookings,
        disputedBookings,
        totalRevenue,
        expectedRevenue,
        averageBookingValue,
        acceptanceRate,
        completionRate,
        averageResponseTime: 0, // Would need additional data tracking
        bookingsThisWeek,
        bookingsThisMonth,
        revenueThisWeek,
        revenueThisMonth,
      };
    }, [
      providerBookings,
      getPendingBookings,
      getBookingsByStatus,
      getCompletedBookings,
    ]);

    // Period-based analytics
    const getRevenueByPeriod = useCallback(
      (period: "week" | "month" | "year"): number => {
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case "week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }

        return providerBookings
          .filter((booking) => {
            const completedDate = booking.completedDate
              ? new Date(booking.completedDate)
              : null;
            return (
              completedDate && completedDate >= startDate && booking.isCompleted
            );
          })
          .reduce((sum, booking) => sum + (booking.actualRevenue || 0), 0);
      },
      [providerBookings],
    );

    const getBookingCountByPeriod = useCallback(
      (period: "week" | "month" | "year"): number => {
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case "week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }

        return providerBookings.filter((booking) => {
          const createdDate = new Date(booking.createdAt);
          return createdDate >= startDate;
        }).length;
      },
      [providerBookings],
    );

    // Utility functions
    const formatBookingDate = useCallback((dateString: string): string => {
      if (!dateString) return "TBD";

      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Tomorrow";
      if (diffDays === -1) return "Yesterday";
      if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
      if (diffDays < -1 && diffDays >= -7)
        return `${Math.abs(diffDays)} days ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }, []);

    const formatBookingTime = useCallback((dateString: string): string => {
      if (!dateString) return "TBD";

      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }, []);

    const getStatusColor = useCallback((status: BookingStatus): string => {
      switch (status) {
        case "Requested":
          return "bg-yellow-100 text-yellow-800 border border-yellow-200";
        case "Accepted":
          return "bg-blue-100 text-blue-800 border border-blue-200";
        case "InProgress":
          return "bg-purple-100 text-purple-800 border border-purple-200";
        case "Completed":
          return "bg-green-100 text-green-800 border border-green-200";
        case "Cancelled":
          return "bg-gray-100 text-gray-800 border border-gray-200";
        case "Declined":
          return "bg-red-100 text-red-800 border border-red-200";
        case "Disputed":
          return "bg-orange-100 text-orange-800 border border-orange-200";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-200";
      }
    }, []);

    const getStatusLabel = useCallback((status: BookingStatus): string => {
      switch (status) {
        case "Requested":
          return "Pending Review";
        case "Accepted":
          return "Confirmed";
        case "InProgress":
          return "In Progress";
        case "Completed":
          return "Completed";
        case "Cancelled":
          return "Cancelled";
        case "Declined":
          return "Declined";
        case "Disputed":
          return "Disputed";
        default:
          return status;
      }
    }, []);

    // Retry operation with error handling
    const retryOperation = useCallback(
      async (operation: () => Promise<void>) => {
        try {
          clearError();
          await operation();
        } catch (error) {
          //console.error("Retry operation failed:", error);
          // Error is handled by the individual operation
        }
      },
      [clearError],
    );

    // Commission and wallet validation functions
    const checkCommissionValidation = useCallback(
      async (booking: ProviderEnhancedBooking) => {
        try {
          // Only validate for cash payment jobs
          if (booking.paymentMethod !== "CashOnHand") {
            return {
              estimatedCommission: 0,
              hasInsufficientBalance: false,
              commissionValidationMessage:
                "No commission validation needed for digital payments",
              totalBalance: walletBalance,
              heldBalance: walletHeldBalance,
              availableBalance: walletAvailableBalance,
            };
          }

          let estimatedCommission = 0;

          // Check if this is a package booking or regular service booking
          if (booking.servicePackageId && booking.servicePackageId.length > 0) {
            // Multiple package booking - sum commissions from all packages
            for (const packageId of booking.servicePackageId) {
              const pkg = packageDetails.get(packageId);
              if (pkg) {
                estimatedCommission += pkg.commissionFee || 0;
              }
            }

            // If we don't have all package details loaded, use primary package details as fallback
            if (estimatedCommission === 0 && booking.packageDetails) {
              estimatedCommission = booking.packageDetails.commissionFee || 0;
            }
          } else if (booking.serviceDetails) {
            // Regular service booking - use commission from service
            estimatedCommission = booking.serviceDetails.commissionFee;
          }

          // Check against available balance (not total balance)
          const hasInsufficientBalance =
            walletAvailableBalance < estimatedCommission;

          let commissionValidationMessage = "";
          if (hasInsufficientBalance) {
            commissionValidationMessage = `Insufficient available balance. Need ₱${estimatedCommission.toFixed(2)} commission, but only ₱${walletAvailableBalance.toFixed(2)} available (₱${walletHeldBalance.toFixed(2)} held).`;
          } else {
            commissionValidationMessage = `Available: ₱${walletAvailableBalance.toFixed(2)} (${walletHeldBalance.toFixed(2)} held)`;
          }

          return {
            estimatedCommission,
            hasInsufficientBalance,
            commissionValidationMessage,
            totalBalance: walletBalance,
            heldBalance: walletHeldBalance,
            availableBalance: walletAvailableBalance,
          };
        } catch (error) {
          //console.error("Commission validation error:", error);
          return {
            estimatedCommission: 0,
            hasInsufficientBalance: true,
            commissionValidationMessage:
              "Error checking commission requirements",
            totalBalance: walletBalance,
            heldBalance: walletHeldBalance,
            availableBalance: walletAvailableBalance,
          };
        }
      },
      [
        serviceDetails,
        packageDetails,
        walletBalance,
        walletHeldBalance,
        walletAvailableBalance,
      ],
    );
    const canAcceptCashBooking = useCallback(
      async (booking: ProviderEnhancedBooking): Promise<boolean> => {
        if (booking.paymentMethod !== "CashOnHand") {
          return true; // No wallet restrictions for digital payments
        }

        const validation = await checkCommissionValidation(booking);
        return !validation.hasInsufficientBalance;
      },
      [checkCommissionValidation],
    );

    const getWalletBalance = useCallback(async (): Promise<number> => {
      try {
        await fetchBalance();
        return walletBalance;
      } catch (error) {
        //console.error("Error fetching wallet balance:", error);
        return 0;
      }
    }, [fetchBalance, walletBalance]);

    // Initialize data on mount
    useEffect(() => {
      const initializeData = async () => {
        await loadProviderProfile();
      };

      initializeData();
    }, [loadProviderProfile]);

    // Memoized booking update handler
    const handleBookingsUpdate = useCallback(
      async (bookings: Booking[]) => {
        try {
          // Enrich bookings with client data in parallel
          const enrichedBookings = await Promise.all(
            bookings.map((booking) => enrichBookingWithClientData(booking)),
          );

          setProviderBookings((prevBookings) => {
            // Skip update if the data is the same
            if (
              JSON.stringify(prevBookings) === JSON.stringify(enrichedBookings)
            ) {
              return prevBookings;
            }
            return enrichedBookings;
          });
        } catch (error) {
          console.error("Error enriching bookings:", error);
          handleBookingError(error, "enrich provider bookings");
        } finally {
          setLoadingState("bookings", false);
        }
      },
      [enrichBookingWithClientData, handleBookingError],
    );

    // Create debounced version of the handler
    const debouncedBookingsUpdate = useDebounce(handleBookingsUpdate, 300);

    // Subscribe to bookings with realtime updates when provider profile is available
    useEffect(() => {
      if (!providerProfile || !isProviderAuthenticated()) {
        return;
      }

      const currentProviderId = getCurrentProviderId();
      if (!currentProviderId) {
        return;
      }

      setLoadingState("bookings", true);
      clearError();

      try {
        const providerPrincipal = Principal.fromText(currentProviderId);

        // Subscribe to realtime updates with debounced handler
        const unsubscribe = bookingCanisterService.subscribeToProviderBookings(
          providerPrincipal,
          debouncedBookingsUpdate,
        );

        // Cleanup subscription on unmount or when dependencies change
        return () => {
          // Clear any pending debounced updates
          unsubscribe();
        };
      } catch (error) {
        handleBookingError(error, "subscribe to provider bookings");
        setLoadingState("bookings", false);
      }
    }, [
      providerProfile,
      isProviderAuthenticated,
      getCurrentProviderId,
      debouncedBookingsUpdate,
      setLoadingState,
      clearError,
      handleBookingError,
    ]);

    // Calculate analytics when bookings change
    useEffect(() => {
      if (providerBookings.length > 0) {
        setLoadingState("analytics", true);
        try {
          const newAnalytics = calculateAnalytics();
          setAnalytics(newAnalytics);
        } catch (error) {
          //console.error("Error calculating analytics:", error);
        } finally {
          setLoadingState("analytics", false);
        }
      }
    }, [providerBookings, calculateAnalytics, setLoadingState]);

    // New chart data functions
    const getMonthlyRevenue = useCallback((): {
      name: string;
      value: number;
    }[] => {
      const monthlyRevenueMap = new Map<string, number>();
      const now = new Date();

      // Initialize map for the last 12 months with 0 revenue
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString("default", { month: "short" });
        monthlyRevenueMap.set(monthName, 0);
      }

      providerBookings.forEach((booking) => {
        if (booking.isCompleted && booking.completedDate) {
          const completedDate = new Date(booking.completedDate);
          const monthName = completedDate.toLocaleString("default", {
            month: "short",
          });
          const currentRevenue = monthlyRevenueMap.get(monthName) || 0;
          monthlyRevenueMap.set(
            monthName,
            currentRevenue + (booking.actualRevenue || 0),
          );
        }
      });

      return Array.from(monthlyRevenueMap, ([name, value]) => ({
        name,
        value,
      }));
    }, [providerBookings]);

    const getBookingCountByDay = useCallback((): {
      name: string;
      value: number;
    }[] => {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const bookingCounts = new Map<string, number>(
        days.map((day) => [day, 0]),
      );

      providerBookings.forEach((booking) => {
        const createdDate = new Date(booking.createdAt);
        const dayName = days[createdDate.getDay()];
        bookingCounts.set(dayName, (bookingCounts.get(dayName) || 0) + 1);
      });

      return Array.from(bookingCounts, ([name, value]) => ({ name, value }));
    }, [providerBookings]);

    // Return hook interface with enhanced data
    return {
      // Data states
      bookings: providerBookings,
      providerProfile,
      clientProfiles,
      serviceDetails,
      packageDetails,
      analytics,

      // Loading states
      loading,
      loadingClients,
      loadingServices,
      loadingAnalytics,
      refreshing,

      // Error state
      error,

      // Core booking management functions
      loadProviderBookings,
      refreshBookings,
      acceptBooking,
      declineBooking,
      startBooking,
      completeBooking,
      disputeBooking,

      // Individual booking lookup and action functions
      getBookingById: (bookingId: string) =>
        providerBookings.find((booking) => booking.id === bookingId) || null,
      getBookingWithClientData: async (bookingId: string) => {
        const booking = providerBookings.find(
          (booking) => booking.id === bookingId,
        );
        if (!booking) return null;
        return await enrichBookingWithClientData(booking);
      },
      acceptBookingById: async (bookingId: string, scheduledDate?: Date) => {
        try {
          await acceptBooking(bookingId, scheduledDate);
          return true;
        } catch {
          return false;
        }
      },
      declineBookingById: async (bookingId: string) => {
        try {
          await declineBooking(bookingId);
          return true;
        } catch {
          return false;
        }
      },
      startBookingById: async (bookingId: string) => {
        try {
          await startBooking(bookingId);
          return true;
        } catch {
          return false;
        }
      },
      completeBookingById: async (bookingId: string, amountPaid?: number) => {
        try {
          await completeBooking(bookingId, amountPaid);
          return true;
        } catch {
          return false;
        }
      },
      disputeBookingById: async (bookingId: string) => {
        try {
          await disputeBooking(bookingId);
          return true;
        } catch {
          return false;
        }
      },
      isBookingActionInProgress: (bookingId: string, action: string) => {
        return isOperationInProgress(`${action}-${bookingId}`);
      },

      // Data filtering and categorization
      getBookingsByStatus,
      getPendingBookings,
      getUpcomingBookings,
      getActiveBookings,
      getCompletedBookings,
      getTodaysBookings,
      getOverdueBookings,

      // Analytics functions
      calculateAnalytics,
      getRevenueByPeriod,
      getBookingCountByPeriod,
      getMonthlyRevenue,
      getBookingCountByDay,

      // Utility functions
      formatBookingDate,
      formatBookingTime,
      getStatusColor,
      getStatusLabel,
      calculateTimeUntilService,
      enrichBookingWithClientData,
      formatLocationString,

      // State management
      getCurrentProviderId,
      isProviderAuthenticated,
      clearError,
      isOperationInProgress,
      retryOperation,

      // Enhanced helper functions
      getPackageDisplayName,
      hasPackage,
      getServiceDisplayName,
      hasServiceDetails,

      // Commission and wallet validation functions
      checkCommissionValidation,
      canAcceptCashBooking,
      getWalletBalance,
    };
  };

export default useProviderBookingManagement;
