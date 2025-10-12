import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  UserIcon,
  ArrowLeftIcon,
  XMarkIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export const AnalyticsPage: React.FC = () => {
  const {
    remittanceStats,
    remittanceProviders,
    services,
    serviceCategories,
    loading,
    refreshRemittanceStats,
    refreshRemittanceProviders,
    refreshRemittanceOrders,
    refreshServices,
    refreshServiceCategories,
    refreshAll,
    getProviderAnalytics,
  } = useAdmin();

  const [searchParams] = useSearchParams();
  const selectedProviderId = searchParams.get("provider");

  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [providerAnalytics, setProviderAnalytics] = useState<any | null>(null);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    refreshRemittanceStats();
    refreshRemittanceProviders();
    refreshRemittanceOrders();
    refreshServices();
    refreshServiceCategories();
  }, [refreshRemittanceStats, refreshRemittanceProviders, refreshRemittanceOrders, refreshServices, refreshServiceCategories]);

  useEffect(() => {
    if (selectedProviderId) {
      const provider = remittanceProviders.find(
        (p) => p.id === selectedProviderId,
      );
      if (provider) {
        setSelectedProvider(provider);
        setShowProviderDetails(true);
        loadProviderAnalytics(provider.id);
      }
    }
  }, [selectedProviderId, remittanceProviders]);

  useEffect(() => {
    const onScroll = () => {
      // Show the mobile actions bar when the header is scrolled out of view
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadProviderAnalytics = async (providerId: string) => {
    try {
      const analytics = await getProviderAnalytics(
        providerId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date(),
      );
      setProviderAnalytics(analytics);
    } catch (error) {
      console.error("Failed to load provider analytics:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const topProviders = remittanceProviders
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 5);

  const highValueProviders = remittanceProviders
    .filter((p) => p.averageOrderValue > 1000)
    .sort((a, b) => b.averageOrderValue - a.averageOrderValue);

  // Service Categories Pie Chart Data
  const serviceCategoryData = useMemo(() => {
    console.log("Services:", services);
    console.log("Services Length:", services.length);
    console.log("Service Categories:", serviceCategories);
    
    const categoryCounts: Record<string, number> = {};
    
    // Create a map of category IDs to names from serviceCategories
    const categoryNameMap: Record<string, string> = {};
    serviceCategories.forEach((category: any) => {
      categoryNameMap[category.id] = category.name;
    });
    
    console.log("Category Name Map:", categoryNameMap);
    
    // Count services by category from actual services
    services.forEach((service: any) => {
      const categoryId = service.category?.id || service.category || "Unknown";
      const categoryName = categoryNameMap[categoryId] || categoryId;
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });

    console.log("Category Counts:", categoryCounts);

    // Define professional colors for different service categories
    const categoryColors = [
      "#3b82f6", // blue-500
      "#10b981", // emerald-500
      "#f59e0b", // amber-500
      "#ef4444", // red-500
      "#8b5cf6", // violet-500
      "#06b6d4", // cyan-500
      "#84cc16", // lime-500
      "#f97316", // orange-500
      "#6366f1", // indigo-500
      "#ec4899", // pink-500
      "#14b8a6", // teal-500
      "#a855f7", // purple-500
    ];

    const result = Object.entries(categoryCounts)
      .map(([name, value], index) => ({
      name,
      value,
        color: categoryColors[index % categoryColors.length],
      }))
      .sort((a, b) => b.value - a.value); // Sort by count descending
    
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
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                >
                  <ArrowPathIcon className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
                <Link
                  to="/dashboard"
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
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
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            >
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              to="/dashboard"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
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
                  <ChartBarIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Bookings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceStats
                        ? "..."
                        : remittanceStats?.totalOrders || 0}
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
                  <CheckCircleIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Settled Bookings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceStats
                        ? "..."
                        : remittanceStats?.totalSettledOrders || 0}
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
                  <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Commission Paid
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceStats
                        ? "..."
                        : formatCurrency(
                            remittanceStats?.totalCommissionPaid || 0,
                          )}
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
                  <ChartBarIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Avg Commission Rate
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceStats
                        ? "..."
                        : formatPercentage(
                            remittanceStats?.averageCommissionRate || 0,
                          )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Service Amount
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceStats
                        ? "..."
                        : formatCurrency(
                            remittanceStats?.totalServiceAmount || 0,
                          )}
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
                  <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Average Booking Value
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceStats
                        ? "..."
                        : formatCurrency(
                            remittanceStats?.averageOrderValue || 0,
                          )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Analytics */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Top Providers */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">
                Top Performing Providers
              </h2>
            </div>
            <div className="p-6">
              {loading.remittanceProviders ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading providers...
                  </p>
                </div>
              ) : topProviders.length === 0 ? (
                <div className="py-12 text-center">
                  <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No providers found
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    No provider data available.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProviders.map((provider, index) => (
                    <div
                      key={provider.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-blue-100 p-4 hover:bg-blue-50/40"
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowProviderDetails(true);
                        loadProviderAnalytics(provider.id);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                            <span className="text-sm font-semibold">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {provider.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {provider.phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(provider.totalEarnings)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {provider.totalOrdersCompleted} bookings
                        </div>
                      </div>
                    </div>
                  ))}
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
              ) : serviceCategoryData.length === 0 ? (
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
                          {serviceCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value} services`,
                            name
                          ]}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                          }}
                          labelStyle={{
                            fontWeight: '600',
                            color: '#374151',
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          iconType="circle"
                          wrapperStyle={{
                            fontSize: '13px',
                            fontWeight: '500',
                            paddingTop: '20px',
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
                        <p className="text-sm font-medium text-gray-500">Total Services</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {serviceCategoryData.reduce((sum, item) => sum + item.value, 0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-500">Categories</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {serviceCategoryData.length}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">Top Category</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {serviceCategoryData.length > 0 ? serviceCategoryData[0].name : "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              
              )}
            </div>
          </div>
        </div>

        {/* High Value Providers */}
        <div className="mt-8 rounded-lg border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              High Value Providers (Avg Booking &gt; ₱1,000)
            </h2>
          </div>
          <div className="p-6">
            {loading.remittanceProviders ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-500">
                  Loading providers...
                </p>
              </div>
            ) : highValueProviders.length === 0 ? (
              <div className="py-12 text-center">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900">
                  No high value providers
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  No providers with average booking value above ₱1,000.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {highValueProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setShowProviderDetails(true);
                      loadProviderAnalytics(provider.id);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <img
                          src="/images/srv characters (SVG)/plumber.svg"
                          alt="provider avatar"
                          className="h-10 w-10 rounded-full border border-blue-100 object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {provider.phone}
                        </div>
                        <div className="text-sm text-gray-500">
                          Avg: {formatCurrency(provider.averageOrderValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                className="rounded-md p-1 text-gray-400 hover:bg-blue-50 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Total Service Amount
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(providerAnalytics.totalServiceAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Average Booking Value
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(providerAnalytics.averageOrderValue)}
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
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
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
