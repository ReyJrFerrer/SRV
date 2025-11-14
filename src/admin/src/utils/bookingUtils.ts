import { httpsCallable } from "firebase/functions";
import { functions } from "../services/coreUtils";

export const enrichBookingWithProviderName = async (
  booking: any,
): Promise<string> => {
  if (!booking.providerId) return "Unknown Provider";

  try {
    const callable = httpsCallable(functions, "getProfile");
    const providerResponse = await callable({ userId: booking.providerId });
    if (
      (providerResponse.data as any).success &&
      (providerResponse.data as any).profile?.name
    ) {
      return (providerResponse.data as any).profile.name;
    }
  } catch (error) {
    console.error("Error fetching provider name:", error);
  }
  return "Unknown Provider";
};

export const enrichBookingWithServiceName = async (
  booking: any,
): Promise<string> => {
  if (!booking.serviceId) return "Unknown Service";

  try {
    const callable = httpsCallable(functions, "getService");
    const serviceResponse = await callable({ serviceId: booking.serviceId });
    if (
      (serviceResponse.data as any).success &&
      (serviceResponse.data as any).service?.title
    ) {
      return (serviceResponse.data as any).service.title;
    }
  } catch (error) {
    console.error("Error fetching service name:", error);
  }
  return "Unknown Service";
};

export const transformBooking = async (booking: any) => {
  const [providerName, serviceName] = await Promise.all([
    enrichBookingWithProviderName(booking),
    enrichBookingWithServiceName(booking),
  ]);

  return {
    id: booking.id || "",
    serviceId: booking.serviceId || "",
    serviceName,
    providerId: booking.providerId || "",
    providerName,
    status: booking.status || "Unknown",
    price: Number(booking.price || 0),
    createdAt: booking.createdAt || new Date().toISOString(),
    scheduledDate:
      booking.scheduledDate || booking.createdAt || new Date().toISOString(),
    completedAt: booking.completedDate || undefined,
    rating: booking.rating ? Number(booking.rating) : undefined,
    review: booking.review || undefined,
    location: booking.location || undefined,
  };
};
