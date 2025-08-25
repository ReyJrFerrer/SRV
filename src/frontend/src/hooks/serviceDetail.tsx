import { useState, useEffect, useCallback } from "react";
import serviceCanisterService, {
  Service,
} from "../services/serviceCanisterService";
import authCanisterService, {
  FrontendProfile,
} from "../services/authCanisterService";
import {
  enrichServiceWithProvider,
  principalToString,
  getCategoryImage,
} from "../utils/serviceHelpers";

/**
 * Interface for formatted service that matches the ServiceDetailPageComponent requirements
 */
export interface FormattedServiceDetail {
  id: string;
  providerId: string;
  name: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  price: {
    amount: number;
    currency: string;
    unit: string;
    isNegotiable: boolean;
  };
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    // serviceRadius: number;
    // serviceRadiusUnit: string;
  };
  availability: {
    schedule: string[];
    timeSlots: string[];
    isAvailableNow: boolean;
  };
  rating: {
    average: number;
    count: number;
  };
  media: string[];
  requirements: string[];
  isVerified: boolean;
  slug: string;
  heroImage: string;
  category: {
    id: string;
    name: string;
    description: string;
    slug: string;
    icon: string;
    imageUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  providerName?: string;
  providerAvatar?: any;
}

/**
 * Hook result interface
 */
interface UseServiceDetailResult {
  service: FormattedServiceDetail | null;
  provider: FrontendProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Transform an enriched service to the format required by ServiceDetailPageComponent
 */
const formatServiceForDetailPage = (
  service: Service,
  provider: FrontendProfile | null,
): FormattedServiceDetail => {
  const enriched = enrichServiceWithProvider(service, provider);

  return {
    id: service.id,
    providerId: service.providerId.toString(),
    name: service.title,
    title: service.title,
    description: service.description,
    isActive: service.status === "Available",
    createdAt: new Date(service.createdAt),
    updatedAt: new Date(service.updatedAt),
    price: {
      amount: service.price,
      currency: "PHP", // Default currency, update if available from backend
      unit: "/ Service", // Default unit, update if available from backend
      isNegotiable: false, // Default value, update if available from backend
    },
    location: {
      address: `${service.location.city}, ${service.location.state}, ${service.location.country}`,
      coordinates: {
        latitude: service.location.latitude,
        longitude: service.location.longitude,
      },
      // serviceRadius: 10, // Default value, update if available from backend
      // serviceRadiusUnit: "km", // Default value, update if available from backend
    },
    availability: {
      schedule: service.weeklySchedule
        ? service.weeklySchedule
            .filter((day) => day.availability.isAvailable)
            .map((day) => day.day)
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], // Default schedule
      timeSlots: service.weeklySchedule
        ? service.weeklySchedule
            .filter((day) => day.availability.isAvailable)
            .flatMap((day) =>
              day.availability.slots.map(
                (slot) => `${slot.startTime}-${slot.endTime}`,
              ),
            )
        : ["09:00-17:00"], // Default time slot
      isAvailableNow: true, // Default value, could be calculated based on current time and availability
    },
    rating: {
      average: service.rating || 0,
      count: service.reviewCount || 0,
    },
    media: service.imageUrls, // Default empty media array
    requirements: [], // Default empty requirements
    isVerified: service.isVerifiedService, // Default value
    slug: service.id, // Using ID as slug
    heroImage:
      service.category.imageUrl || getCategoryImage(service.category.name),
    category: {
      id: service.category.id,
      name: service.category.name,
      description: service.category.description || "",
      slug: service.category.slug,
      icon: "default",
      imageUrl:
        service.category.imageUrl || getCategoryImage(service.category.name),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    providerName: enriched.providerName,
    providerAvatar: provider?.profilePicture?.imageUrl || null,
  };
};

/**
 * Custom hook to fetch service detail by ID with provider information
 * @param serviceId The service ID to fetch (from router slug)
 * @returns Object containing service details, provider, loading state, error and refetch function
 */
export const useServiceDetail = (serviceId: string): UseServiceDetailResult => {
  const [service, setService] = useState<FormattedServiceDetail | null>(null);
  const [provider, setProvider] = useState<FrontendProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceDetail = useCallback(async () => {
    if (!serviceId) {
      setService(null);
      setProvider(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch the service data
      const serviceData = await serviceCanisterService.getService(serviceId);

      if (!serviceData) {
        //console.warn(`Service with ID "${serviceId}" not found`);
        setService(null);
        setProvider(null);
        setError("Service not found");
        return;
      }

      // Fetch provider information
      try {
        const providerIdStr = principalToString(serviceData.providerId);
        const providerData =
          await authCanisterService.getProfile(providerIdStr);

        if (providerData) {
          setProvider(providerData);

          // Format service with provider data
          const formattedService = formatServiceForDetailPage(
            serviceData,
            providerData,
          );

          setService(formattedService);
        } else {
          //console.warn("Provider not found for service");
          setProvider(null);

          // Format service without provider data
          const formattedService = formatServiceForDetailPage(
            serviceData,
            null,
          );
          setService(formattedService);
        }
      } catch (providerError) {
        //console.error("Failed to load provider information:", providerError);
        setProvider(null);

        // Still return service data even if provider fetch fails
        const formattedService = formatServiceForDetailPage(serviceData, null);
        setService(formattedService);
      }
    } catch (serviceError) {
      //console.error("Failed to load service data:", serviceError);
      setService(null);
      setProvider(null);
      setError("Failed to load service data");
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchServiceDetail();
  }, [fetchServiceDetail]);

  return {
    service,
    provider,
    loading,
    error,
    refetch: fetchServiceDetail,
  };
};

export default useServiceDetail;
