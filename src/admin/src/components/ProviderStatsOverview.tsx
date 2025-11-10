import React from "react";
import {
  UserIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface ProviderStatsOverviewProps {
  totalProviders: number;
  totalEarnings: number;
  outstandingBalance: number;
  overdueBookings: number;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

export const ProviderStatsOverview: React.FC<ProviderStatsOverviewProps> = ({
  totalProviders,
  totalEarnings,
  outstandingBalance,
  overdueBookings,
  loading,
  formatCurrency,
}) => {
  return (
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
                  {loading ? "..." : totalProviders}
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
                  {loading ? "..." : formatCurrency(totalEarnings)}
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
                  {loading ? "..." : formatCurrency(outstandingBalance)}
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
                  {loading ? "..." : overdueBookings}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
