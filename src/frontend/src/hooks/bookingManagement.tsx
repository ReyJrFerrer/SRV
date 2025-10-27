import { useState, useEffect, useCallback, useMemo } from "react";
import { Principal } from "@dfinity/principal";
import {
  Booking as BaseBooking,
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

// Extended Booking interface with package support (using servicePackageId from backend)
export interface Booking extends BaseBooking {
  servicePackageId: string[]; // Array of package IDs for multiple package bookings
  packageName?: string; // This we'll populate from service data
}

// Enhanced Booking interface with provider and service data
export interface EnhancedBooking extends Booking {
  providerProfile?: FrontendProfile;
  serviceDetails?: Service;
  packageDetails?: ServicePackage;
  // Override the original fields with enhanced data
  providerName: string;
  serviceName: string;
  packageName?: string;
  formattedLocation?: string;
  isProviderDataLoaded?: boolean;
  isServiceDataLoaded?: boolean;
  isPackageDataLoaded?: boolean;
}

// Types for hook state management
interface LoadingStates {
  bookings: boolean;
  profile: boolean;
  providers: boolean;
  services: boolean;
  packages: boolean;
  operations: Map<string, boolean>;
}

interface BookingManagementHook {
  // Data states
  bookings: EnhancedBooking[];
  userProfile: FrontendProfile | null;
  providerProfiles: Map<string, FrontendProfile>;
  serviceDetails: Map<string, Service>;
  packageDetails: Map<string, ServicePackage>;

  // Loading states
  loading: boolean;
  loadingProfiles: boolean;
  loadingServices: boolean;
  refreshing: boolean;

  // Error state
  error: string | null;

  // Functions
  bookingsByStatus: (status: BookingStatus) => EnhancedBooking[];
  updateBookingStatus: (
    id: string,
    status: BookingStatus,
    cancelReason: string,
  ) => Promise<void>;
  refreshBookings: () => Promise<void>;
  clearError: () => void;
  getBookingCount: (status: BookingStatus) => number;
  formatBookingDate: (dateString: string) => string;
  getStatusColor: (status: BookingStatus) => string;
  enrichBookingWithAllData: (booking: Booking) => Promise<EnhancedBooking>;
  formatLocationString: (location: any) => string;
  getCurrentUserId: () => string | null;
  isUserAuthenticated: () => boolean;
  retryOperation: (operation: string) => Promise<void>;
  isOperationInProgress: (operation: string) => boolean;
  // Package helper functions
  getPackageDisplayName: (booking: EnhancedBooking) => string;
  hasPackage: (booking: EnhancedBooking) => boolean;
  // Service helper functions
  getServiceDisplayName: (booking: EnhancedBooking) => string;
  hasServiceDetails: (booking: EnhancedBooking) => boolean;
}

export const useBookingManagement = (): BookingManagementHook => {
  // Core state management
  const [userBookings, setUserBookings] = useState<EnhancedBooking[]>([]);
  const [userProfile, setUserProfile] = useState<FrontendProfile | null>(null);
  const [providerProfiles, setProviderProfiles] = useState<
    Map<string, FrontendProfile>
  >(new Map());
  const [serviceDetails, setServiceDetails] = useState<Map<string, Service>>(
    new Map(),
  );
  const [packageDetails, setPackageDetails] = useState<
    Map<string, ServicePackage>
  >(new Map());

  // Loading states
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    bookings: false,
    profile: false,
    providers: false,
    services: false,
    packages: false,
    operations: new Map(),
  });

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed loading states
  const loading = useMemo(
    () => loadingStates.bookings || loadingStates.profile,
    [loadingStates.bookings, loadingStates.profile],
  );

  const loadingProfiles = useMemo(
    () => loadingStates.providers,
    [loadingStates.providers],
  );

  const loadingServices = useMemo(
    () => loadingStates.services || loadingStates.packages,
    [loadingStates.services, loadingStates.packages],
  );

  // Authentication functions
  const getCurrentUserId = useCallback((): string | null => {
    try {
      return userProfile?.id || null;
    } catch {
      return null;
    }
  }, [userProfile]);

  const isUserAuthenticated = useCallback((): boolean => {
    return userProfile !== null;
  }, [userProfile]);

  // Error handling functions
  const handleBookingError = useCallback((error: any, operation: string) => {
    //console.error(`Error in ${operation}:`, error);
    const errorMessage = error?.message || `Failed to ${operation}`;
    setError(errorMessage);
  }, []);

  const handleAuthError = useCallback(() => {
    setError("Authentication required. Please login to continue.");
    setUserProfile(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Loading state management
  const setLoadingState = useCallback((operation: string, loading: boolean) => {
    setLoadingStates((prev) => {
      const newOperations = new Map(prev.operations);
      if (loading) {
        newOperations.set(operation, true);
      } else {
        newOperations.delete(operation);
      }

      return {
        ...prev,
        operations: newOperations,
        [operation]: loading,
      };
    });
  }, []);

  const isOperationInProgress = useCallback(
    (operation: string): boolean => {
      return loadingStates.operations.get(operation) || false;
    },
    [loadingStates.operations],
  );

  // Caching functions
  const cacheProviderProfile = useCallback(
    (providerId: string, profile: FrontendProfile) => {
      setProviderProfiles((prev) => new Map(prev.set(providerId, profile)));
    },
    [],
  );

  const getCachedProviderProfile = useCallback(
    (providerId: string): FrontendProfile | null => {
      return providerProfiles.get(providerId) || null;
    },
    [providerProfiles],
  );

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

  // Location formatting function
  const formatLocationString = useCallback((location: any): string => {
    if (!location) return "Location not specified";

    // Handle string location
    if (typeof location === "string") {
      return location;
    }

    // Handle object location with address components
    if (typeof location === "object") {
      const { address, city, state, country, latitude, longitude } = location;

      // Build location string from available components
      const components = [];

      if (address && address.trim()) components.push(address.trim());
      if (city && city.trim()) components.push(city.trim());
      if (state && state.trim()) components.push(state.trim());

      // If we have address components, use them
      if (components.length > 0) {
        return components.join(", ");
      }

      // If we only have coordinates, format them nicely
      if (latitude && longitude) {
        return `${parseFloat(latitude).toFixed(4)}°, ${parseFloat(longitude).toFixed(4)}°`;
      }

      // Fallback for other object structures
      if (country) return country;
    }

    return "Location not available";
  }, []);

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

  // Enhanced provider profile loading
  const loadProviderProfile = useCallback(
    async (providerId: string): Promise<FrontendProfile | null> => {
      try {
        // Check cache first
        const cached = getCachedProviderProfile(providerId);
        if (cached) {
          return cached;
        }
        setLoadingState("providers", true);

        const profile = await authCanisterService.getProfile(providerId);

        if (profile) {
          cacheProviderProfile(providerId, profile);
          return profile;
        } else {
          return null;
        }
      } catch (error) {
        // //console.error(
        //   `❌ Error loading provider profile for ${providerId}:`,
        //   error,
        // );
        return null;
      } finally {
        setLoadingState("providers", false);
      }
    },
    [getCachedProviderProfile, setLoadingState, cacheProviderProfile],
  );

  // Enhanced booking enrichment with all data
  const enrichBookingWithAllData = useCallback(
    async (booking: Booking): Promise<EnhancedBooking> => {
      try {
        // Load provider and service data
        const [providerProfile, serviceDetails] = await Promise.all([
          loadProviderProfile(booking.providerId.toString()),
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

        // Enhanced mapping with proper packageName handling using servicePackageId array
        const enhancedBooking: EnhancedBooking = {
          ...booking,
          // Enhanced data objects
          providerProfile: providerProfile || undefined,
          serviceDetails: serviceDetails || undefined,
          packageDetails: packageDetails || undefined,

          // Enhanced string fields (override original booking data with fetched data)
          providerName:
            providerProfile?.name || booking.providerName || "Unknown Provider",
          serviceName:
            serviceDetails?.title || booking.serviceName || "Unknown Service",
          packageName:
            packageNames.length > 0
              ? packageNames.join(", ") // Join multiple package names
              : booking.packageName ||
                (booking.servicePackageId.length > 0
                  ? "Unknown Package"
                  : undefined),

          // Additional enhanced fields
          formattedLocation,
          isProviderDataLoaded: !!providerProfile,
          isServiceDataLoaded: !!serviceDetails,
          isPackageDataLoaded:
            !!packageDetails || booking.servicePackageId.length === 0, // Consider loaded if no packages
        };

        return enhancedBooking;
      } catch (error) {
        //console.error(`❌ Error enriching booking ${booking.id}:`, error);

        // Return booking with minimal enhancement but proper packageName handling
        return {
          ...booking,
          providerName: booking.providerName || "Unknown Provider",
          serviceName: booking.serviceName || "Unknown Service",
          packageName:
            booking.packageName ||
            (booking.servicePackageId.length > 0
              ? "Loading Package..."
              : undefined),
          formattedLocation: formatLocationString(booking.location),
          isProviderDataLoaded: false,
          isServiceDataLoaded: false,
          isPackageDataLoaded: false,
        };
      }
    },
    [
      loadProviderProfile,
      loadServiceDetails,
      loadPackageDetails,
      formatLocationString,
    ],
  );

  // Enhanced helper functions for better package handling using servicePackageId array
  const getPackageDisplayName = useCallback(
    (booking: EnhancedBooking): string => {
      if (!booking.servicePackageId || booking.servicePackageId.length === 0) {
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

  const hasPackage = useCallback((booking: EnhancedBooking): boolean => {
    return booking.servicePackageId && booking.servicePackageId.length > 0;
  }, []);

  // Service helper functions
  const getServiceDisplayName = useCallback(
    (booking: EnhancedBooking): string => {
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

  const hasServiceDetails = useCallback((booking: EnhancedBooking): boolean => {
    return !!booking.serviceDetails || !!booking.serviceName;
  }, []);

  // Transform base bookings to our extended booking interface
  const transformBooking = useCallback((baseBooking: BaseBooking): Booking => {
    // Handle field name mismatch: backend returns 'servicePackageIds', frontend expects 'servicePackageId'
    const backendBooking = baseBooking as any;

    return {
      ...baseBooking,
      // Map servicePackageIds (from backend) to servicePackageId (frontend interface)
      servicePackageId:
        backendBooking.servicePackageIds ||
        backendBooking.servicePackageId ||
        [],
      packageName: undefined, // Will be populated from service data
    };
  }, []);

  // Enhanced data loading functions
  const loadUserProfile = useCallback(async () => {
    try {
      setLoadingState("profile", true);
      clearError();

      const profile = await authCanisterService.getMyProfile();
      setUserProfile(profile);
    } catch (error) {
      handleBookingError(error, "load user profile");
      handleAuthError();
    } finally {
      setLoadingState("profile", false);
    }
  }, [setLoadingState, clearError, handleBookingError, handleAuthError]);

  const loadUserBookings = useCallback(async () => {
    if (!isUserAuthenticated()) {
      handleAuthError();
      return;
    }

    try {
      setLoadingState("bookings", true);
      clearError();

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        throw new Error("No authenticated user found");
      }

      const userPrincipal = Principal.fromText(currentUserId);
      const rawBookings =
        await bookingCanisterService.getClientBookings(userPrincipal);

      // Transform base bookings to extended bookings with package support
      const transformedBookings = rawBookings.map(transformBooking);

      // Enrich bookings with all data (provider, service, package) in parallel
      const enrichedBookings = await Promise.all(
        transformedBookings.map((booking) => enrichBookingWithAllData(booking)),
      );

      setUserBookings(enrichedBookings);
    } catch (error) {
      handleBookingError(error, "load user bookings");
    } finally {
      setLoadingState("bookings", false);
    }
  }, [
    isUserAuthenticated,
    handleAuthError,
    setLoadingState,
    clearError,
    getCurrentUserId,
    handleBookingError,
    enrichBookingWithAllData,
    transformBooking,
  ]);

  const refreshBookings = useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear all caches to ensure fresh data
      setProviderProfiles(new Map());
      setServiceDetails(new Map());
      setPackageDetails(new Map());
      await loadUserBookings();
    } finally {
      setRefreshing(false);
    }
  }, [loadUserBookings]);

  // Booking status management
  const updateBookingStatus = useCallback(
    async (
      bookingId: string,
      newStatus: BookingStatus,
      cancelReason: string,
    ) => {
      try {
        setLoadingState(`update-${bookingId}`, true);
        clearError();

        let updatedBooking: Booking | null = null;

        switch (newStatus) {
          case "Cancelled":
            if (!cancelReason) {
              throw new Error("A reason for cancellation is required");
            }
            updatedBooking = await bookingCanisterService.cancelBooking(
              bookingId,
              cancelReason,
            );
            break;
          case "Accepted":
            updatedBooking = await bookingCanisterService.acceptBooking(
              bookingId,
              new Date(),
            );
            break;
          case "Declined":
            updatedBooking =
              await bookingCanisterService.declineBooking(bookingId);
            break;
          case "InProgress":
            updatedBooking =
              await bookingCanisterService.startBooking(bookingId);
            break;
          case "Completed":
            updatedBooking =
              await bookingCanisterService.completeBooking(bookingId);
            break;
          case "Disputed":
            updatedBooking =
              await bookingCanisterService.disputeBooking(bookingId);
            break;
          default:
            throw new Error(`Unsupported status update: ${newStatus}`);
        }

        if (updatedBooking) {
          // Enrich the updated booking and update state
          const enrichedBooking =
            await enrichBookingWithAllData(updatedBooking);
          setUserBookings((prev) =>
            prev.map((booking) =>
              booking.id === bookingId ? enrichedBooking : booking,
            ),
          );
        }
      } catch (error) {
        handleBookingError(error, `update booking status to ${newStatus}`);
        throw error;
      } finally {
        setLoadingState(`update-${bookingId}`, false);
      }
    },
    [setLoadingState, clearError, handleBookingError, enrichBookingWithAllData],
  );

  // Data processing functions
  const getBookingsByStatus = useCallback(
    (status: BookingStatus): EnhancedBooking[] => {
      return userBookings.filter((booking) => booking.status === status);
    },
    [userBookings],
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

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const getStatusColor = useCallback((status: BookingStatus): string => {
    switch (status) {
      case "Requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Accepted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "InProgress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Declined":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Disputed":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const getBookingCount = useCallback(
    (status: BookingStatus): number => {
      return getBookingsByStatus(status).length;
    },
    [getBookingsByStatus],
  );

  // Retry operation function
  const retryOperation = useCallback(
    async (operation: string) => {
      clearError();

      switch (operation) {
        case "loadBookings":
          await loadUserBookings();
          break;
        case "loadProfile":
          await loadUserProfile();
          break;
        case "refreshBookings":
          await refreshBookings();
          break;
        default:
        //console.warn(`Unknown operation to retry: ${operation}`);
      }
    },
    [clearError, loadUserBookings, loadUserProfile, refreshBookings],
  );

  // Initialize data on mount
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Subscribe to bookings with realtime updates when user is authenticated
  useEffect(() => {
    if (!isUserAuthenticated()) {
      return;
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      return;
    }

    setLoadingState("bookings", true);
    clearError();

    try {
      const userPrincipal = Principal.fromText(currentUserId);

      // Subscribe to realtime updates
      const unsubscribe = bookingCanisterService.subscribeToClientBookings(
        userPrincipal,
        async (bookings) => {
          try {
            // Transform base bookings to extended bookings with package support
            const transformedBookings = bookings.map(transformBooking);

            // Enrich bookings with all data (provider, service, package) in parallel
            const enrichedBookings = await Promise.all(
              transformedBookings.map((booking) =>
                enrichBookingWithAllData(booking),
              ),
            );

            setUserBookings(enrichedBookings);
            setLoadingState("bookings", false);
          } catch (error) {
            console.error("Error enriching client bookings:", error);
            handleBookingError(error, "enrich client bookings");
            setLoadingState("bookings", false);
          }
        },
      );

      // Cleanup subscription on unmount or when dependencies change
      return () => {
        unsubscribe();
      };
    } catch (error) {
      handleBookingError(error, "subscribe to client bookings");
      setLoadingState("bookings", false);
    }
  }, [
    isUserAuthenticated,
    getCurrentUserId,
    transformBooking,
    enrichBookingWithAllData,
    setLoadingState,
    clearError,
    handleBookingError,
  ]);

  // Return hook interface
  return {
    // Data states
    bookings: userBookings,
    userProfile,
    providerProfiles,
    serviceDetails,
    packageDetails,

    // Loading states
    loading,
    loadingProfiles,
    loadingServices,
    refreshing,

    // Error state
    error,

    // Functions
    bookingsByStatus: getBookingsByStatus,
    updateBookingStatus,
    refreshBookings,
    clearError,
    getBookingCount,
    formatBookingDate,
    getStatusColor,
    enrichBookingWithAllData,
    formatLocationString,
    getCurrentUserId,
    isUserAuthenticated,
    retryOperation,
    isOperationInProgress,

    // Enhanced helper functions
    getPackageDisplayName,
    hasPackage,
    getServiceDisplayName,
    hasServiceDetails,
  };
};

export default useBookingManagement;
