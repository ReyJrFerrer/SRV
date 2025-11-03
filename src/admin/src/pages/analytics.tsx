import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { ServiceProviderPerformanceTable } from "../components";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  UserIcon,
  ArrowLeftIcon,
  XMarkIcon,
  PhoneIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { walletCanisterService } from "../../../frontend/src/services/walletCanisterService";

// Helper function to check if user is online (active within last 24 hours)
const isUserOnline = (user: any): boolean => {
  if (!user.updatedAt) return false;
  const updatedAt = typeof user.updatedAt === "number" 
    ? new Date(Number(user.updatedAt) / 1000000)
    : new Date(user.updatedAt);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate <= 24;
};

// Helper function to check if user is dormant (not updated for at least a month)
const isUserDormant = (user: any): boolean => {
  if (!user.updatedAt) return true; // Consider users without update time as dormant
  const updatedAt = typeof user.updatedAt === "number" 
    ? new Date(Number(user.updatedAt) / 1000000)
    : new Date(user.updatedAt);
  const now = new Date();
  const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate >= 30; // At least 30 days
};

export const AnalyticsPage: React.FC = () => {
  const {
    systemStats,
    users,
    bookings,
    serviceProviders,
    commissionTransactions,
    services,
    serviceCategories,
    loading,
    refreshBookings,
    refreshAll,
    refreshSystemStats,
  } = useAdmin();

  const [searchParams] = useSearchParams();
  const selectedProviderId = searchParams.get("provider");
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [providerAnalytics, setProviderAnalytics] = useState<any | null>(null);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "totalRevenue" | "totalCommission" | "completedBookings"
  >("totalRevenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [userFilter, setUserFilter] = useState<"all" | "online" | "dormant">("all");
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [loadingWalletBalances, setLoadingWalletBalances] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await refreshAll();
      // refreshSystemStats is already called in refreshAll, but call it again to ensure it's up to date
      await refreshSystemStats();
    };
    loadData();
  }, [refreshAll, refreshSystemStats]);

  useEffect(() => {
    if (selectedProviderId) {
      const provider = serviceProviders.find(
        (p) => p.id === selectedProviderId,
      );
      if (provider) {
        setSelectedProvider(provider);
        setShowProviderDetails(true);
        loadProviderAnalytics(provider.id);
      }
    }
  }, [selectedProviderId, serviceProviders]);

  useEffect(() => {
    const onScroll = () => {
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Refresh system stats when bookings or commission transactions change
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      console.log(
        "🔍 [Analytics] Bookings data changed, refreshing system stats",
      );
      refreshSystemStats();
    }
  }, [bookings, commissionTransactions, refreshSystemStats]);

  // Fetch wallet balances for all providers
  useEffect(() => {
    const fetchWalletBalances = async () => {
      // Get all provider IDs from serviceProviderPerformanceData
      const providerIds = new Set<string>();
      
      // Collect provider IDs from various sources
      if (serviceProviders && serviceProviders.length > 0) {
        serviceProviders.forEach((provider) => {
          providerIds.add(provider.id);
        });
      }
      
      if (bookings && bookings.length > 0) {
        bookings.forEach((booking) => {
          const providerId = booking.serviceProviderId || booking.providerId;
          if (providerId) {
            providerIds.add(providerId);
          }
        });
      }

      if (providerIds.size === 0) {
        return;
      }

      setLoadingWalletBalances(true);
      try {
        const balancePromises = Array.from(providerIds).map(async (id) => {
          try {
            const balance = await walletCanisterService.getBalanceOf(id);
            return { id, balance };
          } catch (error) {
            console.error(`Failed to fetch wallet balance for ${id}:`, error);
            return { id, balance: 0 };
          }
        });

        const results = await Promise.all(balancePromises);
        const balancesMap: Record<string, number> = {};
        results.forEach(({ id, balance }) => {
          balancesMap[id] = balance;
        });
        setWalletBalances(balancesMap);
      } catch (error) {
        console.error("Error fetching wallet balances:", error);
      } finally {
        setLoadingWalletBalances(false);
      }
    };

    // Only fetch if we have provider data
    if (serviceProviders || (bookings && bookings.length > 0)) {
      fetchWalletBalances();
    }
  }, [serviceProviders, bookings]);

  const loadProviderAnalytics = async (_providerId: string) => {
    console.log("Provider analytics loading removed - was using mock data");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Debug logging for analytics page
  console.log("🔍 [Analytics] systemStats:", systemStats);
  console.log("🔍 [Analytics] totalRevenue:", systemStats?.totalRevenue);
  console.log("🔍 [Analytics] totalCommission:", systemStats?.totalCommission);

  // Filter users based on selected filter
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter((user) => {
      if (userFilter === "online") {
        return isUserOnline(user);
      } else if (userFilter === "dormant") {
        return isUserDormant(user);
      }
      return true; // "all" - no filter
    });
  }, [users, userFilter]);

  // Count users by their current active role (with filtering applied)
  const totalProviders =
    filteredUsers?.filter((user) => {
      if (!user.activeRole) return false;

      // Handle both string format and Motoko variant format
      if (typeof user.activeRole === "string") {
        return (
          user.activeRole === "ServiceProvider" ||
          user.activeRole === "Provider"
        );
      }

      // Handle Motoko variant format
      if (typeof user.activeRole === "object") {
        return (
          "ServiceProvider" in user.activeRole || "Provider" in user.activeRole
        );
      }

      return false;
    }).length ?? 0;

  const totalClients =
    filteredUsers?.filter((user) => {
      if (!user.activeRole) return false;

      // Handle both string format and Motoko variant format
      if (typeof user.activeRole === "string") {
        return user.activeRole === "Client";
      }

      // Handle Motoko variant format
      if (typeof user.activeRole === "object") {
        return "Client" in user.activeRole;
      }

      return false;
    }).length ?? 0;

  // Calculate online users

  const onlineUsers = useMemo(() => {
    if (!users) return 0;
    return users.filter((user) => {
      if (!user.activeRole) return false;
      const hasValidRole =
        typeof user.activeRole === "string"
          ? user.activeRole === "ServiceProvider" ||
            user.activeRole === "Provider" ||
            user.activeRole === "Client"
          : typeof user.activeRole === "object"
            ? "ServiceProvider" in user.activeRole ||
              "Provider" in user.activeRole ||
              "Client" in user.activeRole
            : false;
      return hasValidRole && isUserOnline(user);
    }).length;
  }, [users]);

  // Pie: Users by type (Providers vs Clients only) with filtering
  const userPieData = [
    { name: "Providers", value: totalProviders, color: "#10b981" },
    { name: "Clients", value: totalClients, color: "#3b82f6" },
  ];

  // Service Provider Records Data
  const serviceProviderPerformanceData = useMemo(() => {
    console.log("🔍 [ServiceProviderPerformance] Debug data:", {
      bookingsLength: bookings?.length || 0,
      serviceProvidersLength: serviceProviders?.length || 0,
      usersLength: users?.length || 0,
      bookings: bookings,
      serviceProviders: serviceProviders,
      systemStatsLoaded: !!systemStats,
    });

    // Don't calculate if system stats are not loaded yet
    if (!systemStats) {
      console.log(
        "🔍 [ServiceProviderPerformance] SystemStats not loaded, returning empty array",
      );
      return [];
    }

    // If no bookings data available due to network issues, show current service providers with basic info
    if (!bookings || bookings.length === 0) {
      console.log(
        "🔍 [ServiceProviderPerformance] No bookings data, showing current providers only",
      );
      if (!systemStats) {
        console.log(
          "🔍 [ServiceProviderPerformance] SystemStats not loaded yet, returning empty array",
        );
        return [];
      }

      let providersToShow = serviceProviders;
      if (!providersToShow || providersToShow.length === 0) {
        console.log(
          "🔍 [ServiceProviderPerformance] No serviceProviders, trying users data",
        );
        if (users && users.length > 0) {
          // Filter users who are service providers and convert to ServiceProviderData format
          const serviceProviderUsers = users.filter((user) => {
            if (typeof user.activeRole === "string") {
              return user.activeRole === "ServiceProvider";
            } else if (user.activeRole && typeof user.activeRole === "object") {
              return "ServiceProvider" in user.activeRole;
            }
            return false;
          });

          // Convert Profile[] to ServiceProviderData[] format
          providersToShow = serviceProviderUsers.map((user) => ({
            id: user.id.toString(),
            name: user.name,
            phone: user.phone,
            totalEarnings: 0,
            pendingCommission: 0,
            settledCommission: 0,
            lastActivity: user.updatedAt
              ? new Date(Number(user.updatedAt) / 1000000)
              : new Date(),
          }));
          console.log(
            "🔍 [ServiceProviderPerformance] Found service providers in users:",
            providersToShow.length,
          );
        }

        if (!providersToShow || providersToShow.length === 0) {
          console.log(
            "🔍 [ServiceProviderPerformance] No service providers found anywhere, returning empty array",
          );
          return [];
        }
      }

      const totalRevenue = systemStats?.totalRevenue || 0;
      const totalCommission = systemStats?.totalCommission || 0;
      const totalBookings = systemStats?.totalBookings || 0;
      const settledBookings = systemStats?.settledBookings || 0;

      console.log("🔍 [ServiceProviderPerformance] SystemStats data:", {
        totalRevenue,
        totalCommission,
        totalBookings,
        settledBookings,
        systemStats,
      });

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
      console.log(
        "🔍 [ServiceProviderPerformance] Fallback data:",
        fallbackData,
      );
      return fallbackData;
    }

    if (!users) {
      return [];
    }

    const performanceMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        totalRevenue: number;
        totalCommission: number;
        completedBookings: number;
        totalBookings: number;
        walletBalance: number;
      }
    >();

    // Find all users who have ever been service providers
    const providerIds = new Set<string>();
    bookings.forEach((booking) => {
      if (booking.serviceProviderId) {
        providerIds.add(booking.serviceProviderId);
      }
    });

    // Initialize with users who have provider history
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
          // Update existing entry with wallet balance
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

    console.log("🔍 [ServiceProviderPerformance] Final result:", {
      bookingsLength: bookings?.length || 0,
      serviceProvidersLength: serviceProviders?.length || 0,
      usersLength: users?.length || 0,
      resultLength: result.length,
      result: result,
    });

    return result;
  }, [bookings, serviceProviders, commissionTransactions, users, systemStats, walletBalances]);

  // Filtered and sorted service provider performance data
  const filteredServiceProviderData = useMemo(() => {
    let filtered = serviceProviderPerformanceData;

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
  }, [serviceProviderPerformanceData, searchTerm, sortBy, sortOrder]);

  // Service Categories Pie Chart Data
  const serviceCategoryData = useMemo(() => {
    console.log("Services:", services);
    console.log("Services Length:", services?.length || 0);
    console.log("Service Categories:", serviceCategories);

    const categoryCounts: Record<string, number> = {};

    // Create a map of category IDs to names from serviceCategories
    const categoryNameMap: Record<string, string> = {};
    if (serviceCategories && Array.isArray(serviceCategories)) {
      serviceCategories.forEach((category: any) => {
        categoryNameMap[category.id] = category.name;
      });
    }

    console.log("Category Name Map:", categoryNameMap);

    // Count services by category from actual services
    if (services && Array.isArray(services)) {
      services.forEach((service: any) => {
        const categoryId =
          service.category?.id || service.category || "Unknown";
        const categoryName = categoryNameMap[categoryId] || categoryId;
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
    }

    console.log("Category Counts:", categoryCounts);
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

    console.log("Service Category Data:", result);
    return result;
  }, [services, serviceCategories]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="z-50 border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow sm:sticky sm:top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Analytics
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Commission payment analytics and performance insights
                  </p>
                </div>
              </div>
              <div className="ml-0 flex w-full flex-row gap-2 sm:ml-4 sm:w-auto sm:space-x-4">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <ArrowPathIcon
                    className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
                <Link
                  to="/dashboard"
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
                >
                  <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom actions bar (appears when header is scrolled out) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-yellow-100 px-4 py-3 backdrop-blur transition-all duration-300 ease-out supports-[backdrop-filter]:bg-white/80 sm:hidden ${
          showMobileBar
            ? "translate-y-0 bg-white/95 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-row items-stretch gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              to="/dashboard"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
              Back
            </Link>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        {/* System Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.systemStats
                        ? "..."
                        : formatCurrency(systemStats?.totalRevenue || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Commission
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.systemStats
                        ? "..."
                        : formatCurrency(systemStats?.totalCommission || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Topups
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.systemStats
                        ? "..."
                        : formatCurrency(systemStats?.totalTopups || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Online Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.users ? "..." : onlineUsers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Analytics */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Users by Type */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Users by Type
                </h2>
                {/* Toggle Pills */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserFilter("all")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      userFilter === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setUserFilter("online")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      userFilter === "online"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => setUserFilter("dormant")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      userFilter === "dormant"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Dormant
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {loading.users ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading users...</p>
                </div>
              ) : (totalProviders + totalClients) === 0 ? (
                <div className="py-12 text-center">
                  <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No users found
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {userFilter === "online"
                      ? "No online users found."
                      : userFilter === "dormant"
                        ? "No dormant users found."
                        : "No user data available."}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={50}
                          paddingAngle={2}
                        >
                          {userPieData.map((entry, index) => (
                            <Cell key={`upie-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => v.toLocaleString()}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* User counts below the chart */}
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-500">
                          Providers
                        </p>
                        <p className="text-lg font-semibold text-emerald-600">
                          {totalProviders}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-500">
                          Clients
                        </p>
                        <p className="text-lg font-semibold text-blue-600">
                          {totalClients}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">
                        Total Users
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {totalProviders + totalClients}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Service Categories Pie Chart */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">
                Services by Category
              </h2>
            </div>
            <div className="p-6">
              {loading.services ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading service data...
                  </p>
                </div>
              ) : !serviceCategoryData || serviceCategoryData.length === 0 ? (
                <div className="py-12 text-center">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No service data
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    No service category data available.
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceCategoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={0}
                          paddingAngle={2}
                          stroke="#fff"
                          strokeWidth={3}
                        >
                          {serviceCategoryData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          )) || []}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value} services`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            fontSize: "14px",
                          }}
                          labelStyle={{
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{
                            fontSize: "13px",
                            fontWeight: "500",
                            paddingTop: "20px",
                          }}
                          iconSize={12}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Chart Summary */}
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-500">
                          Total Services
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {serviceCategoryData?.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          ) || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-500">
                          Categories
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {serviceCategoryData?.length || 0}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">
                        Top Category
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {serviceCategoryData && serviceCategoryData.length > 0
                          ? serviceCategoryData[0].name
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Service Provider Records */}
        <div className="mt-8">
          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search providers by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <label className="sr-only" htmlFor="sortBy">
                Sort by
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "name"
                      | "totalRevenue"
                      | "totalCommission"
                      | "completedBookings",
                  )
                }
                className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:w-48"
              >
                <option value="totalRevenue">Total Revenue</option>
                <option value="totalCommission">Total Commission</option>
                <option value="completedBookings">Completed Bookings</option>
                <option value="name">Name</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
                aria-label="Toggle sort order"
              >
                {sortOrder === "asc" ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Service Provider Records Table */}
          <ServiceProviderPerformanceTable
            providers={filteredServiceProviderData}
            loading={
              loading.bookings || 
              loading.serviceProviders || 
              !systemStats ||
              loadingWalletBalances
            }
            onRefresh={() => refreshBookings(true)}
            showRefresh={true}
          />
        </div>
      </main>

      {/* Provider Details Modal */}
      {showProviderDetails && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div className="mt-16 w-full max-w-4xl overflow-hidden rounded-2xl border border-yellow-100 bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Provider Analytics – {selectedProvider.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowProviderDetails(false);
                  setSelectedProvider(null);
                  setProviderAnalytics(null);
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-blue-50 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-6">
              {/* Profile summary */}
              <div className="mb-4 rounded-lg border border-yellow-100 bg-yellow-50/30 p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={encodeURI("/images/srv characters (SVG)/plumber.svg")}
                    alt="Provider"
                    className="h-14 w-14 rounded-full border border-blue-100 bg-white object-contain p-1"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-gray-900">
                      {selectedProvider.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center">
                        <PhoneIcon className="mr-1 h-4 w-4 text-gray-500" />
                        {selectedProvider.phone}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="font-mono text-gray-700">
                        {selectedProvider.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {providerAnalytics ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-xl border border-blue-100 bg-white p-6">
                    <h4 className="mb-4 text-base font-medium text-gray-900">
                      Booking Statistics
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Total Bookings
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {providerAnalytics.totalOrders}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Settled Bookings
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {providerAnalytics.settledOrders}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Pending Bookings
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {providerAnalytics.pendingOrders}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-white p-6">
                    <h4 className="mb-4 text-base font-medium text-gray-900">
                      Financial Metrics
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Total Commission Paid
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(
                            providerAnalytics.totalCommissionPaid,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading provider analytics...
                  </p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button
                onClick={() => {
                  setShowProviderDetails(false);
                  setSelectedProvider(null);
                  setProviderAnalytics(null);
                }}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
