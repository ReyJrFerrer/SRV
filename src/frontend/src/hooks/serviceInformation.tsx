import { useState, useEffect, useCallback } from "react";
// import { useAuth } from "../context/AuthContext";
import authCanisterService, {
  FrontendProfile,
} from "../services/authCanisterService";
import serviceCanisterService, {
  Service,
  ServiceCategory,
  ServicePackage,
} from "../services/serviceCanisterService";
import { useLocationStore } from "../store/locationStore";
import { calculateDistance } from "./useServiceDistance";

// EnrichedService interface as specified
export interface EnrichedService {
  // Service data
  id: string;
  slug: string;
  name: string;
  title: string;
  heroImage: string;
  description: string;

  // Provider data (from auth canister)
  providerName: string;
  providerAvatar: string;
  providerId: string;

  // Pricing and rating
  rating: { average: number; count: number };
  price: { amount: number; unit: string; display: string };

  // Location and category
  location: {
    address: string;
    city: string;
    state: string;
    latitude?: number;
    longitude?: number;
    serviceDistance: number;
    serviceDistanceUnit: string;
  };
  category: { name: string; id: string; slug: string };

  // Availability
  availability: { isAvailable: boolean };
}

// Hook result interface
interface UseServicesResult {
  services: EnrichedService[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Transforms a service and provider profile into the enriched service format
 */
const transformToEnrichedService = (
  service: Service,
  providerProfile: FrontendProfile | null,
  servicePackages?: ServicePackage[],
): EnrichedService => {
  // Create a slug from the title
  const slug = service.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  // Calculate the lowest price from service packages, fallback to service price
  const getLowestPrice = (): number => {
    if (servicePackages && servicePackages.length > 0) {
      return Math.min(
        ...servicePackages.map((pkg) => pkg.price + pkg.commissionFee),
      );
    }
    return service.price;
  };

  const lowestPrice = getLowestPrice();

  return {
    id: service.id,
    slug,
    name: service.title, // Using title as name
    title: service.title,
    heroImage: service.category.imageUrl, // Using category image as hero image
    description: service.description,

    // Provider data
    providerName: providerProfile?.name || "Unknown Provider",
    providerAvatar: providerProfile?.profilePicture?.imageUrl || "",
    providerId: service.providerId.toString(),

    // Pricing and rating
    rating: {
      average: service.rating || 0,
      count: service.reviewCount,
    },
    price: {
      amount: lowestPrice,
      unit: "starting from", // Updated to reflect it's the lowest price
      display: `₱${lowestPrice.toLocaleString()}`,
    },

    // Location
    location: {
      address: service.location.address,
      city: service.location.city,
      state: service.location.state,
      latitude: service.location.latitude,
      longitude: service.location.longitude,
      serviceDistance: 10, // Default radius - could be fetched from actual data if available
      serviceDistanceUnit: "km",
    },

    // Category
    category: {
      name: service.category.name,
      id: service.category.id,
      slug: service.category.slug,
    },

    // Availability - default to true if service status is Available
    availability: {
      isAvailable: service.status === "Available",
    },
  };
};

/**
 * Helper function to fetch provider profiles for a list of services
 */
const fetchProviderProfiles = async (
  services: Service[],
): Promise<Record<string, FrontendProfile | null>> => {
  // Create a map of all provider IDs to reduce redundant API calls
  const providerIds = Array.from(
    new Set(services.map((service) => service.providerId.toString())),
  );

  // Fetch all provider profiles in parallel
  const providerProfiles = await Promise.all(
    providerIds.map(async (providerId) => {
      try {
        return await authCanisterService.getProfile(providerId);
      } catch (err) {
        // //console.error(
        //   `Failed to fetch profile for provider ${providerId}`,
        //   err,
        // );
        return null;
      }
    }),
  );

  // Create a map for quick provider lookup
  return providerIds.reduce(
    (map, id, index) => {
      map[id] = providerProfiles[index];
      return map;
    },
    {} as Record<string, FrontendProfile | null>,
  );
};

/**
 * Helper function to fetch service packages for a list of services
 */
const fetchServicePackages = async (
  services: Service[],
): Promise<Map<string, ServicePackage[]>> => {
  const servicePackagesMap = new Map<string, ServicePackage[]>();

  await Promise.all(
    services.map(async (service) => {
      try {
        const packages = await serviceCanisterService.getServicePackages(
          service.id,
        );
        servicePackagesMap.set(service.id, packages);
      } catch (err) {
        // If fetching packages fails, we'll use service price as fallback
        servicePackagesMap.set(service.id, []);
      }
    }),
  );

  return servicePackagesMap;
};

/**
 * Helper function to transform services with provider data and packages
 */
const transformServicesWithData = (
  services: Service[],
  providerMap: Record<string, FrontendProfile | null>,
  servicePackagesMap: Map<string, ServicePackage[]>,
): EnrichedService[] => {
  return services.map((service) => {
    const providerProfile = providerMap[service.providerId.toString()];
    const servicePackages = servicePackagesMap.get(service.id) || [];
    return transformToEnrichedService(
      service,
      providerProfile,
      servicePackages,
    );
  });
};

/**
 * Hook to subscribe to all services with provider information (real-time)
 * This hook listens to Firestore changes and updates services in real-time
 */
export const useAllServicesWithProviders = (): UseServicesResult => {
  const [services, setServices] = useState<EnrichedService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // User location for area-based filtering
  const { userAddress, userProvince, location } = useLocationStore();

  const filterAndSortByArea = useCallback(
    (items: EnrichedService[]): EnrichedService[] => {
      // If we don't have any user geo context, don't filter
      if (!userProvince && !userAddress) return items;

      const RADIUS_KM = 25; // treat "near municipalities" within 25 km
      const hasUserCoords = !!location?.latitude && !!location?.longitude;

      const normalizeCity = (val: string) =>
        (val || "")
          .toLowerCase()
          .replace(/\bcity\b/g, "")
          .replace(/\s+/g, " ")
          .trim();
      const normalizeProvince = (val: string) =>
        (val || "").toLowerCase().trim();

      const inSameProvince = (svc: EnrichedService) =>
        normalizeProvince(svc.location.state) ===
        normalizeProvince(userProvince || "");
      const inSameCity = (svc: EnrichedService) =>
        normalizeCity(svc.location.city) === normalizeCity(userAddress || "");
      const withinRadius = (svc: EnrichedService) => {
        if (!hasUserCoords) return false;
        const lat = svc.location?.latitude;
        const lng = svc.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        try {
          const d = calculateDistance(
            { latitude: location!.latitude, longitude: location!.longitude },
            { latitude: lat, longitude: lng },
          );
          return d <= RADIUS_KM;
        } catch {
          return false;
        }
      };

      // Include:
      // - Always include same-city matches (even if province strings don't match)
      // - Else include services in the same province that are within radius
      const filtered = items.filter(
        (svc) => inSameCity(svc) || (inSameProvince(svc) && withinRadius(svc)),
      );

      // Sort: same city first, then by distance (if available)
      const withDistance = filtered.map((svc) => {
        let dist: number | null = null;
        if (hasUserCoords) {
          const lat = svc.location?.latitude;
          const lng = svc.location?.longitude;
          if (typeof lat === "number" && typeof lng === "number") {
            try {
              dist = calculateDistance(
                {
                  latitude: location!.latitude,
                  longitude: location!.longitude,
                },
                { latitude: lat, longitude: lng },
              );
            } catch {
              dist = null;
            }
          }
        }
        return { svc, dist };
      });

      withDistance.sort((a, b) => {
        const aSame = inSameCity(a.svc) ? 0 : 1;
        const bSame = inSameCity(b.svc) ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame; // same city first
        if (a.dist == null && b.dist == null) return 0;
        if (a.dist == null) return 1;
        if (b.dist == null) return -1;
        return a.dist - b.dist;
      });

      return withDistance.map(({ svc }) => svc);
    },
    [userAddress, userProvince, location],
  );

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = serviceCanisterService.subscribeToAllServices(
      async (allServices) => {
        if (allServices.length === 0) {
          setServices([]);
          setLoading(false);
          return;
        }

        try {
          // Fetch provider profiles and service packages in parallel
          const [providerMap, servicePackagesMap] = await Promise.all([
            fetchProviderProfiles(allServices),
            fetchServicePackages(allServices),
          ]);

          // Transform services with provider data and packages
          const enrichedServices = transformServicesWithData(
            allServices,
            providerMap,
            servicePackagesMap,
          );

          setServices(filterAndSortByArea(enrichedServices));
          setLoading(false);
        } catch (err) {
          setError(
            err instanceof Error ? err : new Error("Failed to enrich services"),
          );
          setLoading(false);
        }
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [filterAndSortByArea]);

  const refetch = useCallback(async () => {
    // For realtime hook, refetch just resets the state
    // The listener will automatically update with new data
    setLoading(true);
    setError(null);
  }, []);

  return {
    services,
    loading,
    error,
    refetch,
  };
};

/**
 * Hook to fetch services by category with provider information
 */
export const useServicesByCategory = (
  categoryId: string,
): UseServicesResult => {
  const [services, setServices] = useState<EnrichedService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { userAddress, userProvince, location } = useLocationStore();

  const filterAndSortByArea = useCallback(
    (items: EnrichedService[]): EnrichedService[] => {
      if (!userProvince && !userAddress) return items;
      const RADIUS_KM = 25;
      const hasUserCoords = !!location?.latitude && !!location?.longitude;
      const normalizeCity = (val: string) =>
        (val || "")
          .toLowerCase()
          .replace(/\bcity\b/g, "")
          .replace(/\s+/g, " ")
          .trim();
      const normalizeProvince = (val: string) =>
        (val || "").toLowerCase().trim();
      const inSameProvince = (svc: EnrichedService) =>
        normalizeProvince(svc.location.state) ===
        normalizeProvince(userProvince || "");
      const inSameCity = (svc: EnrichedService) =>
        normalizeCity(svc.location.city) === normalizeCity(userAddress || "");
      const withinRadius = (svc: EnrichedService) => {
        if (!hasUserCoords) return false;
        const lat = svc.location?.latitude;
        const lng = svc.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        try {
          const d = calculateDistance(
            { latitude: location!.latitude, longitude: location!.longitude },
            { latitude: lat, longitude: lng },
          );
          return d <= RADIUS_KM;
        } catch {
          return false;
        }
      };
      const filtered = items.filter(
        (svc) => inSameCity(svc) || (inSameProvince(svc) && withinRadius(svc)),
      );
      const withDistance = filtered.map((svc) => {
        let dist: number | null = null;
        if (hasUserCoords) {
          const lat = svc.location?.latitude;
          const lng = svc.location?.longitude;
          if (typeof lat === "number" && typeof lng === "number") {
            try {
              dist = calculateDistance(
                {
                  latitude: location!.latitude,
                  longitude: location!.longitude,
                },
                { latitude: lat, longitude: lng },
              );
            } catch {
              dist = null;
            }
          }
        }
        return { svc, dist };
      });
      withDistance.sort((a, b) => {
        const aSame = inSameCity(a.svc) ? 0 : 1;
        const bSame = inSameCity(b.svc) ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        if (a.dist == null && b.dist == null) return 0;
        if (a.dist == null) return 1;
        if (b.dist == null) return -1;
        return a.dist - b.dist;
      });
      return withDistance.map(({ svc }) => svc);
    },
    [userAddress, userProvince, location],
  );

  const fetchServices = useCallback(async () => {
    if (!categoryId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch services by category
      const categoryServices =
        await serviceCanisterService.getServicesByCategory(categoryId);

      // Fetch provider profiles and service packages in parallel
      const [providerMap, servicePackagesMap] = await Promise.all([
        fetchProviderProfiles(categoryServices),
        fetchServicePackages(categoryServices),
      ]);

      // Transform services with provider data and packages
      const enrichedServices = transformServicesWithData(
        categoryServices,
        providerMap,
        servicePackagesMap,
      );

      setServices(filterAndSortByArea(enrichedServices));
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch services"),
      );
      //console.error("Error fetching services by category:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryId, filterAndSortByArea]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, categoryId]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
  };
};

/**
 * Hook to fetch top pick services with a limit option
 */
export const useTopPickServices = (limit?: number): UseServicesResult => {
  const [services, setServices] = useState<EnrichedService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { userAddress, userProvince, location } = useLocationStore();

  const filterAndSortByArea = useCallback(
    (items: EnrichedService[]): EnrichedService[] => {
      if (!userProvince && !userAddress) return items;
      const RADIUS_KM = 25;
      const hasUserCoords = !!location?.latitude && !!location?.longitude;
      const normalizeCity = (val: string) =>
        (val || "")
          .toLowerCase()
          .replace(/\bcity\b/g, "")
          .replace(/\s+/g, " ")
          .trim();
      const normalizeProvince = (val: string) =>
        (val || "").toLowerCase().trim();
      const inSameProvince = (svc: EnrichedService) =>
        normalizeProvince(svc.location.state) ===
        normalizeProvince(userProvince || "");
      const inSameCity = (svc: EnrichedService) =>
        normalizeCity(svc.location.city) === normalizeCity(userAddress || "");
      const withinRadius = (svc: EnrichedService) => {
        if (!hasUserCoords) return false;
        const lat = svc.location?.latitude;
        const lng = svc.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        try {
          const d = calculateDistance(
            { latitude: location!.latitude, longitude: location!.longitude },
            { latitude: lat, longitude: lng },
          );
          return d <= RADIUS_KM;
        } catch {
          return false;
        }
      };
      const filtered = items.filter(
        (svc) => inSameCity(svc) || (inSameProvince(svc) && withinRadius(svc)),
      );
      const withDistance = filtered.map((svc) => {
        let dist: number | null = null;
        if (hasUserCoords) {
          const lat = svc.location?.latitude;
          const lng = svc.location?.longitude;
          if (typeof lat === "number" && typeof lng === "number") {
            try {
              dist = calculateDistance(
                {
                  latitude: location!.latitude,
                  longitude: location!.longitude,
                },
                { latitude: lat, longitude: lng },
              );
            } catch {
              dist = null;
            }
          }
        }
        return { svc, dist };
      });
      withDistance.sort((a, b) => {
        const aSame = inSameCity(a.svc) ? 0 : 1;
        const bSame = inSameCity(b.svc) ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        if (a.dist == null && b.dist == null) return 0;
        if (a.dist == null) return 1;
        if (b.dist == null) return -1;
        return a.dist - b.dist;
      });
      return withDistance.map(({ svc }) => svc);
    },
    [userAddress, userProvince, location],
  );

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all services
      const allServices = await serviceCanisterService.getAllServices();

      // Sort by rating and filter only available services with ratings
      const topServices = allServices
        .filter(
          (service) =>
            service.status === "Available" &&
            service.rating !== undefined &&
            service.rating > 0,
        )
        .sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;

          // Primary sort by rating (highest first)
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }

          // Secondary sort by review count (highest first)
          return Number(b.reviewCount) - Number(a.reviewCount);
        })
        .slice(0, limit || 10); // Apply limit or default to 10

      // Fetch provider profiles and service packages in parallel
      const [providerMap, servicePackagesMap] = await Promise.all([
        fetchProviderProfiles(topServices),
        fetchServicePackages(topServices),
      ]);

      // Transform services with provider data and packages
      const enrichedServices = transformServicesWithData(
        topServices,
        providerMap,
        servicePackagesMap,
      );

      setServices(filterAndSortByArea(enrichedServices));
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch top services"),
      );
      //console.error("Error fetching top services:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, filterAndSortByArea]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, limit]);

