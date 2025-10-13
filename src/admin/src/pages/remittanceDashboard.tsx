import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export const RemittanceDashboardPage: React.FC = () => {
  const {
    remittanceOrders,
    remittanceProviders,
    remittanceStats,
    loading,
    refreshRemittanceOrders,
    refreshRemittanceProviders,
    refreshRemittanceStats,
  } = useAdmin();

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [showMobileBar, setShowMobileBar] = useState(false);

  useEffect(() => {
    refreshRemittanceOrders();
    refreshRemittanceProviders();
    refreshRemittanceStats();
  }, [
    refreshRemittanceOrders,
    refreshRemittanceProviders,
    refreshRemittanceStats,
  ]);

  useEffect(() => {
    const onScroll = () => {
      // Show the mobile actions bar when the header is scrolled out of view
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Get recent orders (last 10)
    if (remittanceOrders.length > 0) {
      setRecentOrders(remittanceOrders.slice(0, 10));
    }
  }, [remittanceOrders]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AwaitingPayment":
        return "bg-yellow-100 text-yellow-800";
      case "PaymentSubmitted":
        return "bg-blue-100 text-blue-800";
      case "PaymentValidated":
        return "bg-green-100 text-green-800";
      case "Settled":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "AwaitingPayment":
        return <ClockIcon className="h-4 w-4" />;
      case "PaymentSubmitted":
        return <ArrowUpTrayIcon className="h-4 w-4" />;
      case "PaymentValidated":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Settled":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Cancelled":
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AwaitingPayment":
        return "Awaiting Payment";
      case "PaymentSubmitted":
        return "Payment Submitted";
      case "PaymentValidated":
        return "Payment Validated";
      case "Settled":
        return "Settled";
      case "Cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const isLoading =
    loading.remittanceOrders ||
    loading.remittanceProviders ||
    loading.remittanceStats;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      {/* Header */}
      <header className="z-50 overflow-x-hidden border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow sm:sticky sm:top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Remittance Dashboard
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Overview of commission payments and remittance activity
                  </p>
                </div>
              </div>
              <div className="ml-0 flex w-full min-w-0 flex-row flex-wrap gap-2 sm:ml-4 sm:w-auto sm:min-w-[unset] sm:flex-nowrap sm:space-x-4">
                <button
                  onClick={() => {
                    refreshRemittanceOrders(true);
                    refreshRemittanceProviders(true);
                    refreshRemittanceStats(true);
                  }}
                  disabled={isLoading}
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                >
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Refresh
                </button>
                <Link
                  to="/remittance/analytics"
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
                >
                  <ChartBarIcon className="mr-2 h-4 w-4 shrink-0 text-blue-600" />
                  Analytics
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:outline-none"
                >
                  <ArrowLeftIcon className="mr-2 h-4 w-4 shrink-0 text-black" />
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
              onClick={() => {
                refreshRemittanceOrders(true);
                refreshRemittanceProviders(true);
                refreshRemittanceStats(true);
              }}
              disabled={isLoading}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/remittance/analytics"
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
      <main className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        {/* Quick Analytics */}
        <RemittanceQuickAnalytics
          remittanceOrders={remittanceOrders}
          remittanceProviders={remittanceProviders}
        />
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Orders */}
          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Bookings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {isLoading ? "..." : remittanceStats?.totalOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Settled Orders */}
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
                      {isLoading
                        ? "..."
                        : remittanceStats?.totalSettledOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Pending Bookings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {isLoading
                        ? "..."
                        : remittanceStats?.totalPendingOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Orders */}
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
                      {isLoading
                        ? "..."
                        : remittanceStats?.totalOverdueOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Commission Paid */}
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
                      {isLoading
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

          {/* Total Service Amount */}
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
                      {isLoading
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

          {/* Average Commission Rate */}
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
                      {isLoading
                        ? "..."
                        : `${(remittanceStats?.averageCommissionRate || 0).toFixed(2)}%`}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders and Top Providers */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Orders */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Recent Bookings
                </h2>
                <Link
                  to="/remittance/orders"
                  className="text-sm font-medium text-blue-700 hover:text-blue-600"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading recent bookings...
                  </p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <ClockIcon className="h-12 w-12" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No recent bookings
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Remittance bookings will appear here once they are created.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-blue-100 p-4 hover:bg-blue-50/40"
                    >
                      {/* Two-column layout: left (ID, status, provider, amount) | right (date/time, commission) */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {/* Left column */}
                        <div>
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="truncate text-sm font-semibold text-gray-900"
                              title={order.id}
                            >
                              {order.id}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                            >
                              {getStatusIcon(order.status)}
                              <span className="ml-1">
                                {getStatusLabel(order.status)}
                              </span>
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                            {formatDate(order.createdAt)}
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="text-gray-500">Provider: </span>
                            <span className="font-medium text-gray-800">
                              {order.serviceProviderName ||
                                order.serviceProviderId}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            <span className="text-gray-500">Amount: </span>
                            <span className="font-medium text-gray-800">
                              {formatCurrency(order.amount)}
                            </span>
                          </div>
                        </div>
                        {/* Right column */}
                        <div className="sm:text-right">
                          <div className="mt-1 text-sm text-gray-600">
                            <span className="text-gray-500">Commission: </span>
                            <span className="font-medium text-gray-800">
                              {formatCurrency(order.commissionAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Providers */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Top Providers
                </h2>
                <Link
                  to="/remittance/providers"
                  className="text-sm font-medium text-blue-700 hover:text-blue-600"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading providers...
                  </p>
                </div>
              ) : remittanceProviders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <CurrencyDollarIcon className="h-12 w-12" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No providers found
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Service providers will appear here once they have remittance
                    activity.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {remittanceProviders.slice(0, 5).map((provider) => (
                    <div
                      key={provider.id}
                      className="rounded-lg border border-blue-100 p-4 hover:bg-blue-50/40"
                    >
                      {/* Top row: Name left, earnings right */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="truncate text-sm font-semibold text-gray-900"
                            title={provider.name}
                          >
                            {provider.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                            {provider.phone}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(provider.totalEarnings)}
                          </div>
                          <div className="text-xs text-gray-500 sm:text-sm">
                            Total Earnings
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Outstanding */}
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="text-gray-500">Outstanding: </span>
                        <span className="font-medium text-gray-800">
                          {formatCurrency(provider.outstandingBalance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Quick Analytics component for Remittance Dashboard
const RemittanceQuickAnalytics: React.FC<{
  remittanceOrders: Array<{
    id: string;
    createdAt: Date;
    paymentMethod?: string;
    amount: number;
    commissionAmount: number;
    status:
      | "AwaitingPayment"
      | "PaymentSubmitted"
      | "PaymentValidated"
      | "Cancelled"
      | "Settled";
  }>;
  remittanceProviders: Array<{
    pendingCommission: number;
    settledCommission: number;
  }>;
}> = ({ remittanceOrders }) => {
  type Period = "7d" | "30d" | "90d" | "all";
  const [period, setPeriod] = useState<Period>("30d");

  // Helpers for labels and colors
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AwaitingPayment":
        return "Awaiting Payment";
      case "PaymentSubmitted":
        return "Payment Submitted";
      case "PaymentValidated":
        return "Payment Validated";
      case "Settled":
        return "Settled";
      case "Cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const statusPalette: Record<string, string> = {
    AwaitingPayment: "#f59e0b", // amber
    PaymentSubmitted: "#3b82f6", // blue
    PaymentValidated: "#10b981", // emerald
    Settled: "#22c55e", // green
    Cancelled: "#ef4444", // red
  };

  const formatAxisDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatCurrencyLocal = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);

  const formatShortNumber = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  };

  const periodFromDate = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case "all":
      default:
        return undefined;
    }
  }, [period]);

  // Removed commission donut per request

  // Filter orders by period
  const ordersInPeriod = useMemo(
    () =>
      remittanceOrders.filter((o) =>
        periodFromDate ? o.createdAt >= periodFromDate : true,
      ),
    [remittanceOrders, periodFromDate],
  );

  // Bar: Bookings by Status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of ordersInPeriod) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    const order = [
      "AwaitingPayment",
      "PaymentSubmitted",
      "PaymentValidated",
      "Settled",
      "Cancelled",
    ];
    const entries = Object.entries(counts).map(([status, count]) => ({
      status,
      label: getStatusLabel(status),
      count,
      color: statusPalette[status] || "#64748b", // slate fallback
    }));
    entries.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    return entries;
  }, [ordersInPeriod]);

  // Line: Bookings per Day
  const lineData = useMemo(() => {
    const dayCounts = new Map<string, number>();
    const buildDateKey = (d: Date) => d.toISOString().slice(0, 10);
    if (periodFromDate) {
      const cursor = new Date(periodFromDate);
      const end = new Date();
      cursor.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        dayCounts.set(buildDateKey(cursor), 0);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    for (const o of ordersInPeriod) {
      const key = buildDateKey(o.createdAt);
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }
    return (
      dayCounts.size
        ? Array.from(dayCounts.entries())
        : Array.from(
            new Map<string, number>(
              ordersInPeriod.map((o) => [
                o.createdAt.toISOString().slice(0, 10),
                0,
              ]),
            ).entries(),
          )
    )
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, count]) => ({ date, count }));
  }, [ordersInPeriod, periodFromDate]);

  // Money Line: Service Amount vs Commission Paid per Day
  const amountsLineData = useMemo(() => {
    const daySums = new Map<string, { service: number; commission: number }>();
    const buildDateKey = (d: Date) => d.toISOString().slice(0, 10);
    if (periodFromDate) {
      const cursor = new Date(periodFromDate);
      const end = new Date();
      cursor.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        daySums.set(buildDateKey(cursor), { service: 0, commission: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    for (const o of ordersInPeriod) {
      const key = buildDateKey(o.createdAt);
      const prev = daySums.get(key) || { service: 0, commission: 0 };
      daySums.set(key, {
        service: prev.service + (o.amount || 0),
        commission: prev.commission + (o.commissionAmount || 0),
      });
    }
    return (
      daySums.size
        ? Array.from(daySums.entries())
        : Array.from(
            new Map<string, { service: number; commission: number }>(
              ordersInPeriod.map((o) => [
                o.createdAt.toISOString().slice(0, 10),
                { service: 0, commission: 0 },
              ]),
            ).entries(),
          )
    )
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [ordersInPeriod, periodFromDate]);

  // Pie: Payment Method distribution
  const methodData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of ordersInPeriod) {
      const method = o.paymentMethod || "Unknown";
      counts[method] = (counts[method] || 0) + 1;
    }
    // Assign some colors
    const palette = ["#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#64748b"]; // sky, green, orange, purple, slate
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length],
    }));
  }, [ordersInPeriod]);

  // Removed Top Providers grouped bar per request

  return (
    <section className="mb-6 rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-yellow-50 px-6 py-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Analytics
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              High-level insights for the selected period
            </p>
          </div>
          <div className="mt-2 inline-flex overflow-hidden rounded-md border border-blue-200 bg-white text-sm shadow-sm sm:mt-0">
            {(
              [
                { key: "7d", label: "7d" },
                { key: "30d", label: "30d" },
                { key: "90d", label: "90d" },
                { key: "all", label: "All" },
              ] as { key: Period; label: string }[]
            ).map((opt, idx, arr) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={
                  "px-3 py-1.5 hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:outline-none " +
                  (period === opt.key
                    ? "bg-blue-600 text-white hover:bg-blue-600"
                    : "text-gray-700") +
                  (idx !== arr.length - 1 ? " border-r border-blue-200" : "")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
        {/* Bar: Bookings by Status (moved up to replace donut) */}
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-800">
              Bookings by Status
            </h3>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
              In period: {ordersInPeriod.length}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusCounts}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [value, "Bookings"]}
                  labelFormatter={(label: string) => label}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusCounts.map((entry, index) => (
                    <Cell key={`status-top-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods (moved up) */}
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-800">
              Payment Methods
            </h3>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              Methods: {methodData.length}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`rpie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line: Bookings per Day */}
        <div className="rounded-lg border border-gray-100 p-4 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-800">
              Bookings per Day
            </h3>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              Total: {ordersInPeriod.length}
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(d: string) => formatAxisDate(d)}
                />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(d: string) => formatAxisDate(d)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Bookings"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Money: Service Amount vs Commission Paid per Day */}
        <div className="rounded-lg border border-gray-100 p-4 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-800">
              Amounts per Day (PHP)
            </h3>
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-yellow-200">
              Days: {amountsLineData.length}
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={amountsLineData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(d: string) => formatAxisDate(d)}
                />
                <YAxis tickFormatter={(v: number) => formatShortNumber(v)} />
                <Tooltip
                  labelFormatter={(d: string) => formatAxisDate(d)}
                  formatter={(v: number, name: string) => [
                    formatCurrencyLocal(v),
                    name,
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="service"
                  name="Service Amount"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="commission"
                  name="Commission Paid"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Removed Top Providers grouped bar per request */}
      </div>
    </section>
  );
};
