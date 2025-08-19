import React from "react";

interface AdminDashboardStatsProps {
  stats: {
    totalServiceProviders: number;
    totalPendingValidations: number;
    totalCommissionRules: number;
    totalAdminUsers: number;
    totalPendingCommission: number;
    totalSettledCommission: number;
  };
  loading?: boolean;
  onRefresh: () => void;
}

export const AdminDashboardStats: React.FC<AdminDashboardStatsProps> = ({
  stats,
  loading = false,
  onRefresh,
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
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
      iconColor: "bg-yellow-100",
      isAlert: stats.totalPendingValidations > 0,
    },
    {
      title: "Commission Rules",
      value: formatNumber(stats.totalCommissionRules),
      subtitle: "Active rules",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      iconColor: "bg-purple-100",
    },
    {
      title: "Admin Users",
      value: formatNumber(stats.totalAdminUsers),
      subtitle: "System administrators",
      bgColor: "bg-gray-50",
      textColor: "text-gray-600",
      iconColor: "bg-gray-100",
    },
    {
      title: "Pending Commission",
      value: formatCurrency(stats.totalPendingCommission),
      subtitle: "Awaiting settlement",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      iconColor: "bg-orange-100",
    },
    {
      title: "Settled Commission",
      value: formatCurrency(stats.totalSettledCommission),
      subtitle: "Total processed",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
      iconColor: "bg-green-100",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
        <button
          onClick={onRefresh}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Refresh Stats
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} relative overflow-hidden rounded-lg border border-gray-200 p-6`}
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
                {/* Icon placeholders - you can replace with actual icons */}
                <div className="h-6 w-6 rounded bg-current opacity-20"></div>
              </div>
            </div>

            {card.isAlert && (
              <div className="mt-3 text-xs font-medium text-yellow-700">
                ⚠️ Requires attention
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
