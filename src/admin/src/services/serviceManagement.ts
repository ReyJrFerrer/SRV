import { callFirebaseFunction, requireAuth } from "./coreUtils";
import { AdminServiceError, ServiceData } from "./serviceTypes";

/**
 * Delete a service
 */
export const deleteService = async (serviceId: string): Promise<void> => {
  try {
    requireAuth();

    await callFirebaseFunction("deleteService", { serviceId });
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to delete service: ${error}`,
      code: "DELETE_SERVICE_ERROR",
      details: error,
    });
  }
};

/**
 * Get service packages for a specific service
 */
export const getServicePackages = async (serviceId: string): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getServicePackages", {
      serviceId,
    });
    return result || [];
  } catch (error) {
    console.error("Error getting service packages", error);
    return [];
  }
};

// Get service data from Firebase
export const getServiceData = async (
  serviceId: string,
): Promise<ServiceData | null> => {
  try {
    requireAuth();

    const service = await callFirebaseFunction("getService", { serviceId });

    if (!service) return null;

    // Convert Firebase service to ServiceData format
    const serviceData: ServiceData = {
      id: service.id,
      title: service.title,
      description: service.description,
      category: service.category?.name || "General",
      status: service.status || "Available",
      type: "offered",
      price: service.price || 0,
      currency: "PHP",
      duration: undefined,
      location: service.location,
      scheduledDate: undefined,
      completedDate: undefined,
      createdDate: service.createdAt ? new Date(service.createdAt) : new Date(),
      clientId: undefined,
      clientName: undefined,
      providerId: service.providerId,
      providerName: "Service Provider",
      rating: service.rating,
      reviewCount: service.reviewCount,
      imageUrls: service.imageUrls || [],
      certificateUrls: service.certificateUrls || [],
      weeklySchedule: service.weeklySchedule || [],
      packages: [], // Will be populated separately
    };

    // Get service packages
    try {
      const packages = await getServicePackages(serviceId);
      serviceData.packages = packages.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name || pkg.title,
        description: pkg.description,
        price: pkg.price || 0,
        duration: pkg.duration,
      }));
    } catch (packageError) {
      console.error("Error fetching service packages", packageError);
      serviceData.packages = [];
    }

    return serviceData;
  } catch (error) {
    console.error("Error fetching service data", error);
    return null;
  }
};

/**
 * Get all services and bookings for a specific user
 */
export const getUserServicesAndBookings = async (
  userId: string,
): Promise<{
  offeredServices: any[];
  clientBookings: any[];
  providerBookings: any[];
}> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getUserServicesAndBookings", {
      userId,
    });

    return {
      offeredServices: result.services || [],
      clientBookings: result.clientBookings || [],
      providerBookings: result.providerBookings || [],
    };
  } catch (error) {
    console.error("Error getting user services and bookings:", error);
    return {
      offeredServices: [],
      clientBookings: [],
      providerBookings: [],
    };
  }
};

/**
 * Get service count for a specific user
 */
export const getUserServiceCount = async (userId: string): Promise<number> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getUserServiceCount", {
      userId,
    });
    return typeof result === "number" ? result : Number(result || 0);
  } catch (error) {
    console.error("Error getting user service count:", error);
    return 0;
  }
};
