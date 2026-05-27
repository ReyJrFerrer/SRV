import {
  createFallbackProviderData,
  extractProviderIdsFromBookings,
  buildProviderPerformanceMap,
  processBookingsForPerformance,
  processCommissionTransactions,
} from "./analyticsProviderUtils";

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
    return daysSinceUpdate >= 30;
  }

  return true;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

export const isProvider = (user: any): boolean => {
  if (!user.activeRole) return false;

  if (typeof user.activeRole === "string") {
    return (
      user.activeRole === "ServiceProvider" || user.activeRole === "Provider"
    );
  }

  return false;
};

export const isClient = (user: any): boolean => {
  if (!user.activeRole) return false;

  if (typeof user.activeRole === "string") {
    return user.activeRole === "Client";
  }

  return false;
};

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

export const calculateOnlineUsers = (users: any[]): number => {
  if (!users) return 0;
  return users.filter(
    (user) => (isProvider(user) || isClient(user)) && isUserOnline(user),
  ).length;
};

export interface ServiceProviderPerformanceData {
  id: string;
  name: string;
  phone: string;
  totalCommission: number;
  completedBookings: number;
  totalBookings: number;
  profilePicture?: {
    imageUrl: string;
    thumbnailUrl: string;
  };
}

export const processServiceProviderPerformance = (
  bookings: any[],
  serviceProviders: any[],
  commissionTransactions: any[],
  users: any[],
  systemStats: any,
): ServiceProviderPerformanceData[] => {
  if (!systemStats || !users) return [];

  const providerIds =
    bookings && bookings.length > 0
      ? extractProviderIdsFromBookings(bookings)
      : new Set<string>();

  let providersToShow = serviceProviders;

  if (!providersToShow || providersToShow.length === 0) return [];

  if (providerIds.size === 0) {
    return createFallbackProviderData(providersToShow);
  }

  const performanceMap = buildProviderPerformanceMap(
    providerIds,
    users,
    serviceProviders,
  );

  if (bookings && bookings.length > 0) {
    processBookingsForPerformance(bookings, performanceMap);
  }
  processCommissionTransactions(commissionTransactions, performanceMap);

  const values = Array.from(
    performanceMap.values(),
  ) as ServiceProviderPerformanceData[];
  return values.sort((a, b) => b.totalCommission - a.totalCommission);
};

const getSortValue = (
  provider: ServiceProviderPerformanceData,
  sortBy: "name" | "totalCommission" | "completedBookings",
): any => {
  switch (sortBy) {
    case "name":
      return provider.name.toLowerCase();
    case "totalCommission":
      return provider.totalCommission;
    case "completedBookings":
      return provider.completedBookings;
    default:
      return provider.totalCommission;
  }
};

export const filterAndSortProviders = (
  providers: ServiceProviderPerformanceData[],
  searchTerm: string,
  sortBy: "name" | "totalCommission" | "completedBookings",
  sortOrder: "asc" | "desc",
): ServiceProviderPerformanceData[] => {
  let filtered = providers;

  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (provider) =>
        provider.name.toLowerCase().includes(lowerSearch) ||
        provider.phone.toLowerCase().includes(lowerSearch),
    );
  }

  return [...filtered].sort((a, b) => {
    const aValue = getSortValue(a, sortBy);
    const bValue = getSortValue(b, sortBy);

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
};

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

  const categoryNameMap: Record<string, string> = {};
  if (serviceCategories && Array.isArray(serviceCategories)) {
    serviceCategories.forEach((category: any) => {
      categoryNameMap[category.id] = category.name;
    });
  }

  if (services && Array.isArray(services)) {
    services.forEach((service: any) => {
      if (service.status === "Archived" || service.serviceDeleted === true)
        return;
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
