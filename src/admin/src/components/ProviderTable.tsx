import React from "react";
import {
  UserIcon,
  PhoneIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface Provider {
  id: string;
  name: string;
  phone: string;
  totalEarnings: number;
  outstandingBalance?: number;
  overdueOrders?: number;
  pendingOrders?: number;
  lastActivity: Date | string;
}

interface ProviderTableProps {
  providers: Provider[];
  loading: boolean;
  searchTerm: string;
  formatCurrency: (amount: number) => string;
  formatRelativeTime: (date: Date) => string;
  getStatusColor: (overdueOrders: number, pendingOrders: number) => string;
  getStatusIcon: (overdueOrders: number, pendingOrders: number) => React.ReactNode;
  getStatusText: (overdueOrders: number, pendingOrders: number) => string;
  isMobileViewport: boolean;
  onViewProvider: (provider: Provider) => void;
}

export const ProviderTable: React.FC<ProviderTableProps> = ({
  providers,
  loading,
  searchTerm,
  formatCurrency,
  formatRelativeTime,
  getStatusColor,
  getStatusIcon,
  getStatusText,
  isMobileViewport,
  onViewProvider,
}) => {
  return (
    <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
        <h2 className="text-lg font-medium text-gray-900">
          Service Providers ({providers.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <UserIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              No providers found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm
                ? "No providers match your search criteria."
                : "Service providers will appear here once they have activity."}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Activity
                </th>
                {/* Hide Actions column on mobile */}
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {providers.map((provider) => (
                <tr
                  key={provider.id}
                  className="cursor-pointer hover:bg-gray-50 sm:cursor-default sm:hover:bg-transparent"
                  onClick={() => {
                    // On mobile, tapping the row opens details; on desktop, do nothing
                    if (isMobileViewport) onViewProvider(provider);
                  }}
                  role={isMobileViewport ? "button" : undefined}
                  tabIndex={isMobileViewport ? 0 : -1}
                  onKeyDown={(e) => {
                    if (!isMobileViewport) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onViewProvider(provider);
                    }
                  }}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          src={encodeURI(
                            "/images/srv characters (SVG)/plumber.svg",
                          )}
                          alt="Provider"
                          className="h-10 w-10 rounded-full border border-blue-100 bg-white object-contain p-1"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {provider.id.substring(0, 8)}...
                        </div>
                      </div>
                      {/* Mobile chevron indicator */}
                      <ChevronRightIcon className="ml-3 h-5 w-5 text-gray-300 sm:hidden" />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <PhoneIcon className="mr-2 h-4 w-4" />
                      {provider.phone}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(provider.totalEarnings)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(provider.outstandingBalance ?? 0)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(provider.overdueOrders ?? 0, provider.pendingOrders ?? 0)}`}
                    >
                      {getStatusIcon(
                        provider.overdueOrders ?? 0,
                        provider.pendingOrders ?? 0,
                      )}
                      <span className="ml-1">
                        {getStatusText(
                          provider.overdueOrders ?? 0,
                          provider.pendingOrders ?? 0,
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatRelativeTime(
                      typeof provider.lastActivity === "string"
                        ? new Date(provider.lastActivity)
                        : provider.lastActivity,
                    )}
                  </td>
                  {/* Hide Actions cell on mobile */}
                  <td className="hidden whitespace-nowrap px-6 py-4 text-sm font-medium sm:table-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProvider(provider);
                      }}
                      className="inline-flex items-center rounded-md border bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

