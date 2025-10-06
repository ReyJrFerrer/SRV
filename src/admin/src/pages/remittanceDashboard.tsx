import React, { useEffect, useState } from "react";
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
} from "@heroicons/react/24/outline";

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
        return <ExclamationTriangleIcon className="h-4 w-4" />;
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

  const isLoading =
    loading.remittanceOrders ||
    loading.remittanceProviders ||
    loading.remittanceStats;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  to="/dashboard"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to Dashboard
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">
                  Remittance Dashboard
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Overview of commission payments and remittance activity
                </p>
              </div>
              <div className="flex space-x-4">
                <Link
                  to="/remittance/analytics"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                >
                  <ChartBarIcon className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
                <button
                  onClick={() => {
                    refreshRemittanceOrders(true);
                    refreshRemittanceProviders(true);
                    refreshRemittanceStats(true);
                  }}
                  disabled={isLoading}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
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
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Orders */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500">
                    <span className="text-sm font-medium text-white">O</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Total Orders
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
                      Pending Orders
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
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
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
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
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
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-purple-500" />
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
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Recent Orders
                </h2>
                <Link
                  to="/remittance/orders"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
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
                    Loading recent orders...
                  </p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <ClockIcon className="h-12 w-12" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No recent orders
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Remittance orders will appear here once they are created.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {order.id}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                          >
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Provider:{" "}
                          {order.serviceProviderName || order.serviceProviderId}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Amount: {formatCurrency(order.amount)} | Commission:{" "}
                          {formatCurrency(order.commissionAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Providers */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Top Providers
                </h2>
                <Link
                  to="/remittance/providers"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
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
                <div className="space-y-4">
                  {remittanceProviders.slice(0, 5).map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {provider.phone}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Outstanding:{" "}
                          {formatCurrency(provider.outstandingBalance)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(provider.totalEarnings)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Total Earnings
                        </div>
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
