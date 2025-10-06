import React from "react";
import { Link } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

interface AdminDashboardStatsProps {
  stats: {
    totalServiceProviders: number;
    totalPendingValidations: number;
    totalPendingTickets: number;
    totalAdminUsers: number;
    totalPendingCommission: number;
    totalSettledCommission: number;
  };
  loading?: boolean;
  onRefresh: () => void;
  showRefresh?: boolean;
}

export const AdminDashboardStats: React.FC<AdminDashboardStatsProps> = ({
  stats,
  loading = false,
  onRefresh,
  showRefresh = true,
}) => {
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="animate-pulse">
              <div className="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
              <div className="h-6 w-3/4 rounded bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Service Providers",
      value: formatNumber(stats.totalServiceProviders),
      subtitle: "Active providers",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      iconColor: "bg-blue-100",
    },
    {
      title: "Pending Validations",
      value: formatNumber(stats.totalPendingValidations),
      subtitle: "Awaiting review",
      bgColor: "bg-blue-50",
      textColor: "text-yellow-600",
      iconColor: "bg-yellow-100",
      isAlert: stats.totalPendingValidations > 0,
    },
    {
      title: "Pending Tickets",
      value: formatNumber(stats.totalPendingTickets),
      subtitle: "Awaiting resolution",
      bgColor: "bg-blue-50",
      textColor: "text-red-600",
      iconColor: "bg-red-100",
      isAlert: stats.totalPendingTickets > 0,
    },
    {
      title: "Admin Users",
      value: formatNumber(stats.totalAdminUsers),
      subtitle: "System administrators",
      bgColor: "bg-blue-50",
      textColor: "text-gray-600",
      iconColor: "bg-gray-100",
    },
    {
      title: "Pending Commission",
      value: formatCurrency(stats.totalPendingCommission),
      subtitle: "Awaiting settlement",
      bgColor: "bg-blue-50",
      textColor: "text-orange-600",
      iconColor: "bg-orange-100",
    },
    {
      title: "Settled Commission",
      value: formatCurrency(stats.totalSettledCommission),
      subtitle: "Total processed",
      bgColor: "bg-blue-50",
      textColor: "text-green-600",
      iconColor: "bg-green-100",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
        {showRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, index) => {
          const CardContent = (
            <div
              className={`${card.bgColor} relative overflow-hidden rounded-lg border border-gray-200 p-6 transition-all hover:shadow-md ${
                card.title === "Pending Validations" ||
                card.title === "Pending Tickets"
                  ? "cursor-pointer"
                  : ""
              }`}
            >
              {card.isAlert && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-400"></div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <p className={`text-2xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{card.subtitle}</p>
                </div>

                <div className={`${card.iconColor} rounded-full p-3`}>
                  <div className="h-6 w-6 rounded bg-current opacity-20"></div>
                </div>
              </div>

              {card.isAlert && (
                <div className="mt-3 text-xs font-medium text-yellow-700">
                  ⚠️ Requires attention
                </div>
              )}
            </div>
          );

          return card.title === "Pending Validations" ? (
            <Link key={index} to="/validation-inbox">
              {CardContent}
            </Link>
          ) : card.title === "Pending Tickets" ? (
            <Link key={index} to="/ticket-inbox">
              {CardContent}
            </Link>
          ) : (
            <div key={index}>{CardContent}</div>
          );
        })}
      </div>
    </div>
  );
};
