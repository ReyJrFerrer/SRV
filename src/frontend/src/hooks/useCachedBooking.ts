import { useState, useEffect } from "react";
import { useBookingCache } from "../context/BookingCacheContext";
import type { ProviderEnhancedBooking } from "./useProviderBookingManagement";
import type { EnhancedBooking } from "./bookingManagement";

/**
 * Custom hook to fetch and cache a provider booking
 * Uses BookingCacheContext for centralized caching with SWR pattern
 *
 * @param bookingId - The booking ID to fetch
 * @returns {booking, isLoading} - The booking data and loading state
 */
export const useCachedProviderBooking = (bookingId: string | undefined) => {
  const {
    getProviderBooking,
    isLoadingProviderBooking,
    isProviderBookingsReady,
    providerBookingCache,
  } = useBookingCache();

  // Initialize from cache if available
  const [booking, setBooking] = useState<ProviderEnhancedBooking | null>(() => {
    if (bookingId && providerBookingCache.has(bookingId)) {
      return providerBookingCache.get(bookingId) || null;
    }
    return null;
  });

  const [isFetching, setIsFetching] = useState(false);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  // Track if we are currently validating (fetching fresh data)
  const [isValidating, setIsValidating] = useState(!!bookingId);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setIsFetching(false);
      setMinLoadingComplete(true);
      setIsValidating(false);
      return;
    }

    const fetchBooking = async () => {
      setIsFetching(true);
      setIsValidating(true);

      // Minimum loading time to prevent flicker (150ms)
      const minLoadingPromise = new Promise((resolve) =>
        setTimeout(resolve, 150),
      );

      try {
        // Force refresh to ensure we get latest status
        const fetchedBooking = await getProviderBooking(bookingId, {
          forceRefresh: true,
        });
        setBooking(fetchedBooking);

        // Wait for minimum loading time
        await minLoadingPromise;
      } finally {
        setIsFetching(false);
        setMinLoadingComplete(true);
        setIsValidating(false);
      }
    };

    fetchBooking();
  }, [bookingId, getProviderBooking]);

  // Update local state if cache updates from elsewhere
  useEffect(() => {
    if (bookingId && providerBookingCache.has(bookingId)) {
      const cached = providerBookingCache.get(bookingId);
      if (cached && cached !== booking) {
        setBooking(cached);
      }
    }
  }, [bookingId, providerBookingCache, booking]);

  return {
    booking,
    // Loading is true only if we have NO data and are fetching/waiting
    isLoading: booking
      ? false
      : isFetching ||
        !minLoadingComplete ||
        !isProviderBookingsReady ||
        (bookingId ? isLoadingProviderBooking(bookingId) : false),
    // Expose validation state so pages can decide whether to redirect
    isValidating,
  };
};

/**
 * Custom hook to fetch and cache a client booking
 * Uses BookingCacheContext for centralized caching with SWR pattern
 *
 * @param bookingId - The booking ID to fetch
 * @returns {booking, isLoading, isValidating} - The booking data and loading state
 */
export const useCachedClientBooking = (bookingId: string | undefined) => {
  const {
    getClientBooking,
    isLoadingClientBooking,
    isClientBookingsReady,
    clientBookingCache,
  } = useBookingCache();

  // Initialize from cache if available
  const [booking, setBooking] = useState<EnhancedBooking | null>(() => {
    if (bookingId && clientBookingCache.has(bookingId)) {
      return clientBookingCache.get(bookingId) || null;
    }
    return null;
  });

  const [isFetching, setIsFetching] = useState(false);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  // Track if we are currently validating (fetching fresh data)
  const [isValidating, setIsValidating] = useState(!!bookingId);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setIsFetching(false);
      setMinLoadingComplete(true);
      setIsValidating(false);
      return;
    }

    const fetchBooking = async () => {
      setIsFetching(true);
      setIsValidating(true);

      // Minimum loading time to prevent flicker (150ms)
      const minLoadingPromise = new Promise((resolve) =>
        setTimeout(resolve, 150),
      );

      try {
        // Force refresh to ensure we get latest status
        const fetchedBooking = await getClientBooking(bookingId, {
          forceRefresh: true,
        });
        setBooking(fetchedBooking);

        // Wait for minimum loading time
        await minLoadingPromise;
      } finally {
        setIsFetching(false);
        setMinLoadingComplete(true);
        setIsValidating(false);
      }
    };

    fetchBooking();
  }, [bookingId, getClientBooking]);

  // Update local state if cache updates from elsewhere
  useEffect(() => {
    if (bookingId && clientBookingCache.has(bookingId)) {
      const cached = clientBookingCache.get(bookingId);
      if (cached && cached !== booking) {
        setBooking(cached);
      }
    }
  }, [bookingId, clientBookingCache, booking]);

  return {
    booking,
    // Show loading if: fetching, minimum time not complete, or bookings not initialized yet
    // BUT if we already have the booking data, don't show loading (fixes stuck loading state)
    isLoading: booking
      ? false
      : isFetching ||
        !minLoadingComplete ||
        !isClientBookingsReady ||
        (bookingId ? isLoadingClientBooking(bookingId) : false),
    // Expose validation state so pages can decide whether to redirect
    isValidating,
  };
};
