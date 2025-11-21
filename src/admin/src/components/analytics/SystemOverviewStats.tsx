import React from "react";
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface SystemOverviewStatsProps {
  totalRevenue: number;
  totalCommission: number;
  totalTopups: number;
  onlineUsers: number;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

export const SystemOverviewStats: React.FC<SystemOverviewStatsProps> = ({
  totalRevenue,
  totalCommission,
  totalTopups,
  onlineUsers,
  loading,
  formatCurrency,
}) => {
  return (
    <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Total Revenue
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : formatCurrency(totalRevenue)}
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
              <BanknotesIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Total Commission
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : formatCurrency(totalCommission)}
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
              <BanknotesIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Total Topups
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : formatCurrency(totalTopups)}
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
              <UserIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Online Users
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : onlineUsers}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
