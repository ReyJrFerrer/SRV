import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

interface ServiceProviderPerformanceData {
  id: string;
  name: string;
  phone: string;
  totalRevenue: number;
  totalCommission: number;
  completedBookings: number;
  totalBookings: number;
  status: string;
}

interface ServiceProviderPerformanceTableProps {
  providers: ServiceProviderPerformanceData[];
  loading?: boolean;
  onRefresh: () => void;
  showRefresh?: boolean;
}

const ServiceProviderPerformanceTable: React.FC<
  ServiceProviderPerformanceTableProps
> = ({
  providers,
  loading = false,
  onRefresh: _onRefresh,
  showRefresh: _showRefresh = false,
}) => {
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-200"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-blue-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Service Provider Performance
        </h3>
        {_showRefresh && (
          <button
            onClick={_onRefresh}
            className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-blue-100">
          <thead className="bg-blue-50/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Service Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Total Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Total Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Completed Bookings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50 bg-white">
            {providers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No service providers found
                </td>
              </tr>
            ) : (
              providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-blue-50/30">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <span className="text-sm font-medium text-blue-600">
                            {provider.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {provider.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(provider.totalRevenue)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(provider.totalCommission)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {provider.completedBookings}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        provider.status === "active"
                          ? "bg-green-100 text-green-800"
                          : provider.status === "inactive"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {provider.status.charAt(0).toUpperCase() +
                        provider.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export { ServiceProviderPerformanceTable };
