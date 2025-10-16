import React, { useEffect, useMemo, useState } from "react";
import { AdminDashboardStats } from "../components";
import { useAdmin } from "../hooks/useAdmin";
import { ArrowPathIcon, UserIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export const AdminHomePage: React.FC = () => {
  const {
    // Loading states
    loading,

    // Data states
    systemStats,
    users,
    bookings,
    commissionTransactions,

    // Action functions
    getServicesWithCertificates,
    getReportsFromFeedbackCanister,
    refreshAll,
  } = useAdmin();

  // Mobile bottom action bar visibility
  const [showMobileBar, setShowMobileBar] = useState(false);

  // Services with certificates for pending validations
  const [servicesWithCertificates, setServicesWithCertificates] = useState<
    any[]
  >([]);

  // Reports for pending tickets
  const [reports, setReports] = useState<any[]>([]);

  // Calculate active service providers count from users with ServiceProvider role
  const activeServiceProvidersCount = users?.filter((user: any) => {
    if (typeof user.activeRole === "string") {
      return user.activeRole === "ServiceProvider";
    } else if (user.activeRole && typeof user.activeRole === "object") {
      return "ServiceProvider" in user.activeRole;
    }
    return false;
  }).length || 0;

  // Calculate booking counts from system stats
  const totalBookings = systemStats?.totalBookings || 0;

  // Calculate settled bookings with fallback to systemStats when bookings array is empty
  const settledBookings =
    bookings && bookings.length > 0
      ? bookings.filter(
          (booking) =>
            booking.status?.toLowerCase() === "completed" ||
            booking.status?.toLowerCase() === "settled",
        ).length
      : systemStats?.settledBookings || 0;

  // Calculate dashboard stats from current data
  const dashboardStats = {
    totalServiceProviders: activeServiceProvidersCount,
    totalPendingValidations: servicesWithCertificates.reduce(
      (total, service) => total + (service.certificateUrls?.length || 0),
      0,
    ),
    totalPendingTickets: reports.filter(
      (report) => !report.status || report.status === "open",
    ).length,
    totalAdminUsers: systemStats?.adminUsers || 0,
    totalBookings: totalBookings,
    settledBookings: settledBookings,
  };

  // Charts: period filter
  type Period = "7d" | "30d" | "90d";
  const [period, setPeriod] = useState<Period>("7d");
  const lineData = useMemo(() => {
    const today = new Date();
    const daysToShow = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const chartData = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const formattedDate = date
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        .toUpperCase()
        .replace(" ", ". ");

      let count = 0;

      // Count bookings for this specific date
      if (bookings && bookings.length > 0) {
        const dateStr = date.toISOString().slice(0, 10);
        count = bookings.filter((booking) => {
          let bookingDateStr;
          if (booking.createdAt instanceof Date) {
            bookingDateStr = booking.createdAt.toISOString().slice(0, 10);
          } else if (typeof booking.createdAt === "string") {
            bookingDateStr = booking.createdAt.slice(0, 10);
          } else {
            return false;
          }
          return bookingDateStr === dateStr;
        }).length;
      } else if (i === 0) {
        count = totalBookings;
      }

      chartData.push({
        date: formattedDate,
        count,
        fullDate: date.toISOString().slice(0, 10),
      });
    }

    return chartData;
  }, [bookings, totalBookings, period]);

  // Revenue per Day chart data with vertical grids
  const revenueLineData = useMemo(() => {
    // Generate dynamic date range based on selected period
    const today = new Date();
    const daysToShow = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const chartData = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const formattedDate = date
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        .toUpperCase()
        .replace(" ", ". ");

      let revenue = 0;
      let commission = 0;

      // Calculate revenue for this specific date
      if (bookings && bookings.length > 0) {
        const dateStr = date.toISOString().slice(0, 10);

        // Calculate revenue from completed bookings
        revenue = bookings
          .filter((booking) => {
            let bookingDateStr;
            if (booking.createdAt instanceof Date) {
              bookingDateStr = booking.createdAt.toISOString().slice(0, 10);
            } else if (typeof booking.createdAt === "string") {
              bookingDateStr = booking.createdAt.slice(0, 10);
            } else {
              return false;
            }
            return (
              bookingDateStr === dateStr &&
              (booking.status === "Completed" || booking.status === "Settled")
            );
          })
          .reduce((sum, booking) => sum + (booking.price || 0), 0);

        // Calculate commission from commission transactions
        if (commissionTransactions && commissionTransactions.length > 0) {
          commission = commissionTransactions
            .filter((transaction) => {
              const transactionDateStr = transaction.timestamp
                .toISOString()
                .slice(0, 10);
              return transactionDateStr === dateStr;
            })
            .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
        }
      } else if (i === 0) {
        // If no bookings data, show totals on today
        revenue = systemStats?.totalRevenue || 0;
        commission = systemStats?.totalCommission || 0;
      }

      chartData.push({
        date: formattedDate,
        revenue,
        commission,
        fullDate: date.toISOString().slice(0, 10),
      });
    }

    return chartData;
  }, [
    bookings,
    commissionTransactions,
    systemStats?.totalRevenue,
    systemStats?.totalCommission,
    period,
  ]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Load services with certificates for pending validations count
  useEffect(() => {
    const loadServicesWithCertificates = async () => {
      try {
        const services = await getServicesWithCertificates();
        setServicesWithCertificates(services);
      } catch (error) {
        console.error("Error loading services with certificates:", error);
      }
    };
    loadServicesWithCertificates();
  }, [getServicesWithCertificates]);

  // Load reports for pending tickets count
  useEffect(() => {
    const loadReports = async () => {
      try {
        const reportsData = await getReportsFromFeedbackCanister();
        setReports(reportsData);
      } catch (error) {
        console.error("Error loading reports:", error);
      }
    };
    loadReports();
  }, [getReportsFromFeedbackCanister]);

  // Toggle mobile bottom bar when header scrolls out of view
  useEffect(() => {
    const onScroll = () => {
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isRefreshing =
    loading.systemStats ||
    loading.serviceProviders ||
    loading.services ||
    loading.bookings;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
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
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-0 focus:outline-none disabled:opacity-50"
                >
                  <ArrowPathIcon
                    className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
                <Link
                  to="/analytics"
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-0 focus:outline-none"
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Analytics
                </Link>
                <Link
                  to="/users"
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap text-blue-700 shadow hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:outline-none sm:flex-none"
                >
                  <UserIcon className="mr-2 h-4 w-4 shrink-0 text-blue-700" />
                  View Users
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl overflow-x-hidden px-4 py-6 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        <div className="space-y-6">
          {/* System Overview - moved to top */}
          <AdminDashboardStats
            stats={dashboardStats}
            loading={loading.systemStats}
          />

          {/* Charts Section */}
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

            <div className="grid grid-cols-1 gap-6 p-6">
              {/* Line: Bookings per Day */}
              <div className="rounded-lg border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-800">
                    Bookings per Day
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                    Total: {totalBookings}
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
                        tickFormatter={(dateStr) => dateStr}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(dateStr) => `Bookings on ${dateStr}`}
                        formatter={(value: number) => [`${value}`, "Bookings"]}
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

              {/* Revenue per Day */}
              <div className="rounded-lg border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-800">
                    Revenue & Commission per Day
                  </h3>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-green-200">
                      Revenue: ₱
                      {systemStats?.totalRevenue?.toFixed(2) || "0.00"}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
                      Commission: ₱
                      {systemStats?.totalCommission?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={revenueLineData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(dateStr) => {
                          if (dateStr === "Total") return dateStr;
                          const date = new Date(dateStr);
                          return date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickFormatter={(value) => `₱${value.toLocaleString()}`}
                      />
                      <Tooltip
                        labelFormatter={(dateStr) => {
                          if (dateStr === "Total") return dateStr;
                          const date = new Date(dateStr);
                          return date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        }}
                        formatter={(value: number, name: string) => [
                          `₱${value.toFixed(2)}`,
                          name === "revenue" ? "Revenue" : name === "commission" ? "Commission" : name,
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="commission"
                        name="Commission"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
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
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-0 focus:outline-none disabled:opacity-50"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/analytics"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-0 focus:outline-none"
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Analytics
            </Link>
            <Link
              to="/users"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:outline-none"
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
