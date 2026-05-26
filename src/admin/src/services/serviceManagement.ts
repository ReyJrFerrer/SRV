import { callFirebaseFunction } from "./coreUtils";
import { ServiceData } from "./serviceTypes";
import { serviceCanister } from "./serviceCanister";

export const deleteService = async (serviceId: string): Promise<void> => {
  await callFirebaseFunction("serviceAction", {
    action: "archiveService",
    data: { serviceId },
  });
};

export const getServicePackages = async (serviceId: string): Promise<any[]> => {
  try {
    const result = await callFirebaseFunction("serviceAction", {
      action: "getServicePackages",
      data: { serviceId },
    });
    return (result as { packages?: any[] }).packages || [];
  } catch {
    return [];
  }
};

export const getServiceData = async (
  serviceId: string,
): Promise<ServiceData | null> => {
  try {
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
    } catch {
      serviceData.packages = [];
    }

    return serviceData;
  } catch {
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
    const result = await callFirebaseFunction("adminUserAction", {
      action: "getUserServicesAndBookings",
      payload: { userId },
    });
    const data = result as {
      services?: any[];
      clientBookings?: any[];
      providerBookings?: any[];
    };
    return {
      offeredServices: data.services || [],
      clientBookings: data.clientBookings || [],
      providerBookings: data.providerBookings || [],
    };
  } catch {
    return {
      offeredServices: [],
      clientBookings: [],
      providerBookings: [],
    };
  }
};

export const getUserServiceCount = async (userId: string): Promise<number> => {
  try {
    const result = await callFirebaseFunction("adminUserAction", {
      action: "getUserServiceCount",
      payload: { userId },
    });
    return typeof result === "number" ? result : Number(result || 0);
  } catch {
    return 0;
  }
};
