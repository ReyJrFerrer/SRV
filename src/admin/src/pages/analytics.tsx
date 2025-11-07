import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  AnalyticsHeader,
  SystemOverviewStats,
  AnalyticsPieChart,
  ServiceProviderRecords,
  ProviderDetailsModal,
} from "../components";
import { walletCanisterService } from "../../../frontend/src/services/walletCanisterService";
import {
  formatCurrency,
  filterUsers,
  countProviders,
  countClients,
  calculateOnlineUsers,
  processServiceProviderPerformance,
  filterAndSortProviders,
  processServiceCategoryData,
} from "../utils/analyticsUtils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "totalRevenue" | "totalCommission" | "completedBookings"
  >("totalRevenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [userFilter, setUserFilter] = useState<"all" | "online" | "dormant">(
    "all",
  );
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>(
    {},
  );
  const [loadingWalletBalances, setLoadingWalletBalances] = useState(false);

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

  // Debug logging for analytics page
  console.log("🔍 [Analytics] systemStats:", systemStats);
  console.log("🔍 [Analytics] totalRevenue:", systemStats?.totalRevenue);
  console.log("🔍 [Analytics] totalCommission:", systemStats?.totalCommission);

  // Filter users based on selected filter
  const filteredUsers = useMemo(() => {
    return filterUsers(users || [], userFilter);
  }, [users, userFilter]);

  // Count users by their current active role (with filtering applied)
  const totalProviders = useMemo(() => {
    return countProviders(filteredUsers);
  }, [filteredUsers]);

  const totalClients = useMemo(() => {
    return countClients(filteredUsers);
  }, [filteredUsers]);

  // Calculate online users
  const onlineUsers = useMemo(() => {
    return calculateOnlineUsers(users || []);
  }, [users]);

  // Pie: Users by type (Providers vs Clients only) with filtering
  const userPieData = [
    { name: "Providers", value: totalProviders, color: "#10b981" },
    { name: "Clients", value: totalClients, color: "#3b82f6" },
  ];

  // Service Provider Records Data
  const serviceProviderPerformanceData = useMemo(() => {
    return processServiceProviderPerformance(
      bookings || [],
      serviceProviders || [],
      commissionTransactions || [],
      users || [],
      systemStats,
      walletBalances,
    );
  }, [
    bookings,
    serviceProviders,
    commissionTransactions,
    users,
    systemStats,
    walletBalances,
  ]);

  // Filtered and sorted service provider performance data
  const filteredServiceProviderData = useMemo(() => {
    return filterAndSortProviders(
      serviceProviderPerformanceData,
      searchTerm,
      sortBy,
      sortOrder,
    );
  }, [serviceProviderPerformanceData, searchTerm, sortBy, sortOrder]);

  // Service Categories Pie Chart Data
  const serviceCategoryData = useMemo(() => {
    return processServiceCategoryData(services || [], serviceCategories || []);
  }, [services, serviceCategories]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AnalyticsHeader showMobileBar={showMobileBar} />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        {/* System Overview */}
        <SystemOverviewStats
          totalRevenue={systemStats?.totalRevenue || 0}
          totalCommission={systemStats?.totalCommission || 0}
          totalTopups={systemStats?.totalTopups || 0}
          onlineUsers={onlineUsers}
          loading={loading.systemStats}
          formatCurrency={formatCurrency}
        />

        {/* Provider Analytics */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Users by Type */}
          <AnalyticsPieChart
            title="Users by Type"
            data={userPieData}
            loading={loading.users}
            emptyMessage="No users found"
            emptySubMessage={
              userFilter === "online"
                ? "No online users found."
                : userFilter === "dormant"
                  ? "No dormant users found."
                  : "No user data available."
            }
            innerRadius={50}
            showFilters={true}
            filterValue={userFilter}
            onFilterChange={setUserFilter}
            summaryStats={
              totalProviders + totalClients > 0 ? (
                <>
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
                </>
              ) : undefined
            }
          />

          {/* Service Categories Pie Chart */}
          <AnalyticsPieChart
            title="Services by Category"
            data={serviceCategoryData}
            loading={loading.services}
            emptyMessage="No service data"
            emptySubMessage="No service category data available."
            innerRadius={0}
            tooltipFormatter={(value: number, name: string) => [
              `${value} services`,
              name,
            ]}
            summaryStats={
              serviceCategoryData && serviceCategoryData.length > 0 ? (
                <>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500">
                        Total Services
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {serviceCategoryData.reduce(
                          (sum, item) => sum + item.value,
                          0,
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500">
                        Categories
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {serviceCategoryData.length}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500">
                      Top Category
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {serviceCategoryData[0].name}
                    </p>
                  </div>
                </>
              ) : undefined
            }
          />
        </div>

        {/* Service Provider Records */}
        <ServiceProviderRecords
          providers={filteredServiceProviderData}
          loading={
            loading.bookings ||
            loading.serviceProviders ||
            !systemStats ||
            loadingWalletBalances
          }
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={() =>
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
          }
          onRefresh={() => refreshBookings(true)}
        />
      </main>

      {/* Provider Details Modal */}
      <ProviderDetailsModal
        isOpen={showProviderDetails}
        provider={selectedProvider}
        providerAnalytics={providerAnalytics}
        onClose={() => {
          setShowProviderDetails(false);
          setSelectedProvider(null);
          setProviderAnalytics(null);
        }}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};
