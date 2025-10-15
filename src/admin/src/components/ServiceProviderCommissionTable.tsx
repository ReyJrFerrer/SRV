import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

interface ServiceProviderData {
  id: string;
  name: string;
  phone: string;
  totalEarnings: number;
  pendingCommission: number;
  settledCommission: number;
  lastActivity: Date;
}

interface ServiceProviderCommissionTableProps {
  providers: ServiceProviderData[];
  loading?: boolean;
  onRefresh: () => void;
  showRefresh?: boolean;
}

export const ServiceProviderCommissionTable: React.FC<
  ServiceProviderCommissionTableProps
> = ({
  providers,
  loading = false,
  onRefresh: _onRefresh,
  showRefresh: _showRefresh = false,
}) => {
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
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
      <div className="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
        <h2 className="text-lg font-semibold text-blue-900">
          Service Provider Commission Overview
        </h2>
        {_showRefresh && (
          <button
            onClick={_onRefresh}
            className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
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
                Total Earnings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Settled Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Last Activity
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
                <tr key={provider.id} className="hover:bg-blue-50/40">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <span className="text-sm font-medium text-blue-800">
                            {provider.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {provider.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {provider.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-green-600">
                    {formatCurrency(provider.totalEarnings)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(provider.settledCommission)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(provider.lastActivity)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 ring-1 ring-green-200">
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {providers.length > 0 && (
        <div className="border-t border-blue-100 bg-blue-50/60 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {providers.length} service providers</span>
            <div className="flex space-x-6">
              <span>
                Total Settled:{" "}
                <span className="font-semibold text-green-600">
                  {formatCurrency(
                    providers.reduce((sum, p) => sum + p.settledCommission, 0),
                  )}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
