import { ServiceProviderPerformanceData } from "./analyticsUtils";

export const createFallbackProviderData = (
  providersToShow: any[],
  systemStats: any,
  walletBalances: Record<string, number>,
): ServiceProviderPerformanceData[] => {
  const totalRevenue = systemStats?.totalRevenue || 0;
  const totalCommission = systemStats?.totalCommission || 0;
  const totalBookings = systemStats?.totalBookings || 0;
  const settledBookings = systemStats?.settledBookings || 0;

  return providersToShow.map((provider, index) => {
    const isOnlyProvider = providersToShow.length === 1;
    const isFirstProvider = index === 0;
    const shouldGetTotals = isOnlyProvider || isFirstProvider;
    const providerId = provider.id?.toString() || provider.id;

    return {
      id: providerId,
      name: provider.name || "Unknown",
      phone: provider.phone || "N/A",
      totalRevenue: shouldGetTotals ? totalRevenue : 0,
      totalCommission: shouldGetTotals ? totalCommission : 0,
      completedBookings: shouldGetTotals ? settledBookings : 0,
      totalBookings: shouldGetTotals ? totalBookings : 0,
      walletBalance: walletBalances[providerId] || 0,
    };
  });
};

export const extractProviderIdsFromBookings = (
  bookings: any[],
): Set<string> => {
  const providerIds = new Set<string>();
  bookings.forEach((booking) => {
    if (booking.serviceProviderId) {
      providerIds.add(booking.serviceProviderId);
    }
  });
  return providerIds;
};

export const buildProviderPerformanceMap = (
  providerIds: Set<string>,
  users: any[],
  serviceProviders: any[],
  walletBalances: Record<string, number>,
): Map<string, ServiceProviderPerformanceData> => {
  const performanceMap = new Map<string, ServiceProviderPerformanceData>();

  providerIds.forEach((providerId) => {
    const user = users.find((u) => u.id.toString() === providerId);
    if (user) {
      performanceMap.set(providerId, {
        id: providerId,
        name: user.name || "Unknown",
        phone: user.phone || "N/A",
        totalRevenue: 0,
        totalCommission: 0,
        completedBookings: 0,
        totalBookings: 0,
        walletBalance: walletBalances[providerId] || 0,
      });
    }
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
          walletBalance: walletBalances[provider.id] || 0,
        });
      } else {
        const existing = performanceMap.get(provider.id);
        if (existing) {
          existing.walletBalance = walletBalances[provider.id] || 0;
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
