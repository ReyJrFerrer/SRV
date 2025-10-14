import React, { useEffect, useMemo, useState } from "react";
import {
  AdminDashboardStats,
  ServiceProviderCommissionTable,
  PendingValidationCard,
  AdminFeedback,
} from "../components";
import { useAdmin } from "../hooks/useAdmin";
import { XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon, UserIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
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

// Types for media modal
interface MediaViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: {
    id: string;
    url: string;
    fileName: string;
    contentType: string;
  } | null;
  loading?: boolean;
  error?: string | null;
}

// MediaViewModal component for full-screen image display
const MediaViewModal: React.FC<MediaViewModalProps> = ({
  isOpen,
  onClose,
  mediaItem,
  loading = false,
  error = null,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error when modal opens with new media
  useEffect(() => {
    setImageError(false);
  }, [mediaItem?.id]);

  // Handle download
  const handleDownload = () => {
    if (mediaItem?.url && mediaItem?.fileName) {
      const link = document.createElement("a");
      link.href = mediaItem.url;
      link.download = mediaItem.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close and download buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {mediaItem?.fileName || "Media Viewer"}
          </h3>
          <div className="flex items-center space-x-2">
            {mediaItem && !loading && !error && (
              <button
                onClick={handleDownload}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal content */}
        <div className="p-4">
          {loading ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500">Loading media...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-red-500">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-600">
                  Failed to load media
                </p>
                <p className="mt-2 text-xs text-gray-500">{error}</p>
              </div>
            </div>
          ) : mediaItem && imageError ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-gray-400">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">
                  Image failed to load
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  The image may be corrupted or unavailable
                </p>
              </div>
            </div>
          ) : mediaItem ? (
            <img
              src={mediaItem.url}
              alt={mediaItem.fileName}
              className="max-h-[70vh] max-w-full rounded object-contain"
              onError={handleImageError}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const AdminHomePage: React.FC = () => {
  const {
    // Loading states
    loading,

    // Data states
    systemStats,
    serviceProviders,
    pendingValidations,
    remittanceOrders,
    users,

    // Action functions
    refreshSystemStats,
    refreshServiceProviders,
    refreshAll,
    validatePayment,
    viewMediaItems,
  } = useAdmin();

  // Mobile bottom action bar visibility
  const [showMobileBar, setShowMobileBar] = useState(false);

  // State for media modal
  const [mediaModal, setMediaModal] = useState<{
    isOpen: boolean;
    mediaItem: {
      id: string;
      url: string;
      fileName: string;
      contentType: string;
    } | null;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    mediaItem: null,
    loading: false,
    error: null,
  });

  // Calculate dashboard stats from current data
  const dashboardStats = {
    totalServiceProviders: serviceProviders.length,
    totalPendingValidations: pendingValidations.length,
    totalPendingTickets: systemStats?.totalCommissionRules || 0,
    totalAdminUsers: systemStats?.adminUsers || 0,
    totalPendingCommission: serviceProviders.reduce(
      (sum, p) => sum + p.pendingCommission,
      0,
    ),
    totalSettledCommission: serviceProviders.reduce(
      (sum, p) => sum + p.settledCommission,
      0,
    ),
  };

  // Charts: period filter
  type Period = "7d" | "30d" | "90d" | "all";
  const [period, setPeriod] = useState<Period>("30d");
  const periodFromDate = (() => {
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
  })();

  // Charts: dataset builders
  // Donut: Settled vs Pending Commission (current totals)
  const donutData = [
    {
      name: "Settled",
      value: serviceProviders.reduce((sum, p) => sum + p.settledCommission, 0),
      color: "#2563eb", // blue-600
    },
    {
      name: "Pending",
      value: serviceProviders.reduce((sum, p) => sum + p.pendingCommission, 0),
      color: "#f59e0b", // amber-500
    },
  ];

  // Bar: Pending Validations by Payment Method (respects period if possible)
  const pendingValidationsInPeriod = pendingValidations.filter((v) => {
    if (!periodFromDate) return true;
    const at = v.paymentSubmittedAt ?? v.createdAt;
    return at >= periodFromDate;
  });
  const byMethodMap = pendingValidationsInPeriod.reduce<Record<string, number>>(
    (acc, v) => {
      const key = v.paymentMethod ?? "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {},
  );
  const barData = Object.entries(byMethodMap).map(([method, count]) => ({
    method,
    count,
  }));

  // Line: Bookings per Day (from remittanceOrders, respects period)
  const ordersInPeriod = remittanceOrders.filter((o) => {
    if (!periodFromDate) return true;
    return o.createdAt >= periodFromDate;
  });
  // Build day buckets from period start to today
  const buildDateKey = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  const dayCounts = new Map<string, number>();
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
  const lineData = (
    dayCounts.size
      ? Array.from(dayCounts.entries())
      : Array.from(
          new Map<string, number>(
            ordersInPeriod.map((o) => [buildDateKey(o.createdAt), 0]),
          ).entries(),
        )
  )
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  // Money visualizations helpers and datasets
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

  const amountsLineData = useMemo(() => {
    const daySums = new Map<string, { service: number; commission: number }>();
    const buildKey = (d: Date) => d.toISOString().slice(0, 10);
    if (periodFromDate) {
      const cursor = new Date(periodFromDate);
      const end = new Date();
      cursor.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        daySums.set(buildKey(cursor), { service: 0, commission: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    for (const o of ordersInPeriod) {
      const key = buildKey(o.createdAt);
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

  // Pie: Users by type (Providers vs Regular users)
  const providerIds = new Set(serviceProviders.map((p) => p.id));
  const totalUsers = users?.length ?? 0;
  const totalProviders = providerIds.size;
  const totalRegularUsers = Math.max(0, totalUsers - totalProviders);
  const userPieData = [
    { name: "Providers", value: totalProviders, color: "#10b981" }, // emerald-500
    { name: "Regular Users", value: totalRegularUsers, color: "#6366f1" }, // indigo-500
  ];

  // Load initial data on mount - streamlined to single toast notification
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Toggle mobile bottom bar when header scrolls out of view
  useEffect(() => {
    const onScroll = () => {
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Handlers for actions
  const handleApprovePayment = async (orderId: string, reason?: string) => {
    await validatePayment(orderId, true, reason);
  };

  const handleRejectPayment = async (orderId: string, reason: string) => {
    await validatePayment(orderId, false, reason);
  };

  const handleViewMedia = async (mediaIds: string[]) => {
    // Since we only expect one media item, get the first one
    const mediaId = mediaIds[0];
    if (!mediaId) return;

    // Show modal with loading state
    setMediaModal({
      isOpen: true,
      mediaItem: null,
      loading: true,
      error: null,
    });

    try {
      const mediaItems = await viewMediaItems([mediaId]);
      const mediaItem = mediaItems[0];

      if (mediaItem) {
        setMediaModal({
          isOpen: true,
          mediaItem: {
            id: mediaItem.id,
            url: mediaItem.url,
            fileName: mediaItem.fileName,
            contentType: mediaItem.contentType,
          },
          loading: false,
          error: null,
        });
      } else {
        setMediaModal({
          isOpen: true,
          mediaItem: null,
          loading: false,
          error: "Media item not found",
        });
      }
    } catch (error) {
      //console.error("Error viewing media:", error);
      setMediaModal({
        isOpen: true,
        mediaItem: null,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load media",
      });
    }
  };

  // Handle modal close
  const handleCloseMediaModal = () => {
    setMediaModal({
      isOpen: false,
      mediaItem: null,
      loading: false,
      error: null,
    });
  };

  // Simple loading flag for refresh action
  const isRefreshing =
    loading.systemStats ||
    loading.serviceProviders ||
    loading.pendingValidations;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      {/* Media View Modal */}
      <MediaViewModal
        isOpen={mediaModal.isOpen}
        onClose={handleCloseMediaModal}
        mediaItem={mediaModal.mediaItem}
        loading={mediaModal.loading}
        error={mediaModal.error}
      />

      {/* Header */}
      <header className="z-50 overflow-x-hidden border-b border-blue-100 bg-gradient-to-r from-yellow-50 via-white to-blue-50 shadow sm:sticky sm:top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/srv%20characters%20(SVG)/tech guy.svg"
                    alt="Tech Guy illustration"
                    className="h-12 w-12 sm:h-16 sm:w-16"
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Admin Dashboard
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      Monitor service providers, validate payments, and manage
                      system settings
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-0 flex w-full min-w-0 flex-row flex-wrap gap-2 sm:ml-4 sm:w-auto sm:min-w-[unset] sm:flex-nowrap sm:space-x-4">
                {/* Refresh button (header) */}
                <button
                  onClick={refreshAll}
                  disabled={isRefreshing}
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0 disabled:opacity-50"
                >
                  <ArrowPathIcon
                    className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
                <Link
                  to="/remittance"
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0"
                >
                  <svg
                    className="mr-2 h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Remittance
                </Link>
                <Link
                  to="/users"
                  className="inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:flex-none"
                >
                  <UserIcon className="mr-2 h-4 w-4 shrink-0 text-blue-700" />
                  View Users
                </Link>
                {/* Note: Header refresh added per request */}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl overflow-x-hidden px-4 py-6 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        <div className="space-y-6">
          {/* Charts Section (moved to top) */}
          <section className="rounded-lg border border-blue-100 bg-white shadow-sm">
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
                {/* Period filter */}
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
                        "px-3 py-1.5 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 " +
                        (period === opt.key
                          ? "bg-blue-600 text-white hover:bg-blue-600"
                          : "text-gray-700") +
                        (idx !== arr.length - 1
                          ? " border-r border-blue-200"
                          : "")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              {/* Donut: Settled vs Pending Commission */}
              <div className="rounded-lg border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-800">
                    Commission: Settled vs Pending
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-yellow-200">
                    Providers: {serviceProviders.length}
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={2}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar: Pending Validations by Payment Method */}
              <div className="rounded-lg border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-800">
                    Pending Validations by Method
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
                    Pending: {pendingValidationsInPeriod.length}
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="method" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
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
                      <Tooltip
                        labelFormatter={(d: string) => formatAxisDate(d)}
                      />
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

              {/* Money: Amounts per Day (PHP) */}
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
                      <YAxis
                        tickFormatter={(v: number) => formatShortNumber(v)}
                      />
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

              {/* Pie: Users by type */}
              <div className="rounded-lg border border-gray-100 p-4 md:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-800">
                    Users by Type
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                    Users: {totalUsers}
                  </span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={2}
                      >
                        {userPieData.map((entry, index) => (
                          <Cell key={`upie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
          {/* Dashboard Stats */}
          <AdminDashboardStats
            stats={dashboardStats}
            loading={loading.systemStats}
            onRefresh={() => refreshSystemStats(true)}
            showRefresh={false}
          />

          {/* Service Provider Commission Table */}
          <ServiceProviderCommissionTable
            providers={serviceProviders}
            loading={loading.serviceProviders}
            onRefresh={() => refreshServiceProviders(true)}
            showRefresh={false}
          />

          {/* User Feedback Section */}
          <AdminFeedback
            loading={loading.systemStats}
            onRefresh={() => refreshSystemStats(true)}
            showRefresh={false}
          />

          {/* Pending Validations Section */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-white px-6 py-4">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="w-full sm:w-auto">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Payment Validations
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review and approve payment submissions from service
                    providers
                  </p>
                </div>
                {pendingValidations.length > 0 && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-yellow-200 sm:mt-0">
                    {pendingValidations.length} pending
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              {loading.pendingValidations ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading pending validations...
                  </p>
                </div>
              ) : pendingValidations.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-blue-300">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      className="h-12 w-12"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    All caught up!
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    No pending payment validations at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingValidations.map((validation) => {
                    // Convert FrontendRemittanceOrder to the format expected by PendingValidationCard
                    const validationForCard = {
                      id: validation.id,
                      orderId: validation.id,
                      serviceProviderName: `Provider ${validation.serviceProviderId}`, // TODO: Get actual name
                      serviceType: validation.serviceType,
                      amount: validation.amount,
                      commissionAmount: validation.commissionAmount,
                      paymentMethod: validation.paymentMethod,
                      paymentProofMediaIds: validation.paymentProofMediaIds,
                      submittedAt:
                        validation.paymentSubmittedAt || validation.createdAt,
                    };

                    return (
                      <PendingValidationCard
                        key={validation.id}
                        validation={validationForCard}
                        onApprove={handleApprovePayment}
                        onReject={handleRejectPayment}
                        onViewMedia={handleViewMedia}
                        loading={loading.paymentValidation}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
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
              onClick={refreshAll}
              disabled={isRefreshing}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0 disabled:opacity-50"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/remittance"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0"
            >
              <svg
                className="mr-2 h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Remittance
            </Link>
            <Link
              to="/users"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <svg
                className="mr-2 h-4 w-4 text-blue-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              View Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
