import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Interface for coordinate data
 */
interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Interface for service with coordinates (for bulk calculations)
 */
interface ServiceWithCoords {
  id: string;
  location: Coordinates;
}

/**
 * Interface for the hook result (single service)
 */
interface UseServiceDistanceResult {
  distance: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Interface for bulk distance calculations result
 */
interface UseBulkServiceDistanceResult {
  distances: Record<string, number>;
  loading: boolean;
  error: string | null;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param userCoords User's coordinates
 * @param serviceCoords Service provider's coordinates
 * @returns Distance in kilometers (rounded to 2 decimal places)
 */
export const calculateDistance = (
  userCoords: Coordinates,
  serviceCoords: Coordinates,
): number => {
  const R = 6371; // Earth's radius in kilometers

  // Convert latitude and longitude from degrees to radians
  const lat1Rad = (userCoords.latitude * Math.PI) / 180;
  const lat2Rad = (serviceCoords.latitude * Math.PI) / 180;
  const deltaLatRad =
    ((serviceCoords.latitude - userCoords.latitude) * Math.PI) / 180;
  const deltaLngRad =
    ((serviceCoords.longitude - userCoords.longitude) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Calculate distance and round to 2 decimal places
  const distance = R * c;
  return Math.round(distance * 100) / 100;
};

/**
 * Custom hook to calculate distance between user and service provider
 * @param serviceCoords Service provider's coordinates
 * @returns Object containing distance, loading state, and error
 */
export const useServiceDistance = (
  serviceCoords: Coordinates | null,
): UseServiceDistanceResult => {
  const { location, locationStatus } = useAuth();
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const calculateServiceDistance = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      // Check if we have both user location and service coordinates
      if (!location || !serviceCoords) {
        setDistance(null);
        setError("Location data not available");
        return;
      }

      // Check if location permission is allowed
      if (locationStatus !== "allowed") {
        setDistance(null);
        setError("Location permission not granted");
        return;
      }

      // Validate coordinates
      if (
        !location.latitude ||
        !location.longitude ||
        !serviceCoords.latitude ||
        !serviceCoords.longitude
      ) {
        setDistance(null);
        setError("Invalid coordinate data");
        return;
      }

      // Calculate distance using Haversine formula
      const calculatedDistance = calculateDistance(location, serviceCoords);
      setDistance(calculatedDistance);
    } catch (err) {
      setError("Failed to calculate distance");
      setDistance(null);
    } finally {
      setLoading(false);
    }
  }, [location, locationStatus, serviceCoords]);

  useEffect(() => {
    calculateServiceDistance();
  }, [calculateServiceDistance]);

  return {
    distance,
    loading,
    error,
  };
};

/**
 * Custom hook to calculate distances for multiple services at once
 * @param services Array of services with coordinates
 * @returns Object containing distances map, loading state, and error
 */
export const useBulkServiceDistance = (
  services: ServiceWithCoords[],
): UseBulkServiceDistanceResult => {
  const { location, locationStatus } = useAuth();
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const calculateBulkDistances = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      // Check if we have user location
      if (!location) {
        setDistances({});
        setError("Location data not available");
        return;
      }

      // Check if location permission is allowed
      if (locationStatus !== "allowed") {
        setDistances({});
        setError("Location permission not granted");
        return;
      }

      // Validate user coordinates
      if (!location.latitude || !location.longitude) {
        setDistances({});
        setError("Invalid user coordinate data");
        return;
      }

      // Calculate distances for all services
      const calculatedDistances: Record<string, number> = {};

      services.forEach((service) => {
        if (service.location?.latitude && service.location?.longitude) {
          try {
            calculatedDistances[service.id] = calculateDistance(
              location,
              service.location,
            );
          } catch (err) {
            // //console.warn(
            //   `Failed to calculate distance for service ${service.id}:`,
            //   err,
            // );
          }
        }
      });

      setDistances(calculatedDistances);
    } catch (err) {
      setError("Failed to calculate distances");
      setDistances({});
    } finally {
      setLoading(false);
    }
  }, [location, locationStatus, services]);

  useEffect(() => {
    calculateBulkDistances();
  }, [calculateBulkDistances]);

  return {
    distances,
    loading,
    error,
  };
};

export default useServiceDistance;
