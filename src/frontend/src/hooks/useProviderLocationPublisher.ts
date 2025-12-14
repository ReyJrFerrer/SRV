/**
 * useProviderLocationPublisher Hook
 *
 * Publishes provider location to Firebase RTDB for real-time tracking.
 * Features:
 * - Throttled updates (max every 3 seconds)
 * - Significant movement detection (>20m or heading change >30°)
 * - Auto-cleanup on unmount
 */

import { useEffect, useRef, useCallback } from "react";
import { ref, set } from "firebase/database";
import { getFirebaseDatabase } from "../services/firebaseApp";

interface ProviderLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
  updatedAt: number;
}

interface UseProviderLocationPublisherOptions {
  bookingId: string | null | undefined;
  enabled?: boolean;
  throttleMs?: number;
  minDistanceM?: number;
  minHeadingChange?: number;
}

// Haversine distance calculation
const toRad = (deg: number) => (deg * Math.PI) / 180;
const EARTH_RADIUS_M = 6371000;

function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

export function useProviderLocationPublisher({
  bookingId,
  enabled = true,
  throttleMs = 3000,
  minDistanceM = 20,
  minHeadingChange = 30,
}: UseProviderLocationPublisherOptions) {
  const lastPublishTimeRef = useRef<number>(0);
  const lastLocationRef = useRef<ProviderLocation | null>(null);
  const isPublishingRef = useRef(false);

  const publishLocation = useCallback(
    async (
      location: google.maps.LatLngLiteral,
      heading?: number | null,
      speed?: number | null,
      accuracy?: number,
    ) => {
      if (!bookingId || !enabled || isPublishingRef.current) return;

      const now = Date.now();
      const timeSinceLastPublish = now - lastPublishTimeRef.current;

      // Check throttle
      if (timeSinceLastPublish < throttleMs) {
        return;
      }

      // Check for significant change
      const lastLoc = lastLocationRef.current;
      if (lastLoc) {
        const distance = haversineDistanceMeters(
          { lat: lastLoc.lat, lng: lastLoc.lng },
          { lat: location.lat, lng: location.lng },
        );

        const headingChange =
          heading !== null &&
          heading !== undefined &&
          lastLoc.heading !== null &&
          lastLoc.heading !== undefined
            ? Math.abs(heading - lastLoc.heading)
            : 0;

        // Skip if no significant change
        if (distance < minDistanceM && headingChange < minHeadingChange) {
          return;
        }
      }

      // Publish to RTDB
      isPublishingRef.current = true;
      try {
        const db = getFirebaseDatabase();
        const locationRef = ref(db, `providerLocations/${bookingId}`);

        const locationData: ProviderLocation = {
          lat: location.lat,
          lng: location.lng,
          heading: heading ?? null,
          speed: speed ?? null,
          accuracy: accuracy ?? 0,
          updatedAt: now,
        };

        await set(locationRef, locationData);

        lastPublishTimeRef.current = now;
        lastLocationRef.current = locationData;
      } catch (error) {
        console.error(
          "[useProviderLocationPublisher] Failed to publish:",
          error,
        );
      } finally {
        isPublishingRef.current = false;
      }
    },
    [bookingId, enabled, throttleMs, minDistanceM, minHeadingChange],
  );

  // Force publish (for initial location)
  const forcePublish = useCallback(
    async (
      location: google.maps.LatLngLiteral,
      heading?: number | null,
      speed?: number | null,
      accuracy?: number,
    ) => {
      if (!bookingId || !enabled) return;

      const now = Date.now();
      isPublishingRef.current = true;

      try {
        const db = getFirebaseDatabase();
        const locationRef = ref(db, `providerLocations/${bookingId}`);

        const locationData: ProviderLocation = {
          lat: location.lat,
          lng: location.lng,
          heading: heading ?? null,
          speed: speed ?? null,
          accuracy: accuracy ?? 0,
          updatedAt: now,
        };

        await set(locationRef, locationData);

        lastPublishTimeRef.current = now;
        lastLocationRef.current = locationData;
      } catch (error) {
        console.error(
          "[useProviderLocationPublisher] Failed to force publish:",
          error,
        );
      } finally {
        isPublishingRef.current = false;
      }
    },
    [bookingId, enabled],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't delete the node here because the backend handles cleanup
      // when the booking status changes
      lastLocationRef.current = null;
      lastPublishTimeRef.current = 0;
    };
  }, [bookingId]);

  return {
    publishLocation,
    forcePublish,
    lastLocation: lastLocationRef.current,
  };
}

export default useProviderLocationPublisher;
