import React from "react";

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
}

export const ServiceProviderCommissionTable: React.FC<
  ServiceProviderCommissionTableProps
> = ({ providers, loading = false, onRefresh }) => {
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
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Service Provider Commission Overview
        </h2>
        <button
          onClick={onRefresh}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Service Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Total Earnings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Pending Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Settled Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {providers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No service providers found
                </td>
              </tr>
            ) : (
              providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                          <span className="text-sm font-medium text-gray-700">
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
                  <td className="px-6 py-4 text-sm font-semibold whitespace-nowrap text-green-600">
                    {formatCurrency(provider.totalEarnings)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-orange-600">
                    {formatCurrency(provider.pendingCommission)}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                    {formatCurrency(provider.settledCommission)}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {formatDate(provider.lastActivity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        provider.pendingCommission > 0
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {provider.pendingCommission > 0
                        ? "Pending"
                        : "Up to Date"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {providers.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {providers.length} service providers</span>
            <div className="flex space-x-6">
              <span>
                Total Pending:{" "}
                <span className="font-semibold text-orange-600">
                  {formatCurrency(
                    providers.reduce((sum, p) => sum + p.pendingCommission, 0),
                  )}
                </span>
              </span>
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
