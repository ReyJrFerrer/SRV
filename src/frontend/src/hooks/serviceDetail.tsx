import { useState, useEffect, useCallback } from "react";
import {
  Service,
  DayOfWeek,
  DayAvailability,
  serviceCanisterService,
} from "../services/serviceCanisterService";
import { FrontendProfile, authCanisterService } from "../services/authCanisterService";
import {
  enrichServiceWithProvider,
  getCategoryImage,
} from "../utils/serviceHelpers";
import {
  OrganizedWeeklySchedule,
  useServiceManagement,
} from "./serviceManagement";

/**
 * Helper function to organize weekly schedule similar to serviceManagement.tsx
 */
const organizeWeeklySchedule = (
  weeklySchedule?: Array<{ day: DayOfWeek; availability: DayAvailability }>,
): OrganizedWeeklySchedule => {
  const organized: OrganizedWeeklySchedule = {};

  if (!weeklySchedule || weeklySchedule.length === 0) {
    return organized;
  }

  // Map each day to its corresponding property
  weeklySchedule.forEach(({ day, availability }) => {
    switch (day) {
      case "Monday":
        organized.monday = availability;
        break;
      case "Tuesday":
        organized.tuesday = availability;
        break;
      case "Wednesday":
        organized.wednesday = availability;
        break;
      case "Thursday":
        organized.thursday = availability;
        break;
      case "Friday":
        organized.friday = availability;
        break;
      case "Saturday":
        organized.saturday = availability;
        break;
      case "Sunday":
        organized.sunday = availability;
        break;
    }
  });

  return organized;
};

/**
 * Helper function to format time slots from availability data
 */
const formatTimeSlots = (
  weeklySchedule?: Array<{ day: DayOfWeek; availability: DayAvailability }>,
): string[] => {
  if (!weeklySchedule || weeklySchedule.length === 0) {
    return ["9:00 AM - 5:00 PM"]; // Default time slot in 12-hour format
  }

  // Helper function to format time to 12-hour format
  const formatTime12Hour = (time: string): string => {
    const [hourStr, minuteStr] = time.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (isNaN(hour) || isNaN(minute)) return time;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
  };

  // Extract all unique time slots across all days and format them
  const allTimeSlots = weeklySchedule
    .filter((day) => day.availability.isAvailable)
    .flatMap((day) =>
      day.availability.slots.map(
        (slot) =>
          `${formatTime12Hour(slot.startTime)} - ${formatTime12Hour(slot.endTime)}`,
      ),
    );

  // Remove duplicates and return unique time slots
  const uniqueTimeSlots = Array.from(new Set(allTimeSlots));

  return uniqueTimeSlots.length > 0 ? uniqueTimeSlots : ["9:00 AM - 5:00 PM"];
};

/**
 * Helper function to check if service is available now
 */
const isServiceAvailableNow = (
  weeklySchedule?: Array<{ day: DayOfWeek; availability: DayAvailability }>,
): boolean => {
  if (!weeklySchedule || weeklySchedule.length === 0) {
    return true; // Default to available if no schedule is set
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", {
    weekday: "long",
  }) as DayOfWeek;
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const todaySchedule = weeklySchedule.find((day) => day.day === currentDay);

  if (!todaySchedule || !todaySchedule.availability.isAvailable) {
    return false;
  }

  // Check if current time falls within any available slot
  return todaySchedule.availability.slots.some((slot) => {
    return currentTime >= slot.startTime && currentTime <= slot.endTime;
  });
};

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
      timeSlots: formatTimeSlots(service.weeklySchedule),
      isAvailableNow: isServiceAvailableNow(service.weeklySchedule),
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
 * Export utility functions for external use
 */
export { organizeWeeklySchedule, formatTimeSlots, isServiceAvailableNow };

/**
 * Custom hook to fetch service detail by ID with provider information and realtime updates
 * @param serviceId The service ID to fetch (from router slug)
 * @returns Object containing service details, provider, loading state, error and refetch function
 */
export const useServiceDetail = (serviceId: string): UseServiceDetailResult => {
  const [service, setService] = useState<FormattedServiceDetail | null>(null);
  const [provider, setProvider] = useState<FrontendProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime subscription to service changes
  useEffect(() => {
    if (!serviceId) {
      setService(null);
      setProvider(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to realtime service updates
    const unsubscribe = serviceCanisterService.subscribeToService(
      serviceId,
      async (serviceData) => {
        if (!serviceData) {
          setService(null);
          setProvider(null);
          setError("Service not found");
          setLoading(false);
          return;
        }

        try {
          // Fetch provider data
          let providerData: FrontendProfile | null = null;
          if (serviceData.providerId) {
            try {
              providerData = await authCanisterService.getProfile(
                serviceData.providerId,
              );
            } catch (err) {
              console.error("Failed to fetch provider data:", err);
            }
          }

          setProvider(providerData);

          // Format service with provider data
          const formattedService = formatServiceForDetailPage(
            serviceData,
            providerData,
          );

          setService(formattedService);
          setError(null);
        } catch (err) {
          console.error("Failed to process service data:", err);
          setError("Failed to load service data");
        } finally {
          setLoading(false);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [serviceId]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    if (!serviceId) return;

    try {
      const serviceData = await serviceCanisterService.getService(serviceId);
      if (serviceData) {
        let providerData: FrontendProfile | null = null;
        if (serviceData.providerId) {
          providerData = await authCanisterService.getProfile(
            serviceData.providerId,
          );
        }
        setProvider(providerData);
        const formattedService = formatServiceForDetailPage(
          serviceData,
          providerData,
        );
        setService(formattedService);
      }
    } catch (err) {
      console.error("Failed to refetch service:", err);
    }
  }, [serviceId]);

  return {
    service,
    provider,
    loading,
    error,
    refetch,
  };
};

export default useServiceDetail;
