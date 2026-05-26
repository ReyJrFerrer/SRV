import { httpsCallable } from "firebase/functions";
import { functions } from "../services/coreUtils";
import { getServiceData, getServicePackages } from "../services/serviceManagement";

const profileNameCache = new Map<string, { name: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const getCachedProfileName = async (
  userId: string,
): Promise<string | null> => {
  const cached = profileNameCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }
  try {
    const callable = httpsCallable(functions, "accountAction");
    const response = await callable({
      action: "getProfile",
      payload: { userId },
    });
    const data = response.data as any;
    const name = data?.profile?.name || data?.name || null;
    if (name) {
      profileNameCache.set(userId, { name, timestamp: Date.now() });
    }
    return name;
  } catch {
    return null;
  }
};

const packageCache: Record<string, { packages: any[]; timestamp: number }> = {};

const getCachedServicePackages = async (serviceId: string) => {
  const cached = packageCache[serviceId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.packages;
  }
  const packages = await getServicePackages(serviceId);
  packageCache[serviceId] = { packages, timestamp: Date.now() };
  return packages;
};

export const enrichBookingWithProviderName = async (
  booking: any,
): Promise<string> => {
  if (booking.providerName) return booking.providerName;
  if (!booking.providerId) return "Unknown Provider";

  const name = await getCachedProfileName(booking.providerId);
  return name || "Unknown Provider";
};

export const enrichBookingWithClientName = async (
  booking: any,
): Promise<string> => {
  if (booking.clientName) return booking.clientName;
  if (!booking.clientId) return "Unknown Client";

  const name = await getCachedProfileName(booking.clientId);
  return name || "Unknown Client";
};

export const enrichBookingWithServiceName = async (
  booking: any,
): Promise<string> => {
  if (booking.serviceName) return booking.serviceName;
  if (!booking.serviceId) return "Unknown Service";

  try {
    const serviceData = await getServiceData(booking.serviceId);
    if (serviceData?.title) return serviceData.title;
  } catch (error) {
    console.error("Error fetching service name:", error);
  }
  return "Unknown Service";
};

export const enrichBookingWithPackageNames = async (
  booking: any,
): Promise<string> => {
  if (
    !booking.servicePackageIds ||
    !Array.isArray(booking.servicePackageIds) ||
    booking.servicePackageIds.length === 0
  ) {
    return "";
  }
  if (!booking.serviceId) return "";

  try {
    const packages = await getCachedServicePackages(booking.serviceId);
    if (!packages || packages.length === 0) return "";
    const names = booking.servicePackageIds
      .map((id: string) => {
        const pkg = packages.find((p: any) => p.id === id);
        return pkg?.name || pkg?.title || null;
      })
      .filter(Boolean);
    return names.join(", ");
  } catch (error) {
    console.error("Error fetching package names:", error);
  }
  return "";
};

export const transformBooking = async (booking: any) => {
  const [providerName, clientName, serviceName, packageName] =
    await Promise.all([
      enrichBookingWithProviderName(booking),
      enrichBookingWithClientName(booking),
      enrichBookingWithServiceName(booking),
      enrichBookingWithPackageNames(booking),
    ]);

  return {
    id: booking.id || "",
    serviceId: booking.serviceId || "",
    serviceName,
    providerId: booking.providerId || "",
    providerName,
    clientId: booking.clientId || "",
    clientName,
    status: booking.status || "Unknown",
    price: Number(booking.price || 0),
    createdAt: booking.createdAt || new Date().toISOString(),
    scheduledDate:
      booking.scheduledDate || booking.createdAt || new Date().toISOString(),
    completedAt: booking.completedDate || undefined,
    rating: booking.rating ? Number(booking.rating) : undefined,
    review: booking.review || undefined,
    location: booking.location || undefined,
    packageName,
    servicePackageIds: booking.servicePackageIds || [],
  };
};
