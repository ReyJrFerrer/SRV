import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useProviderBookingManagement } from "../hooks/useProviderBookingManagement";
import { useBookingManagement } from "../hooks/bookingManagement";
import type { ProviderEnhancedBooking } from "../hooks/useProviderBookingManagement";
import type { EnhancedBooking } from "../hooks/bookingManagement";

interface BookingCacheContextValue {
  // Provider bookings
  getProviderBooking: (
    bookingId: string,
  ) => Promise<ProviderEnhancedBooking | null>;
  providerBookingCache: Map<string, ProviderEnhancedBooking>;
  isLoadingProviderBooking: (bookingId: string) => boolean;
  isProviderBookingsReady: boolean; // Tracks if initial load is complete

  // Client bookings
  getClientBooking: (bookingId: string) => Promise<EnhancedBooking | null>;
  clientBookingCache: Map<string, EnhancedBooking>;
  isLoadingClientBooking: (bookingId: string) => boolean;
  isClientBookingsReady: boolean; // Tracks if initial load is complete

  // Cache management
  invalidateBooking: (bookingId: string) => void;
  clearCache: () => void;
}

const BookingCacheContext = createContext<
  BookingCacheContextValue | undefined
>(undefined);

export const BookingCacheProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Provider booking management
  const { getBookingById: getProviderBookingById, bookings: providerBookings, loading: providerLoading } =
    useProviderBookingManagement();

  // Client booking management
  const { getBookingById: getClientBookingById, bookings: clientBookings, loading: clientLoading } =
    useBookingManagement();

  // Track initialization - true after first load completes (even if empty)
  const [isProviderBookingsReady, setIsProviderBookingsReady] = useState(false);
  const [isClientBookingsReady, setIsClientBookingsReady] = useState(false);
  const hasProviderLoadedOnce = useRef(false);
  const hasClientLoadedOnce = useRef(false);

  // Caches
  const [providerBookingCache, setProviderBookingCache] = useState<
    Map<string, ProviderEnhancedBooking>
  >(new Map());
  const [clientBookingCache, setClientBookingCache] = useState<
    Map<string, EnhancedBooking>
  >(new Map());

  // Track loading states per booking ID
  const [providerLoadingIds, setProviderLoadingIds] = useState<Set<string>>(
    new Set(),
  );
  const [clientLoadingIds, setClientLoadingIds] = useState<Set<string>>(
    new Set(),
  );

  // Track in-flight requests to prevent duplicate fetches
  const providerInflightRequests = useRef<
    Map<string, Promise<ProviderEnhancedBooking | null>>
  >(new Map());
  const clientInflightRequests = useRef<
    Map<string, Promise<EnhancedBooking | null>>
  >(new Map());

  // Mark provider bookings as ready after first load
  useEffect(() => {
    if (!providerLoading && !hasProviderLoadedOnce.current) {
      hasProviderLoadedOnce.current = true;
      // Small delay to prevent flicker
      const timer = setTimeout(() => {
        setIsProviderBookingsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [providerLoading]);

  // Mark client bookings as ready after first load
  useEffect(() => {
    if (!clientLoading && !hasClientLoadedOnce.current) {
      hasClientLoadedOnce.current = true;
      // Small delay to prevent flicker
      const timer = setTimeout(() => {
        setIsClientBookingsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [clientLoading]);

  // Auto-populate cache when bookings array updates
  useEffect(() => {
    if (providerBookings.length > 0) {
      setProviderBookingCache((prev) => {
        const newCache = new Map(prev);
        providerBookings.forEach((booking) => {
          newCache.set(booking.id, booking);
        });
        return newCache;
      });
    }
  }, [providerBookings]);

  useEffect(() => {
    if (clientBookings.length > 0) {
      setClientBookingCache((prev) => {
        const newCache = new Map(prev);
        clientBookings.forEach((booking) => {
          newCache.set(booking.id, booking);
        });
        return newCache;
      });
    }
  }, [clientBookings]);

  // Provider booking fetcher
  const getProviderBooking = useCallback(
    async (bookingId: string): Promise<ProviderEnhancedBooking | null> => {
      // 1. Check cache first (use ref to avoid dependency)
      const cached = providerBookingCache.get(bookingId);
      if (cached) {
        return cached;
      }

      // 2. Check if already loading (dedupe requests)
      const inflightRequest = providerInflightRequests.current.get(bookingId);
      if (inflightRequest) {
        return inflightRequest;
      }

      // 3. Fetch from backend
      setProviderLoadingIds((prev) => new Set(prev).add(bookingId));

      const fetchPromise = (async () => {
        try {
          const booking = await getProviderBookingById(bookingId);
          if (booking) {
            setProviderBookingCache((prev) => {
              const newCache = new Map(prev);
              newCache.set(bookingId, booking);
              return newCache;
            });
          }
          return booking;
        } catch (error) {
          console.error(`Error fetching provider booking ${bookingId}:`, error);
          return null;
        } finally {
          setProviderLoadingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(bookingId);
            return newSet;
          });
          providerInflightRequests.current.delete(bookingId);
        }
      })();

      providerInflightRequests.current.set(bookingId, fetchPromise);
      return fetchPromise;
    },
    [getProviderBookingById], // Removed providerBookingCache from deps
  );

  // Client booking fetcher
  const getClientBooking = useCallback(
    async (bookingId: string): Promise<EnhancedBooking | null> => {
      // 1. Check cache first (use ref to avoid dependency)
      const cached = clientBookingCache.get(bookingId);
      if (cached) {
        return cached;
      }

      // 2. Check if already loading (dedupe requests)
      const inflightRequest = clientInflightRequests.current.get(bookingId);
      if (inflightRequest) {
        return inflightRequest;
      }

      // 3. Fetch from backend
      setClientLoadingIds((prev) => new Set(prev).add(bookingId));

      const fetchPromise = (async () => {
        try {
          const booking = await getClientBookingById(bookingId);
          if (booking) {
            setClientBookingCache((prev) => {
              const newCache = new Map(prev);
              newCache.set(bookingId, booking);
              return newCache;
            });
          }
          return booking;
        } catch (error) {
          console.error(`Error fetching client booking ${bookingId}:`, error);
          return null;
        } finally {
          setClientLoadingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(bookingId);
            return newSet;
          });
          clientInflightRequests.current.delete(bookingId);
        }
      })();

      clientInflightRequests.current.set(bookingId, fetchPromise);
      return fetchPromise;
    },
    [getClientBookingById], // Removed clientBookingCache from deps
  );

  // Loading state checkers
  const isLoadingProviderBooking = useCallback(
    (bookingId: string): boolean => {
      return providerLoadingIds.has(bookingId);
    },
    [providerLoadingIds],
  );

  const isLoadingClientBooking = useCallback(
    (bookingId: string): boolean => {
      return clientLoadingIds.has(bookingId);
    },
    [clientLoadingIds],
  );

  // Cache management
  const invalidateBooking = useCallback((bookingId: string) => {
    setProviderBookingCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(bookingId);
      return newCache;
    });
    setClientBookingCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(bookingId);
      return newCache;
    });
  }, []);

  const clearCache = useCallback(() => {
    setProviderBookingCache(new Map());
    setClientBookingCache(new Map());
  }, []);

  const value: BookingCacheContextValue = {
    getProviderBooking,
    providerBookingCache,
    isLoadingProviderBooking,
    isProviderBookingsReady,
    getClientBooking,
    clientBookingCache,
    isLoadingClientBooking,
    isClientBookingsReady,
    invalidateBooking,
    clearCache,
  };

  return (
    <BookingCacheContext.Provider value={value}>
      {children}
    </BookingCacheContext.Provider>
  );
};

export const useBookingCache = (): BookingCacheContextValue => {
  const context = useContext(BookingCacheContext);
  if (!context) {
    throw new Error(
      "useBookingCache must be used within a BookingCacheProvider",
    );
  }
  return context;
};
