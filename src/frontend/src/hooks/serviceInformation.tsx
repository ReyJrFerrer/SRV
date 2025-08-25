import { useState, useEffect, useCallback } from "react";
// import { useAuth } from "../context/AuthContext";
import authCanisterService, {
  FrontendProfile,
} from "../services/authCanisterService";
import serviceCanisterService, {
  Service,
  ServiceCategory,
} from "../services/serviceCanisterService";

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
): EnrichedService => {
  // Create a slug from the title
  const slug = service.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

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
      amount: service.price,
      unit: "per hour", // Default unit
      display: `$${service.price.toFixed(2)}`,
    },

    // Location
    location: {
      address: service.location.address,
      city: service.location.city,
      state: service.location.state,
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
 * Hook to fetch all services with provider information
 */
export const useAllServicesWithProviders = (): UseServicesResult => {
  const [services, setServices] = useState<EnrichedService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    setServices([]); // Clear services to prevent flickering

    try {
      // Fetch all services first
      const allServices = await serviceCanisterService.getAllServices();

      if (allServices.length === 0) {
        setServices([]);
        return;
      }

      // Create a map of all provider IDs to reduce redundant API calls
      const providerIds = Array.from(
        new Set(allServices.map((service) => service.providerId.toString())),
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
      const providerMap = providerIds.reduce(
        (map, id, index) => {
          map[id] = providerProfiles[index];
          return map;
        },
        {} as Record<string, FrontendProfile | null>,
      );

      // Transform services with provider data
      const enrichedServices = allServices.map((service) => {
        const providerProfile = providerMap[service.providerId.toString()];
        return transformToEnrichedService(service, providerProfile);
      });

      // Set all services at once to prevent flickering
      setServices(enrichedServices);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch services"),
      );
      //console.error("Error fetching services:", err);
      setServices([]); // Ensure empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
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

      // Create a map of all provider IDs to reduce redundant API calls
      const providerIds = Array.from(
        new Set(
          categoryServices.map((service) => service.providerId.toString()),
        ),
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
      const providerMap = providerIds.reduce(
        (map, id, index) => {
          map[id] = providerProfiles[index];
          return map;
        },
        {} as Record<string, FrontendProfile | null>,
      );

      // Transform services with provider data
      const enrichedServices = categoryServices.map((service) => {
        const providerProfile = providerMap[service.providerId.toString()];
        return transformToEnrichedService(service, providerProfile);
      });

      setServices(enrichedServices);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch services"),
      );
      //console.error("Error fetching services by category:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

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

      // Create a map of all provider IDs to reduce redundant API calls
      const providerIds = Array.from(
        new Set(topServices.map((service) => service.providerId.toString())),
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
      const providerMap = providerIds.reduce(
        (map, id, index) => {
          map[id] = providerProfiles[index];
          return map;
        },
        {} as Record<string, FrontendProfile | null>,
      );

      // Transform services with provider data
      const enrichedServices = topServices.map((service) => {
        const providerProfile = providerMap[service.providerId.toString()];
        return transformToEnrichedService(service, providerProfile);
      });

      setServices(enrichedServices);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch top services"),
      );
      //console.error("Error fetching top services:", err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

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

  const fetchService = useCallback(async () => {
    if (!serviceId) {
      setService(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch the specific service
      const serviceData = await serviceCanisterService.getService(serviceId);

      if (!serviceData) {
        setService(null);
        return;
      }

      // Fetch the provider profile
      const providerId = serviceData.providerId.toString();
      const providerProfile = await authCanisterService.getProfile(providerId);

      // Transform to enriched service
      const enrichedService = transformToEnrichedService(
        serviceData,
        providerProfile,
      );
      setService(enrichedService);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch service"),
      );
      //console.error("Error fetching service:", err);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchService();
  }, [fetchService, serviceId]);

  return { service, loading, error, refetch: fetchService };
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
