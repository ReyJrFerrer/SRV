import type { Profile } from "../types/profile";
import type { ServiceData } from "../components";

const PRICE_DIVISOR = 100;
const DATE_DIVISOR = 1000000;
const DEFAULT_CURRENCY = "PHP";
const DEFAULT_SERVICE_TYPE = "offered";

export interface SimpleUserData {
  id: string;
  name: string;
  phone: string;
}

export const convertProfileToSimpleUserData = (
  profile: Profile,
): SimpleUserData => {
  return {
    id: String(profile.id),
    name: String(profile.name ?? ""),
    phone: String(profile.phone ?? ""),
  };
};

export const convertServiceStatus = (
  backendStatus: any,
): ServiceData["status"] => {
  if (typeof backendStatus === "string") {
    if (backendStatus === "Available") return "active";
    if (backendStatus === "Unavailable") return "cancelled";
    if (backendStatus === "Suspended") return "cancelled";
    return "active";
  }

  if (typeof backendStatus === "object" && backendStatus !== null) {
    if ("Available" in backendStatus) return "active";
    if ("Unavailable" in backendStatus) return "cancelled";
    if ("Suspended" in backendStatus) return "cancelled";
  }

  return "active";
};

export const convertBackendServiceToServiceData = (
  service: any,
  userData: SimpleUserData,
): ServiceData => {
  return {
    id: service.id,
    title: service.title,
    description: service.description,
    category: service.category.name,
    status: convertServiceStatus(service.status),
    type: DEFAULT_SERVICE_TYPE,
    price: Number(service.price) / PRICE_DIVISOR,
    currency: DEFAULT_CURRENCY,
    location: service.location.address,
    createdDate: new Date(Number(service.createdAt) / DATE_DIVISOR),
    rating: service.rating ? Number(service.rating) : undefined,
    reviewCount: Number(service.reviewCount),
    providerId: service.providerId.toString(),
    providerName: userData.name,
  };
};

export const convertBackendServicesToServiceData = (
  offeredServices: any[],
  _clientBookings: any[],
  _providerBookings: any[],
  userData: SimpleUserData,
): ServiceData[] => {
  return offeredServices.map((service) =>
    convertBackendServiceToServiceData(service, userData),
  );
};
