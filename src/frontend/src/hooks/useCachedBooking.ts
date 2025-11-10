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
  } = useBookingCache();
  const [booking, setBooking] = useState<ProviderEnhancedBooking | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setIsFetching(false);
      setMinLoadingComplete(true);
      return;
    }

    const fetchBooking = async () => {
      setIsFetching(true);

      // Minimum loading time to prevent flicker (150ms)
      const minLoadingPromise = new Promise((resolve) =>
        setTimeout(resolve, 150),
      );

      try {
        const fetchedBooking = await getProviderBooking(bookingId);
        setBooking(fetchedBooking);

        // Wait for minimum loading time
        await minLoadingPromise;
      } finally {
        setIsFetching(false);
        setMinLoadingComplete(true);
      }
    };

    fetchBooking();
  }, [bookingId, getProviderBooking]);

  return {
    booking,
    isLoading: booking
      ? false
      : isFetching ||
        !minLoadingComplete ||
        !isProviderBookingsReady ||
        (bookingId ? isLoadingProviderBooking(bookingId) : false),
  };
};

/**
 * Custom hook to fetch and cache a client booking
 * Uses BookingCacheContext for centralized caching with SWR pattern
 *
 * @param bookingId - The booking ID to fetch
 * @returns {booking, isLoading} - The booking data and loading state
 */
export const useCachedClientBooking = (bookingId: string | undefined) => {
  const { getClientBooking, isLoadingClientBooking, isClientBookingsReady } =
    useBookingCache();
  const [booking, setBooking] = useState<EnhancedBooking | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setIsFetching(false);
      setMinLoadingComplete(true);
      return;
    }

    const fetchBooking = async () => {
      setIsFetching(true);

      // Minimum loading time to prevent flicker (150ms)
      const minLoadingPromise = new Promise((resolve) =>
        setTimeout(resolve, 150),
      );

      try {
        const fetchedBooking = await getClientBooking(bookingId);
        setBooking(fetchedBooking);

        // Wait for minimum loading time
        await minLoadingPromise;
      } finally {
        setIsFetching(false);
        setMinLoadingComplete(true);
      }
    };

    fetchBooking();
  }, [bookingId, getClientBooking]);

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
  };
};
