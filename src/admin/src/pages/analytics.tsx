import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { useAdmin } from "../hooks/useAdmin";
import {
  AnalyticsHeader,
  SystemOverviewStats,
  AnalyticsPieChart,
  ServiceProviderRecords,
  ProviderDetailsModal,
} from "../components";
import { getFirebaseFunctions } from "../services/firebaseApp";
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
  const [walletProviderIds, setWalletProviderIds] = useState<string[]>([]);
  const [loadingWalletBalances, setLoadingWalletBalances] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await refreshAll();
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

  useEffect(() => {
    let cancelled = false;
    setLoadingWalletBalances(true);

    const fetchWalletProviders = async () => {
      try {
        const functions = getFirebaseFunctions();
        const getAllWalletsFn = httpsCallable(functions, "getAllWallets");
        const result = await getAllWalletsFn({});
        const responseData = result.data as {
          success: boolean;
          wallets: Record<string, { balance: number }>;
        };

        if (cancelled) return;

        const balancesMap: Record<string, number> = {};
        const ids: string[] = [];

        Object.entries(responseData.wallets).forEach(([userId, wallet]) => {
          balancesMap[userId] = wallet.balance || 0;
          ids.push(userId);
        });

        setWalletBalances(balancesMap);
        setWalletProviderIds(ids);
      } catch (error) {
        console.error("Error fetching wallet providers:", error);
      } finally {
        if (!cancelled) {
          setLoadingWalletBalances(false);
        }
      }
    };

    fetchWalletProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadProviderAnalytics = async (_providerId: string) => {};

  const filteredUsers = useMemo(() => {
    return filterUsers(users || [], userFilter);
  }, [users, userFilter]);

  const totalProviders = useMemo(() => {
    return countProviders(filteredUsers);
  }, [filteredUsers]);

  const totalClients = useMemo(() => {
    return countClients(filteredUsers);
  }, [filteredUsers]);

  const onlineUsers = useMemo(() => {
    return calculateOnlineUsers(users || []);
  }, [users]);

  const userPieData = useMemo(() => {
    const data = [];
    if (totalProviders > 0) {
      data.push({ name: "Providers", value: totalProviders, color: "#10b981" });
    }
    if (totalClients > 0) {
      data.push({ name: "Clients", value: totalClients, color: "#3b82f6" });
    }
    return data;
  }, [totalProviders, totalClients]);

  const serviceProviderPerformanceData = useMemo(() => {
    return processServiceProviderPerformance(
      bookings || [],
      serviceProviders || [],
      commissionTransactions || [],
      users || [],
      systemStats,
      walletBalances,
      walletProviderIds,
    );
  }, [
    bookings,
    serviceProviders,
    commissionTransactions,
    users,
    systemStats,
    walletBalances,
    walletProviderIds,
  ]);

  const filteredServiceProviderData = useMemo(() => {
    return filterAndSortProviders(
      serviceProviderPerformanceData,
      searchTerm,
      sortBy,
      sortOrder,
    );
  }, [serviceProviderPerformanceData, searchTerm, sortBy, sortOrder]);

  const serviceCategoryData = useMemo(() => {
    return processServiceCategoryData(services || [], serviceCategories || []);
  }, [services, serviceCategories]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AnalyticsHeader showMobileBar={showMobileBar} />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        <SystemOverviewStats
          totalRevenue={systemStats?.totalRevenue || 0}
          totalCommission={systemStats?.totalCommission || 0}
          totalTopups={systemStats?.totalTopups || 0}
          onlineUsers={onlineUsers}
          loading={loading.systemStats}
          formatCurrency={formatCurrency}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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

          <AnalyticsPieChart
            title="Services by Category"
            data={serviceCategoryData}
            loading={loading.services}
            emptyMessage="No service data"
            emptySubMessage="No service category data available."
            innerRadius={0}
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
