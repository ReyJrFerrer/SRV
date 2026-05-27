import { ServiceProviderPerformanceData } from "./analyticsUtils";
import { extractProfilePicture } from "./profileUtils";

export const createFallbackProviderData = (
  providersToShow: any[],
): ServiceProviderPerformanceData[] => {
  return providersToShow.map((provider) => {
    const providerId = provider.id?.toString() || provider.id;

    return {
      id: providerId,
      name: provider.name || "Unknown",
      phone: provider.phone || "N/A",
      totalRevenue: 0,
      totalCommission: 0,
      completedBookings: 0,
      totalBookings: 0,
      profilePicture: extractProfilePicture(provider.profilePicture),
    };
  });
};

export const extractProviderIdsFromBookings = (
  bookings: any[],
): Set<string> => {
  const providerIds = new Set<string>();
  bookings.forEach((booking) => {
    const pid = booking.serviceProviderId || booking.providerId;
    if (pid) {
      providerIds.add(pid);
    }
  });
  return providerIds;
};

export const buildProviderPerformanceMap = (
  providerIds: Set<string>,
  users: any[],
  serviceProviders: any[],
): Map<string, ServiceProviderPerformanceData> => {
  const performanceMap = new Map<string, ServiceProviderPerformanceData>();

  providerIds.forEach((providerId) => {
    const user = users.find((u) => u.id && u.id.toString() === providerId);
    if (!user) {
      return;
    }
    performanceMap.set(providerId, {
      id: providerId,
      name: user.name,
      phone: user.phone,
      totalRevenue: 0,
      totalCommission: 0,
      completedBookings: 0,
      totalBookings: 0,
      profilePicture: extractProfilePicture(user.profilePicture),
    });
  });

  if (serviceProviders) {
    serviceProviders.forEach((provider) => {
      if (!performanceMap.has(provider.id)) {
        performanceMap.set(provider.id, {
          id: provider.id,
          name: provider.name,
          phone: provider.phone,
          totalRevenue: 0,
          totalCommission: 0,
          completedBookings: 0,
          totalBookings: 0,
          profilePicture: extractProfilePicture(provider.profilePicture),
        });
      } else {
        const existing = performanceMap.get(provider.id);
        if (existing && !existing.profilePicture) {
          existing.profilePicture = extractProfilePicture(
            provider.profilePicture,
          );
        }
      }
    });
  }

  return performanceMap;
};

export const processBookingsForPerformance = (
  bookings: any[],
  performanceMap: Map<string, ServiceProviderPerformanceData>,
): void => {
  bookings.forEach((booking) => {
    const providerId = booking.serviceProviderId || booking.providerId;
    if (providerId && performanceMap.has(providerId)) {
      const performance = performanceMap.get(providerId)!;
      performance.totalBookings++;

      if (booking.status === "Completed" || booking.status === "Settled") {
        performance.completedBookings++;
        performance.totalRevenue += booking.price || 0;
      }
    }
  });
};

export const processCommissionTransactions = (
  commissionTransactions: any[],
  performanceMap: Map<string, ServiceProviderPerformanceData>,
): void => {
  if (!commissionTransactions || commissionTransactions.length === 0) return;

  commissionTransactions.forEach((transaction) => {
    const providerId = transaction.from;
    if (providerId && performanceMap.has(providerId)) {
      const performance = performanceMap.get(providerId)!;
      performance.totalCommission += transaction.amount || 0;
    }
  });
};
