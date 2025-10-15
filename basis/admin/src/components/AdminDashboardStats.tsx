import React from "react";
import { Link } from "react-router-dom";
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  TicketIcon,
  ShieldCheckIcon,
  BanknotesIcon,
} from "@heroicons/react/24/solid";

interface AdminDashboardStatsProps {
  stats: {
    totalServiceProviders: number;
    totalPendingValidations: number;
    totalPendingTickets: number;
    totalAdminUsers: number;
    totalSettledCommission: number;
  };
  loading?: boolean;
  onRefresh: () => void;
  showRefresh?: boolean;
}

export const AdminDashboardStats: React.FC<AdminDashboardStatsProps> = ({
  stats,
  loading = false,
  onRefresh: _onRefresh,
  showRefresh: _showRefresh = false,
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

  const statCards: Array<{
    title: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    isAlert?: boolean;
  }> = [
    {
      title: "Service Providers",
      value: formatNumber(stats.totalServiceProviders),
      subtitle: "Active providers",
      icon: UserGroupIcon,
    },
    {
      title: "Pending Validations",
      value: formatNumber(stats.totalPendingValidations),
      subtitle: "CLICK HERE TO VIEW →",
      icon: ClipboardDocumentListIcon,
      isAlert: stats.totalPendingValidations > 0,
    },
    {
      title: "Pending Tickets",
      value: formatNumber(stats.totalPendingTickets),
      subtitle: "CLICK HERE TO VIEW →",
      icon: TicketIcon,
      isAlert: stats.totalPendingTickets > 0,
    },
    {
      title: "Admin Users",
      value: formatNumber(stats.totalAdminUsers),
      subtitle: "System administrators",
      icon: ShieldCheckIcon,
    },
    {
      title: "Settled Commission",
      value: formatCurrency(stats.totalSettledCommission),
      subtitle: "Total processed",
      icon: BanknotesIcon,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-blue-900">System Overview</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const CardContent = (
            <div
              className={`relative overflow-hidden rounded-xl border border-yellow-100 bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                card.title === "Pending Validations" ||
                card.title === "Pending Tickets"
                  ? "cursor-pointer"
                  : ""
              }`}
            >
              {card.isAlert && (
                <div className="absolute right-2 top-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-yellow-800">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-yellow-700">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{card.subtitle}</p>
                </div>

                <div className="rounded-full bg-yellow-100 p-3 ring-1 ring-yellow-200">
                  <Icon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>

              {card.isAlert && (
                <div className="mt-3 text-xs font-medium text-yellow-800">
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