  return { services, loading, error, refetch: fetchServices };
};

/**
 * Hook to fetch a specific service by ID with provider information
 */
export const useServiceById = (
  serviceId: string,
): {
  service: EnrichedService | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} => {
  const [service, setService] = useState<EnrichedService | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Manual refetch function (for backwards compatibility)
  const refetch = useCallback(async () => {
    if (!serviceId) {
      return;
    }

    try {
      // Fetch the specific service
      const serviceData = await serviceCanisterService.getService(serviceId);

      if (!serviceData) {
        setService(null);
        return;
      }

      // Fetch the provider profile and service packages in parallel
      const [providerProfile, servicePackages] = await Promise.all([
        authCanisterService.getProfile(serviceData.providerId.toString()),
        serviceCanisterService.getServicePackages(serviceId),
      ]);

      // Transform to enriched service
      const enrichedService = transformToEnrichedService(
        serviceData,
        providerProfile,
        servicePackages,
      );
      setService(enrichedService);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch service"),
      );
    }
  }, [serviceId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!serviceId) {
      setService(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to service changes
    const unsubscribe = serviceCanisterService.subscribeToService(
      serviceId,
      async (serviceData) => {
        if (!serviceData) {
          setService(null);
          setError(new Error("Service not found"));
          setLoading(false);
          return;
        }

        try {
          // Fetch the provider profile and service packages in parallel
          const [providerProfile, servicePackages] = await Promise.all([
            authCanisterService.getProfile(serviceData.providerId.toString()),
            serviceCanisterService.getServicePackages(serviceId),
          ]);

          // Transform to enriched service
          const enrichedService = transformToEnrichedService(
            serviceData,
            providerProfile,
            servicePackages,
          );
          setService(enrichedService);
          setError(null);
        } catch (err) {
          setError(
            err instanceof Error ? err : new Error("Failed to fetch service"),
          );
        } finally {
          setLoading(false);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [serviceId]);

  return { service, loading, error, refetch };
};

/**
 * Hook to fetch all categories
 */
export const useCategories = (): {
  categories: ServiceCategory[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCategories([]); // Clear categories to prevent flickering

    try {
      const canisterCategories =
        await serviceCanisterService.getAllCategories();

      setCategories(canisterCategories || []);
    } catch (err) {
      //console.error("Failed to load categories from service canister:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch categories"),
      );
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
};

// Default export with all hooks for convenience
export default {
  useAllServicesWithProviders,
  useServicesByCategory,
  useTopPickServices,
  useServiceById,
  useCategories,
};
