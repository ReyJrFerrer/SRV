// Helper function to check if user is online
export const isUserOnline = (user: any): boolean => {
  if (user.isActive !== undefined) {
    return user.isActive;
  }
  if (user.lastActivity) {
    const lastActivityDate =
      user.lastActivity instanceof Date
        ? user.lastActivity
        : new Date(user.lastActivity);
    const now = new Date();
    const minutesSinceActivity =
      (now.getTime() - lastActivityDate.getTime()) / (1000 * 60);
    return minutesSinceActivity <= 15;
  }

  if (user.updatedAt) {
    const updatedAt =
      user.updatedAt instanceof Date
        ? user.updatedAt
        : new Date(user.updatedAt);
    const now = new Date();
    const hoursSinceUpdate =
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate <= 24;
  }

  return false;
};

// Helper function to check if user is dormant
export const isUserDormant = (user: any): boolean => {
  if (user.lastActivity) {
    const lastActivityDate =
      user.lastActivity instanceof Date
        ? user.lastActivity
        : new Date(user.lastActivity);
    const now = new Date();
    const daysSinceActivity =
      (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActivity >= 30;
  }

  if (user.updatedAt) {
    const updatedAt =
      user.updatedAt instanceof Date
        ? user.updatedAt
        : new Date(user.updatedAt);
    const now = new Date();
    const daysSinceUpdate =
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate >= 30; // At least 30 days
  }

  return true;
};

// Format currency for display
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

// Check if user has a provider role
export const isProvider = (user: any): boolean => {
  if (!user.activeRole) return false;

  if (typeof user.activeRole === "string") {
    return (
      user.activeRole === "ServiceProvider" || user.activeRole === "Provider"
    );
  }

  return false;
};

// Check if user has a client role
export const isClient = (user: any): boolean => {
  if (!user.activeRole) return false;

  if (typeof user.activeRole === "string") {
    return user.activeRole === "Client";
  }

  return false;
};

// Filter users based on filter type
export const filterUsers = (
  users: any[],
  filter: "all" | "online" | "dormant",
): any[] => {
  if (!users) return [];

  return users.filter((user) => {
    if (filter === "online") {
      return isUserOnline(user);
    } else if (filter === "dormant") {
      return isUserDormant(user);
    }
    return true;
  });
};

// Count providers from filtered users
export const countProviders = (users: any[]): number => {
  if (!users) return 0;
  return users.filter(isProvider).length;
};

// Count clients from filtered users
export const countClients = (users: any[]): number => {
  if (!users) return 0;
  return users.filter(isClient).length;
};

// Count online users count
export const calculateOnlineUsers = (users: any[]): number => {
  if (!users) return 0;
  return users.filter(
    (user) => (isProvider(user) || isClient(user)) && isUserOnline(user),
  ).length;
};

// Process service provider performance data
export interface ServiceProviderPerformanceData {
  id: string;
  name: string;
  phone: string;
  totalRevenue: number;
  totalCommission: number;
  completedBookings: number;
  totalBookings: number;
  walletBalance: number;
}

export const processServiceProviderPerformance = (
  bookings: any[],
  serviceProviders: any[],
  commissionTransactions: any[],
  users: any[],
  systemStats: any,
  walletBalances: Record<string, number>,
): ServiceProviderPerformanceData[] => {
  if (!systemStats) {
    return [];
  }

  if (!bookings || bookings.length === 0) {
    let providersToShow = serviceProviders;
    if (!providersToShow || providersToShow.length === 0) {
      if (users && users.length > 0) {
        const serviceProviderUsers = users.filter((user) => {
          if (typeof user.activeRole === "string") {
            return user.activeRole === "ServiceProvider";
          }
          return false;
        });

        providersToShow = serviceProviderUsers.map((user) => ({
          id: user.id.toString(),
          name: user.name,
          phone: user.phone,
          totalEarnings: 0,
          pendingCommission: 0,
          settledCommission: 0,
          lastActivity: user.updatedAt
            ? user.updatedAt instanceof Date
              ? user.updatedAt
              : new Date(user.updatedAt)
            : new Date(),
        }));
      }

      if (!providersToShow || providersToShow.length === 0) {
        return [];
      }
    }

    const totalRevenue = systemStats?.totalRevenue || 0;
    const totalCommission = systemStats?.totalCommission || 0;
    const totalBookings = systemStats?.totalBookings || 0;
    const settledBookings = systemStats?.settledBookings || 0;

    const fallbackData = providersToShow.map((provider, index) => {
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
    return fallbackData;
  }

  if (!users) {
    return [];
  }

  const performanceMap = new Map<string, ServiceProviderPerformanceData>();

  // Find service provider users
  const providerIds = new Set<string>();
  bookings.forEach((booking) => {
    if (booking.serviceProviderId) {
      providerIds.add(booking.serviceProviderId);
    }
  });

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

  // Add current service providers
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

  // Process bookings for revenue and booking counts
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

  // Process commission transactions for actual commission collected
  if (commissionTransactions && commissionTransactions.length > 0) {
    commissionTransactions.forEach((transaction) => {
      const providerId = transaction.from;
      if (providerId && performanceMap.has(providerId)) {
        const performance = performanceMap.get(providerId)!;
        performance.totalCommission += transaction.amount || 0;
      }
    });
  }

  const result = Array.from(performanceMap.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue,
  );

  return result;
};

// Filter and sort service provider data
export const filterAndSortProviders = (
  providers: ServiceProviderPerformanceData[],
  searchTerm: string,
  sortBy: "name" | "totalRevenue" | "totalCommission" | "completedBookings",
  sortOrder: "asc" | "desc",
): ServiceProviderPerformanceData[] => {
  let filtered = providers;

  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(
      (provider) =>
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.phone.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // Apply sorting
  filtered = [...filtered].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "totalRevenue":
        aValue = a.totalRevenue;
        bValue = b.totalRevenue;
        break;
      case "totalCommission":
        aValue = a.totalCommission;
        bValue = b.totalCommission;
        break;
      case "completedBookings":
        aValue = a.completedBookings;
        bValue = b.completedBookings;
        break;
      default:
        aValue = a.totalRevenue;
        bValue = b.totalRevenue;
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return filtered;
};

// Process service category data for pie chart
export interface ServiceCategoryData {
  name: string;
  value: number;
  color: string;
}

export const processServiceCategoryData = (
  services: any[],
  serviceCategories: any[],
): ServiceCategoryData[] => {
  const categoryCounts: Record<string, number> = {};

  // Map category IDs to names
  const categoryNameMap: Record<string, string> = {};
  if (serviceCategories && Array.isArray(serviceCategories)) {
    serviceCategories.forEach((category: any) => {
      categoryNameMap[category.id] = category.name;
    });
  }

  // Count services by category
  if (services && Array.isArray(services)) {
    services.forEach((service: any) => {
      const categoryId = service.category?.id || service.category || "Unknown";
      const categoryName = categoryNameMap[categoryId] || categoryId;
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });
  }

  const categoryColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
    "#ec4899",
    "#14b8a6",
    "#a855f7",
  ];

  const result = Object.entries(categoryCounts)
    .map(([name, value], index) => ({
      name,
      value,
      color: categoryColors[index % categoryColors.length],
    }))
    .sort((a, b) => b.value - a.value);

  return result;
};
