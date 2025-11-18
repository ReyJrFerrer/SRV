import React, { useEffect, useMemo, useState } from "react";
import { AdminDashboardStats } from "../components";
import { useAdmin } from "../hooks/useAdmin";
import { PresentationChartLineIcon, UserIcon } from "@heroicons/react/24/outline";
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
import {
  countActiveServiceProviders,
  calculateDashboardStats,
  generateBookingsChartData,
  generateRevenueChartData,
  type Period,
} from "../utils/homeUtils";
import { getFeedbackStats } from "../services/adminServiceCanister";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../services/firebaseApp";
import { FrontendSystemSettings } from "../services/serviceTypes";

export const AdminHomePage: React.FC = () => {
  const {
    loading,
    systemStats,
    users,
    bookings,
    commissionTransactions,

    // Action functions
    getServicesWithCertificates,
    getReportsFromFeedbackCanister,
  } = useAdmin();

  // Mobile bottom action bar visibility
  const [showMobileBar, setShowMobileBar] = useState(false);

  // Services with certificates for pending validations
  const [servicesWithCertificates, setServicesWithCertificates] = useState<
    any[]
  >([]);

  // Reports for pending tickets
  const [reports, setReports] = useState<any[]>([]);

  // Feedback stats
  const [feedbackStats, setFeedbackStats] = useState<{
    averageRating: number;
    totalFeedback: number;
  } | null>(null);

  const [settings, setSettings] = useState<FrontendSystemSettings | null>(null);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Calculate active service providers count from users with ServiceProvider role
  const activeServiceProvidersCount = useMemo(() => {
    return countActiveServiceProviders(users || []);
  }, [users]);

  // Calculate booking counts from system stats
  const totalBookings = systemStats?.totalBookings || 0;

  // Calculate dashboard stats from current data
  const dashboardStats = useMemo(() => {
    return calculateDashboardStats(
      activeServiceProvidersCount,
      servicesWithCertificates,
      reports,
      systemStats,
      totalBookings,
      feedbackStats,
    );
  }, [
    activeServiceProvidersCount,
    servicesWithCertificates,
    reports,
    systemStats,
    totalBookings,
    feedbackStats,
  ]);

  // Charts: period filter
  const [period, setPeriod] = useState<Period>("7d");
  const lineData = useMemo(() => {
    return generateBookingsChartData(bookings || [], totalBookings, period);
  }, [bookings, totalBookings, period]);

  // Revenue per Day chart data with vertical grids
  const revenueLineData = useMemo(() => {
    return generateRevenueChartData(
      bookings || [],
      commissionTransactions || [],
      systemStats,
      period,
    );
  }, [bookings, commissionTransactions, systemStats, period]);

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

  // Load feedback stats
  useEffect(() => {
    const loadFeedbackStats = async () => {
      try {
        const stats = await getFeedbackStats();
        setFeedbackStats({
          averageRating: stats.averageRating || 0,
          totalFeedback: stats.totalFeedback || 0,
        });
      } catch (error) {
        console.error("Error loading feedback stats:", error);
      }
    };
    loadFeedbackStats();
  }, []);

  const loadSettings = async () => {
    try {
      const functions = getFirebaseFunctions();
      const getSettingsFn = httpsCallable(functions, "getSettings");
      const result = await getSettingsFn();
      const data = result.data as { success: boolean; data: FrontendSystemSettings };
      if (data.success) {
        const settingsData = data.data;
        if (settingsData.updatedAt) {
          settingsData.updatedAt = new Date(settingsData.updatedAt as any);
        }
        setSettings(settingsData);
      }
    } catch (error) {
    }
  };

  const toggleRestrictNewLogins = async (enabled: boolean) => {
    if (!settings) return;
    
    setUpdatingSettings(true);
    try {
      const functions = getFirebaseFunctions();
      const updateSettingsFn = httpsCallable(functions, "setSettings");
      await updateSettingsFn({
        ...settings,
        restrictNewAdminLogins: enabled,
      });
      setSettings({ ...settings, restrictNewAdminLogins: enabled });
    } catch (error) {
    } finally {
      setUpdatingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
                <Link
                  to="/analytics"
                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0"
                >
                  <PresentationChartLineIcon className="mr-2 h-4 w-4 text-white" />
                  Analytics
                </Link>
                <Link
                  to="/users"
                  className="inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:flex-none"
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
          {/* System Overview */}
          <AdminDashboardStats
            stats={dashboardStats}
            loading={loading.systemStats}
          />

          {/* Security Settings Section */}
          <section className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-yellow-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              <p className="mt-1 text-sm text-gray-500">
                Control admin access and security policies
              </p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    Restrict New Admin Logins
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    When enabled, only existing users in Firestore can access the admin panel. 
                    New Internet Identity accounts will be blocked.
                  </p>
                </div>
                <button
                  onClick={() => toggleRestrictNewLogins(!settings?.restrictNewAdminLogins)}
                  disabled={updatingSettings || !settings}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings?.restrictNewAdminLogins ? "bg-blue-600" : "bg-gray-200"
                  } ${updatingSettings ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings?.restrictNewAdminLogins ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {settings?.restrictNewAdminLogins && (
                <div className="mt-3 rounded-md bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-800">
                    New Internet Identity accounts will be blocked from admin access.
                  </p>
                </div>
              )}
            </div>
          </section>

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
                          name === "revenue"
                            ? "Revenue"
                            : name === "commission"
                              ? "Commission"
                              : name,
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
      {/* Mobile bottom actions bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-yellow-100 px-4 py-3 backdrop-blur transition-all duration-300 ease-out supports-[backdrop-filter]:bg-white/80 sm:hidden ${
          showMobileBar
            ? "translate-y-0 bg-white/95 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-row items-stretch gap-2">
            <Link
              to="/analytics"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0"
            >
              <PresentationChartLineIcon className="mr-2 h-4 w-4 text-white" />
              Analytics
            </Link>
            <Link
              to="/users"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <UserIcon className="mr-2 h-4 w-4 text-blue-700" />
              View Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
