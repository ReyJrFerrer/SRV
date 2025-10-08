import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export const RemittanceAnalyticsPage: React.FC = () => {
  const {
    remittanceStats,
    remittanceProviders,
    loading,
    refreshRemittanceStats,
    refreshRemittanceProviders,
    getProviderAnalytics,
  } = useAdmin();

  const [searchParams] = useSearchParams();
  const selectedProviderId = searchParams.get("provider");

  const [dateRange, setDateRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [providerAnalytics, setProviderAnalytics] = useState<any | null>(null);
  const [showProviderDetails, setShowProviderDetails] = useState(false);

  useEffect(() => {
    refreshRemittanceStats();
    refreshRemittanceProviders();
  }, [refreshRemittanceStats, refreshRemittanceProviders]);

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

  const loadProviderAnalytics = async (providerId: string) => {
    try {
      const analytics = await getProviderAnalytics(
        providerId,
        getDateRangeStart(),
        new Date(),
      );
      setProviderAnalytics(analytics);
    } catch (error) {
      console.error("Failed to load provider analytics:", error);
    }
  };

  const getDateRangeStart = () => {
    const now = new Date();
    switch (dateRange) {
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case "year":
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Removed unused formatDate helper to satisfy noUnusedLocals

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const topProviders = remittanceProviders
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 5);

  const overdueProviders = remittanceProviders
    .filter((p) => p.overdueOrders > 0)
    .sort((a, b) => b.overdueOrders - a.overdueOrders);

  const highValueProviders = remittanceProviders
    .filter((p) => p.averageOrderValue > 1000)
    .sort((a, b) => b.averageOrderValue - a.averageOrderValue);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  to="/remittance"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to Remittance
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">
                  Remittance Analytics
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Commission payment analytics and performance insights
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    refreshRemittanceStats(true);
                    refreshRemittanceProviders(true);
                  }}
                  disabled={
                    loading.remittanceStats || loading.remittanceProviders
                  }
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                >
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Date Range Selector */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Analytics Period
            </h2>
            <div className="flex space-x-2">
              {[
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
                { value: "quarter", label: "This Quarter" },
                { value: "year", label: "This Year" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value as any)}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    dateRange === option.value
                      ? "border border-indigo-200 bg-indigo-100 text-indigo-700"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500">
                    <ChartBarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Orders
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

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Settled Orders
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

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Commission
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

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500">
                    <ChartBarIcon className="h-5 w-5 text-white" />
                  </div>
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
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
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

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Average Order Value
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

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Overdue Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceStats
                        ? "..."
                        : remittanceStats?.totalOverdueOrders || 0}
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
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
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
                    No provider data available for the selected period.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProviders.map((provider, index) => (
                    <div
                      key={provider.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowProviderDetails(true);
                        loadProviderAnalytics(provider.id);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500">
                            <span className="text-sm font-medium text-white">
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
                          {provider.totalOrdersCompleted} orders
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overdue Providers */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">
                Providers with Overdue Orders
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
              ) : overdueProviders.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    All Clear!
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    No providers have overdue orders.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overdueProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 hover:bg-red-100"
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowProviderDetails(true);
                        loadProviderAnalytics(provider.id);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
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
                        <div className="text-sm font-medium text-red-600">
                          {provider.overdueOrders} overdue
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(provider.outstandingBalance)}{" "}
                          outstanding
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* High Value Providers */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              High Value Providers (Avg Order &gt; ₱1,000)
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
                  No providers with average order value above ₱1,000.
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                          <span className="text-sm font-medium text-white">
                            {provider.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
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
        <div className="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
          <div className="relative top-20 mx-auto w-4/5 max-w-4xl rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Provider Analytics - {selectedProvider.name}
                </h3>
                <button
                  onClick={() => {
                    setShowProviderDetails(false);
                    setSelectedProvider(null);
                    setProviderAnalytics(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExclamationTriangleIcon className="h-6 w-6" />
                </button>
              </div>

              {providerAnalytics ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-6">
                    <h4 className="mb-4 text-lg font-medium text-gray-900">
                      Order Statistics
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Total Orders:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {providerAnalytics.totalOrders}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Settled Orders:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {providerAnalytics.settledOrders}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Pending Orders:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {providerAnalytics.pendingOrders}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-6">
                    <h4 className="mb-4 text-lg font-medium text-gray-900">
                      Financial Metrics
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Total Commission Paid:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(
                            providerAnalytics.totalCommissionPaid,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Total Service Amount:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(providerAnalytics.totalServiceAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Average Order Value:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
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

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowProviderDetails(false);
                    setSelectedProvider(null);
                    setProviderAnalytics(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
