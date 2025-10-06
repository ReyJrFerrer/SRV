import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PhoneIcon,
  UserIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

export const ProviderManagementPage: React.FC = () => {
  const {
    remittanceProviders,
    loading,
    refreshRemittanceProviders,
    getProviderDashboard,
    getProviderAnalytics,
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "totalEarnings" | "outstandingBalance" | "lastActivity"
  >("totalEarnings");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [providerDashboard, setProviderDashboard] = useState<any | null>(null);
  const [, setProviderAnalytics] = useState<any | null>(null);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [dateRange] = useState<"week" | "month" | "quarter" | "year">("month");

  useEffect(() => {
    refreshRemittanceProviders();
  }, [refreshRemittanceProviders]);

  const filteredProviders = remittanceProviders
    .filter(
      (provider) =>
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.id.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "totalEarnings":
          aValue = a.totalEarnings;
          bValue = b.totalEarnings;
          break;
        case "outstandingBalance":
          aValue = a.outstandingBalance;
          bValue = b.outstandingBalance;
          break;
        case "lastActivity":
          aValue = new Date(a.lastActivity).getTime();
          bValue = new Date(b.lastActivity).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(date);
  };

  const handleViewProvider = async (provider: any) => {
    setSelectedProvider(provider);
    setShowProviderDetails(true);

    try {
      const [dashboard, analytics] = await Promise.all([
        getProviderDashboard(provider.id),
        getProviderAnalytics(provider.id, getDateRangeStart(), new Date()),
      ]);

      setProviderDashboard(dashboard);
      setProviderAnalytics(analytics);
    } catch (error) {
      console.error("Failed to load provider details:", error);
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

  const getStatusColor = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0) return "text-red-600";
    if (pendingOrders > 0) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusText = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0) return `${overdueOrders} overdue`;
    if (pendingOrders > 0) return `${pendingOrders} pending`;
    return "All clear";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
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
                  Provider Management
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage service providers and their commission payments
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => refreshRemittanceProviders(true)}
                  disabled={loading.remittanceProviders}
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
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500">
                    <UserIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Providers
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceProviders
                        ? "..."
                        : remittanceProviders.length}
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
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Earnings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceProviders
                        ? "..."
                        : formatCurrency(
                            remittanceProviders.reduce(
                              (sum, p) => sum + p.totalEarnings,
                              0,
                            ),
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Outstanding Balance
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceProviders
                        ? "..."
                        : formatCurrency(
                            remittanceProviders.reduce(
                              (sum, p) => sum + p.outstandingBalance,
                              0,
                            ),
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500">
                    <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Overdue Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.remittanceProviders
                        ? "..."
                        : remittanceProviders.reduce(
                            (sum, p) => sum + p.overdueOrders,
                            0,
                          )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Search */}
            <div>
              <label
                htmlFor="search"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Search Providers
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  placeholder="Search by name, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label
                htmlFor="sortBy"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Sort By
              </label>
              <select
                id="sortBy"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="totalEarnings">Total Earnings</option>
                <option value="outstandingBalance">Outstanding Balance</option>
                <option value="name">Name</option>
                <option value="lastActivity">Last Activity</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label
                htmlFor="sortOrder"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Order
              </label>
              <select
                id="sortOrder"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Providers Table */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              Service Providers ({filteredProviders.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {loading.remittanceProviders ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-500">
                  Loading providers...
                </p>
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <UserIcon className="h-12 w-12" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900">
                  No providers found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm
                    ? "No providers match your search criteria."
                    : "Service providers will appear here once they have remittance activity."}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Total Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Outstanding
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500">
                              <span className="text-sm font-medium text-white">
                                {provider.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {provider.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {provider.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <PhoneIcon className="mr-2 h-4 w-4" />
                          {provider.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                        {formatCurrency(provider.totalEarnings)}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                        {formatCurrency(provider.outstandingBalance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${getStatusColor(provider.overdueOrders, provider.pendingOrders)}`}
                        >
                          {getStatusText(
                            provider.overdueOrders,
                            provider.pendingOrders,
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {formatRelativeTime(new Date(provider.lastActivity))}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button
                          onClick={() => handleViewProvider(provider)}
                          className="inline-flex items-center rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Provider Details Modal */}
      {showProviderDetails && selectedProvider && (
        <div className="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
          <div className="relative top-20 mx-auto w-4/5 max-w-6xl rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Provider Details - {selectedProvider.name}
                </h3>
                <button
                  onClick={() => {
                    setShowProviderDetails(false);
                    setSelectedProvider(null);
                    setProviderDashboard(null);
                    setProviderAnalytics(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Provider Info */}
                <div className="rounded-lg bg-gray-50 p-6">
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    Provider Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Name:
                      </span>
                      <p className="text-sm text-gray-900">
                        {selectedProvider.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Phone:
                      </span>
                      <p className="text-sm text-gray-900">
                        {selectedProvider.phone}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Provider ID:
                      </span>
                      <p className="font-mono text-sm text-gray-900">
                        {selectedProvider.id}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Last Activity:
                      </span>
                      <p className="text-sm text-gray-900">
                        {formatDate(new Date(selectedProvider.lastActivity))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-lg bg-gray-50 p-6">
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    Financial Summary
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Total Earnings:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedProvider.totalEarnings)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Settled Commission:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedProvider.settledCommission)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Outstanding Balance:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedProvider.outstandingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Pending Commission:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedProvider.pendingCommission)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Average Order Value:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedProvider.averageOrderValue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Statistics */}
                <div className="rounded-lg bg-gray-50 p-6">
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    Order Statistics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Total Orders Completed:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedProvider.totalOrdersCompleted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Pending Orders:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedProvider.pendingOrders}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Overdue Orders:
                      </span>
                      <span
                        className={`text-sm font-medium ${selectedProvider.overdueOrders > 0 ? "text-red-600" : "text-gray-900"}`}
                      >
                        {selectedProvider.overdueOrders}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {providerDashboard && (
                  <div className="rounded-lg bg-gray-50 p-6">
                    <h4 className="mb-4 text-lg font-medium text-gray-900">
                      Recent Activity
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">
                          Orders Awaiting Payment:
                        </span>
                        <p className="text-sm text-gray-900">
                          {providerDashboard.ordersAwaitingPayment?.length || 0}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">
                          Orders Pending Validation:
                        </span>
                        <p className="text-sm text-gray-900">
                          {providerDashboard.ordersPendingValidation?.length ||
                            0}
                        </p>
                      </div>
                      {providerDashboard.nextDeadline && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            Next Deadline:
                          </span>
                          <p className="text-sm text-gray-900">
                            {formatDate(
                              new Date(providerDashboard.nextDeadline),
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowProviderDetails(false);
                    setSelectedProvider(null);
                    setProviderDashboard(null);
                    setProviderAnalytics(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <Link
                  to={`/remittance/analytics?provider=${selectedProvider.id}`}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  View Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
