import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";
import { AdminServiceError, ServiceData } from "./serviceTypes";
import { serviceCanister } from "./serviceCanister";

const auth = getFirebaseAuth();
const getFunctions = () => getFirebaseFunctions();

const requireAuth = () => {
  if (!auth.currentUser) {
    throw new AdminServiceError({
      message:
        "Authentication required: Please log in as an admin to perform this action",
      code: "AUTH_REQUIRED",
    } as AdminServiceError);
  }
};

export const deleteService = async (serviceId: string): Promise<void> => {
  try {
    requireAuth();

    const serviceActionFn = httpsCallable(getFunctions(), "serviceAction");
    const result = await serviceActionFn({
      action: "archiveService",
      data: { serviceId },
    });

    const data = result.data as { success: boolean; message?: string };
    if (!data.success) {
      throw new AdminServiceError({
        message: data.message || "Failed to delete service",
        code: "DELETE_SERVICE_ERROR",
      } as AdminServiceError);
    }
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to delete service: ${error}`,
      code: "DELETE_SERVICE_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

export const getServicePackages = async (serviceId: string): Promise<any[]> => {
  try {
    requireAuth();

    const serviceActionFn = httpsCallable(getFunctions(), "serviceAction");
    const result = await serviceActionFn({
      action: "getServicePackages",
      data: { serviceId },
    });

    const data = result.data as { success: boolean; packages?: any[] };
    return data.success ? data.packages || [] : [];
  } catch (error) {
    console.error("Error getting service packages", error);
    return [];
  }
};

export const getServiceData = async (
  serviceId: string,
): Promise<ServiceData | null> => {
  try {
    requireAuth();

    const service = await serviceCanister.getService(serviceId);

    if (!service) return null;
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
      location: {
        latitude: service.location?.latitude || 0,
        longitude: service.location?.longitude || 0,
        address: service.location?.address || "Not specified",
        city: "Not specified",
        state: "",
        country: "",
        postalCode: "",
      },
      scheduledDate: undefined,
      completedDate: undefined,
      createdDate: service.createdAt || new Date(),
      clientId: undefined,
      clientName: undefined,
      providerId: service.providerId,
      providerName: service.providerName || "Service Provider",
      rating: service.rating,
      reviewCount: service.reviewCount,
      imageUrls: service.images || [],
      certificateMedia: [],
      weeklySchedule: [],
      packages: [],
    };

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

export const getUserServicesAndBookings = async (
  userId: string,
): Promise<{
  offeredServices: any[];
  clientBookings: any[];
  providerBookings: any[];
}> => {
  try {
    requireAuth();

    const adminActionFn = httpsCallable(getFunctions(), "adminUserAction");
    const result = await adminActionFn({
      action: "getUserServicesAndBookings",
      data: { userId },
    });

    const data = result.data as {
      success: boolean;
      services?: any[];
      clientBookings?: any[];
      providerBookings?: any[];
    };

    return {
      offeredServices: data.services || [],
      clientBookings: data.clientBookings || [],
      providerBookings: data.providerBookings || [],
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

export const getUserServiceCount = async (userId: string): Promise<number> => {
  try {
    requireAuth();

    const adminActionFn = httpsCallable(getFunctions(), "adminUserAction");
    const result = await adminActionFn({
      action: "getUserServiceCount",
      data: { userId },
    });

    const data = result.data as { success: boolean; count?: number };
    return typeof data.count === "number"
      ? data.count
      : Number(data.count || 0);
  } catch (error) {
    console.error("Error getting user service count:", error);
    return 0;
  }
};
