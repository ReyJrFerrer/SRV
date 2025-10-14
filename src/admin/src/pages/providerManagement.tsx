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
  CheckCircleIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ChevronRightIcon,
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
  const [providerAnalytics, setProviderAnalytics] = useState<any | null>(null);
  const [analyticsMode, setAnalyticsMode] = useState<"details" | "analytics">(
    "details",
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [showMobileBar, setShowMobileBar] = useState(false);

  useEffect(() => {
    refreshRemittanceProviders();
  }, [refreshRemittanceProviders]);

  useEffect(() => {
    const onScroll = () => {
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    setAnalyticsMode("details");
    setProviderAnalytics(null);

    try {
      const dashboard = await getProviderDashboard(provider.id);
      setProviderDashboard(dashboard);
    } catch (error) {
      console.error("Failed to load provider details:", error);
    }
  };

  // Inline analytics loading (stay on Provider Management page)
  const getCurrentMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const loadInlineProviderAnalytics = async (providerId: string) => {
    try {
      setAnalyticsLoading(true);
      const analytics = await getProviderAnalytics(
        providerId,
        getCurrentMonthStart(),
        new Date(),
      );
      setProviderAnalytics(analytics);
    } catch (error) {
      console.error("Failed to load provider analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Status chip helpers for provider status
  const getStatusColor = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0) return "bg-red-100 text-red-800";
    if (pendingOrders > 0) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusIcon = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0)
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    if (pendingOrders > 0) return <ClockIcon className="h-4 w-4" />;
    return <CheckCircleIcon className="h-4 w-4" />;
  };

  const getStatusText = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0) return `${overdueOrders} overdue`;
    if (pendingOrders > 0) return `${pendingOrders} pending`;
    return "All clear";
  };

  // Determine if current viewport is mobile (< sm breakpoint)
  const isMobileViewport =
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : true;

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
                    Provider Management
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Manage service providers and their commission payments
                  </p>
                </div>
              </div>
              <div className="ml-0 flex w-full flex-row gap-2 sm:ml-4 sm:w-auto sm:space-x-4">
                <button
                  onClick={() => refreshRemittanceProviders(true)}
                  disabled={loading.remittanceProviders}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                >
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Refresh
                </button>
                <Link
                  to="/analytics"
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
                >
                  <ChartBarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  Analytics
                </Link>
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
              onClick={() => refreshRemittanceProviders(true)}
              disabled={loading.remittanceProviders}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/analytics"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
            >
              <ChartBarIcon className="mr-2 h-4 w-4 text-blue-600" />
              Analytics
            </Link>
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-8 w-8 text-yellow-600" />
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

          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
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

          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
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

          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Overdue Bookings
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
        <div className="mb-6 rounded-lg border border-yellow-100 bg-white p-6 shadow-sm">
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

            {/* Sort Booking */}
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
        <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
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
                <thead className="bg-blue-50/60">
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
                    {/* Hide Actions column on mobile */}
                    <th className="hidden px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:table-cell">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredProviders.map((provider) => (
                    <tr
                      key={provider.id}
                      className="cursor-pointer hover:bg-gray-50 sm:cursor-default sm:hover:bg-transparent"
                      onClick={() => {
                        // On mobile, tapping the row opens details; on desktop, do nothing
                        if (isMobileViewport) handleViewProvider(provider);
                      }}
                      role={isMobileViewport ? "button" : undefined}
                      tabIndex={isMobileViewport ? 0 : -1}
                      onKeyDown={(e) => {
                        if (!isMobileViewport) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleViewProvider(provider);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              src={encodeURI(
                                "/images/srv characters (SVG)/plumber.svg",
                              )}
                              alt="Provider"
                              className="h-10 w-10 rounded-full border border-blue-100 bg-white object-contain p-1"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {provider.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {provider.id.substring(0, 8)}...
                            </div>
                          </div>
                          {/* Mobile chevron indicator */}
                          <ChevronRightIcon className="ml-3 h-5 w-5 text-gray-300 sm:hidden" />
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
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(provider.overdueOrders, provider.pendingOrders)}`}
                        >
                          {getStatusIcon(
                            provider.overdueOrders,
                            provider.pendingOrders,
                          )}
                          <span className="ml-1">
                            {getStatusText(
                              provider.overdueOrders,
                              provider.pendingOrders,
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {formatRelativeTime(new Date(provider.lastActivity))}
                      </td>
                      {/* Hide Actions cell on mobile */}
                      <td className="hidden px-6 py-4 text-sm font-medium whitespace-nowrap sm:table-cell">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProvider(provider);
                          }}
                          className="inline-flex items-center rounded-md border bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
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
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
        >
          <div className="mt-16 flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-blue-100 bg-white shadow-xl">
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-blue-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </span>
                <h3 className="text-base font-semibold text-gray-900">
                  Provider Details
                </h3>
                <span className="hidden text-sm text-gray-500 sm:inline">
                  – {selectedProvider.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowProviderDetails(false);
                  setSelectedProvider(null);
                  setProviderDashboard(null);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
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
                      {typeof selectedProvider.overdueOrders === "number" &&
                        typeof selectedProvider.pendingOrders === "number" && (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selectedProvider.overdueOrders, selectedProvider.pendingOrders)}`}
                          >
                            {getStatusIcon(
                              selectedProvider.overdueOrders,
                              selectedProvider.pendingOrders,
                            )}
                            <span className="ml-1">
                              {getStatusText(
                                selectedProvider.overdueOrders,
                                selectedProvider.pendingOrders,
                              )}
                            </span>
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode switch */}
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={() => setAnalyticsMode("details")}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    analyticsMode === "details"
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-yellow-50"
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => {
                    setAnalyticsMode("analytics");
                    if (selectedProvider && !providerAnalytics) {
                      loadInlineProviderAnalytics(selectedProvider.id);
                    }
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    analyticsMode === "analytics"
                      ? "bg-blue-600 text-white"
                      : "border border-blue-600 bg-white text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Analytics
                </button>
              </div>

              {/* Content */}
              {analyticsMode === "details" ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Provider Info */}
                  <div className="rounded-lg border border-blue-50 bg-white p-5">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                      Provider Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium text-gray-900">
                          {selectedProvider.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium text-gray-900">
                          {selectedProvider.phone}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Provider ID:</span>
                        <span className="font-mono text-gray-900">
                          {selectedProvider.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Activity:</span>
                        <span className="font-medium text-gray-900">
                          {formatDate(new Date(selectedProvider.lastActivity))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="rounded-lg border border-blue-50 bg-white p-5">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                      Financial Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Earnings:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(selectedProvider.totalEarnings)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Settled Commission:
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(selectedProvider.settledCommission)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Outstanding Balance:
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(selectedProvider.outstandingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Pending Commission:
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(selectedProvider.pendingCommission)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Average Booking Value:
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(selectedProvider.averageOrderValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Statistics */}
                  <div className="rounded-lg border border-blue-50 bg-white p-5">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                      Booking Statistics
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Total Bookings Completed:
                        </span>
                        <span className="font-medium text-gray-900">
                          {selectedProvider.totalOrdersCompleted}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pending Bookings:</span>
                        <span className="font-medium text-gray-900">
                          {selectedProvider.pendingOrders}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Overdue Bookings:</span>
                        <span
                          className={`font-medium ${selectedProvider.overdueOrders > 0 ? "text-red-600" : "text-gray-900"}`}
                        >
                          {selectedProvider.overdueOrders}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  {providerDashboard && (
                    <div className="rounded-lg border border-blue-50 bg-white p-5">
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        Recent Activity
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Bookings Awaiting Payment:
                          </span>
                          <span className="font-medium text-gray-900">
                            {providerDashboard.ordersAwaitingPayment?.length ||
                              0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Bookings Pending Validation:
                          </span>
                          <span className="font-medium text-gray-900">
                            {providerDashboard.ordersPendingValidation
                              ?.length || 0}
                          </span>
                        </div>
                        {providerDashboard.nextDeadline && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Next Deadline:
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatDate(
                                new Date(providerDashboard.nextDeadline),
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {analyticsLoading || !providerAnalytics ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      <p className="mt-4 text-sm text-gray-500">
                        Loading provider analytics...
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-blue-50 bg-white p-5">
                        <h4 className="mb-3 text-sm font-semibold text-gray-900">
                          Booking Statistics
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Total Bookings:
                            </span>
                            <span className="font-medium text-gray-900">
                              {providerAnalytics.totalOrders}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Settled Bookings:
                            </span>
                            <span className="font-medium text-gray-900">
                              {providerAnalytics.settledOrders}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Pending Bookings:
                            </span>
                            <span className="font-medium text-gray-900">
                              {providerAnalytics.pendingOrders}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-blue-50 bg-white p-5">
                        <h4 className="mb-3 text-sm font-semibold text-gray-900">
                          Financial Metrics
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Total Commission Paid:
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(
                                providerAnalytics.totalCommissionPaid,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Total Service Amount:
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(
                                providerAnalytics.totalServiceAmount,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Average Booking Value:
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(
                                providerAnalytics.averageOrderValue,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => {
                  setShowProviderDetails(false);
                  setSelectedProvider(null);
                  setProviderDashboard(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
