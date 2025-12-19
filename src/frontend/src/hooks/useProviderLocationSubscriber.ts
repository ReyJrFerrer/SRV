/**
 * useProviderLocationSubscriber Hook
 *
 * Subscribes to real-time provider location updates from Firebase RTDB.
 * Used by clients to track their provider's location on a map.
 */

import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { getFirebaseDatabase } from "../services/firebaseApp";

export interface ProviderLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
  updatedAt: number;
  startedAt?: number;
  providerId?: string;
  clientId?: string;
}

interface UseProviderLocationSubscriberResult {
  providerLocation: ProviderLocation | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isStale: boolean;
}

interface UseProviderLocationSubscriberOptions {
  bookingId: string | null | undefined;
  enabled?: boolean;
  staleThresholdMs?: number;
}

export function useProviderLocationSubscriber({
  bookingId,
  enabled = true,
  staleThresholdMs = 30000, // Consider stale after 30 seconds
}: UseProviderLocationSubscriberOptions): UseProviderLocationSubscriberResult {
  const [providerLocation, setProviderLocation] =
    useState<ProviderLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!bookingId || !enabled) {
      setProviderLocation(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const db = getFirebaseDatabase();
      const locationRef = ref(db, `providerLocations/${bookingId}`);

      const handleValue = (snapshot: any) => {
        setIsLoading(false);

        if (snapshot.exists()) {
          const data = snapshot.val() as ProviderLocation;

          // Validate location data
          if (typeof data.lat === "number" && typeof data.lng === "number") {
            setProviderLocation(data);
            setLastUpdated(data.updatedAt);
            setError(null);

            // Check staleness
            const now = Date.now();
            setIsStale(now - data.updatedAt > staleThresholdMs);
          } else {
            setProviderLocation(null);
            setError("Invalid location data");
          }
        } else {
          setProviderLocation(null);
          // No error - node might not exist yet
        }
      };

      const handleError = (err: Error) => {
        setIsLoading(false);
        setError(err.message);
        setProviderLocation(null);
      };

      // Subscribe to real-time updates
      onValue(locationRef, handleValue, handleError);

      // Cleanup subscription
      return () => {
        off(locationRef);
      };
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    }
  }, [bookingId, enabled, staleThresholdMs]);

  // Periodic staleness check
  useEffect(() => {
    if (!lastUpdated) return;

    const checkStale = () => {
      const now = Date.now();
      setIsStale(now - lastUpdated > staleThresholdMs);
    };

    const interval = setInterval(checkStale, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated, staleThresholdMs]);

  return {
    providerLocation,
    isLoading,
    error,
    lastUpdated,
    isStale,
  };
}

export default useProviderLocationSubscriber;
