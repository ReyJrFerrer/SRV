import React from "react";
import {
  UserIcon,
  XMarkIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface Provider {
  id: string;
  name: string;
  phone: string;
  totalEarnings?: number;
  settledCommission?: number;
  outstandingBalance?: number;
  pendingCommission?: number;
  averageOrderValue?: number;
  totalOrdersCompleted?: number;
  pendingOrders?: number;
  overdueOrders?: number;
  lastActivity?: Date | string;
}

interface ProviderAnalytics {
  totalOrders?: number;
  settledOrders?: number;
  pendingOrders?: number;
  totalCommissionPaid?: number;
  totalServiceAmount?: number;
  averageOrderValue?: number;
}

interface ProviderDashboard {
  ordersAwaitingPayment?: any[];
  ordersPendingValidation?: any[];
  nextDeadline?: string | Date;
}

interface ProviderDetailsModalProps {
  isOpen: boolean;
  provider: Provider | null;
  providerDashboard?: ProviderDashboard | null;
  providerAnalytics: ProviderAnalytics | null;
  analyticsMode?: "details" | "analytics";
  analyticsLoading?: boolean;
  onClose: () => void;
  onModeChange?: (mode: "details" | "analytics") => void;
  onLoadAnalytics?: (providerId: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate?: (date: Date) => string;
  getStatusColor?: (overdueOrders: number, pendingOrders: number) => string;
  getStatusIcon?: (
    overdueOrders: number,
    pendingOrders: number,
  ) => React.ReactNode;
  getStatusText?: (overdueOrders: number, pendingOrders: number) => string;
}

export const ProviderDetailsModal: React.FC<ProviderDetailsModalProps> = ({
  isOpen,
  provider,
  providerDashboard = null,
  providerAnalytics,
  analyticsMode = "details",
  analyticsLoading = false,
  onClose,
  onModeChange,
  onLoadAnalytics,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusIcon,
  getStatusText,
}) => {
  if (!isOpen || !provider) return null;

  // Default formatDate if not provided
  const defaultFormatDate =
    formatDate ||
    ((date: Date) => {
      return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    });

  // Default status helpers if not provided
  const defaultGetStatusColor =
    getStatusColor ||
    ((overdueOrders: number, pendingOrders: number) => {
      if (overdueOrders > 0) return "bg-red-100 text-red-800";
      if (pendingOrders > 0) return "bg-yellow-100 text-yellow-800";
      return "bg-green-100 text-green-800";
    });

  const defaultGetStatusIcon =
    getStatusIcon ||
    ((overdueOrders: number, pendingOrders: number) => {
      if (overdueOrders > 0)
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      if (pendingOrders > 0) return <ClockIcon className="h-4 w-4" />;
      return <CheckCircleIcon className="h-4 w-4" />;
    });

  const defaultGetStatusText =
    getStatusText ||
    ((overdueOrders: number, pendingOrders: number) => {
      if (overdueOrders > 0) return `${overdueOrders} overdue`;
      if (pendingOrders > 0) return `${pendingOrders} pending`;
      return "All clear";
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      <div className="mt-16 flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-blue-100 bg-white shadow-xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-blue-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </span>
            <h3 className="text-base font-semibold text-gray-900">
              Provider Details
            </h3>
            <span className="hidden text-sm text-gray-500 sm:inline">
              – {provider.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Profile summary */}
          <div className="mb-4 rounded-lg border border-yellow-100 bg-yellow-50/30 p-4">
            <div className="flex items-center gap-4">
              <img
                src={encodeURI("/images/srv characters (SVG)/plumber.svg")}
                alt="Provider"
                className="h-14 w-14 rounded-full border border-blue-100 bg-white object-contain p-1"
              />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-gray-900">
                  {provider.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="inline-flex items-center">
                    <PhoneIcon className="mr-1 h-4 w-4 text-gray-500" />
                    {provider.phone}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="font-mono text-gray-700">{provider.id}</span>
                  {typeof provider.overdueOrders === "number" &&
                    typeof provider.pendingOrders === "number" && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${defaultGetStatusColor(provider.overdueOrders, provider.pendingOrders)}`}
                      >
                        {defaultGetStatusIcon(
                          provider.overdueOrders,
                          provider.pendingOrders,
                        )}
                        <span className="ml-1">
                          {defaultGetStatusText(
                            provider.overdueOrders,
                            provider.pendingOrders,
                          )}
                        </span>
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Mode switch - only show if onModeChange is provided */}
          {onModeChange && (
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => onModeChange("details")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  analyticsMode === "details"
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-yellow-50"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => {
                  onModeChange("analytics");
                  if (!providerAnalytics && onLoadAnalytics) {
                    onLoadAnalytics(provider.id);
                  }
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  analyticsMode === "analytics"
                    ? "bg-blue-600 text-white"
                    : "border border-blue-600 bg-white text-blue-600 hover:bg-blue-50"
                }`}
              >
                Analytics
              </button>
            </div>
          )}

          {/* Content */}
          {!onModeChange || analyticsMode === "details" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Provider Info */}
              <div className="rounded-lg border border-blue-50 bg-white p-5">
                <h4 className="mb-3 text-sm font-semibold text-gray-900">
                  Provider Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium text-gray-900">
                      {provider.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium text-gray-900">
                      {provider.phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Provider ID:</span>
                    <span className="font-mono text-gray-900">
                      {provider.id}
                    </span>
                  </div>
                  {provider.lastActivity && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Activity:</span>
                      <span className="font-medium text-gray-900">
                        {defaultFormatDate(
                          typeof provider.lastActivity === "string"
                            ? new Date(provider.lastActivity)
                            : provider.lastActivity,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="rounded-lg border border-blue-50 bg-white p-5">
                <h4 className="mb-3 text-sm font-semibold text-gray-900">
                  Financial Summary
                </h4>
                <div className="space-y-2 text-sm">
                  {provider.totalEarnings !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Earnings:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(provider.totalEarnings)}
                      </span>
                    </div>
                  )}
                  {provider.settledCommission !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Settled Commission:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(provider.settledCommission)}
                      </span>
                    </div>
                  )}
                  {provider.outstandingBalance !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Outstanding Balance:
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(provider.outstandingBalance)}
                      </span>
                    </div>
                  )}
                  {provider.pendingCommission !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pending Commission:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(provider.pendingCommission)}
                      </span>
                    </div>
                  )}
                  {provider.averageOrderValue !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Average Order Value:
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(provider.averageOrderValue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Statistics */}
              <div className="rounded-lg border border-blue-50 bg-white p-5">
                <h4 className="mb-3 text-sm font-semibold text-gray-900">
                  Order Statistics
                </h4>
                <div className="space-y-2 text-sm">
                  {provider.totalOrdersCompleted !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Total Bookings Completed:
                      </span>
                      <span className="font-medium text-gray-900">
                        {provider.totalOrdersCompleted}
                      </span>
                    </div>
                  )}
                  {provider.pendingOrders !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pending Bookings:</span>
                      <span className="font-medium text-gray-900">
                        {provider.pendingOrders}
                      </span>
                    </div>
                  )}
                  {provider.overdueOrders !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Overdue Bookings:</span>
                      <span
                        className={`font-medium ${provider.overdueOrders > 0 ? "text-red-600" : "text-gray-900"}`}
                      >
                        {provider.overdueOrders}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              {providerDashboard && (
                <div className="rounded-lg border border-blue-50 bg-white p-5">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">
                    Recent Activity
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Bookings Awaiting Payment:
                      </span>
                      <span className="font-medium text-gray-900">
                        {providerDashboard.ordersAwaitingPayment?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Bookings Pending Validation:
                      </span>
                      <span className="font-medium text-gray-900">
                        {providerDashboard.ordersPendingValidation?.length || 0}
                      </span>
                    </div>
                    {providerDashboard.nextDeadline && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Next Deadline:</span>
                        <span className="font-medium text-gray-900">
                          {defaultFormatDate(
                            typeof providerDashboard.nextDeadline === "string"
                              ? new Date(providerDashboard.nextDeadline)
                              : providerDashboard.nextDeadline,
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {analyticsLoading ||
              !providerAnalytics ||
              Object.keys(providerAnalytics).length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading provider analytics...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-blue-50 bg-white p-5">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                      Booking Statistics
                    </h4>
                    <div className="space-y-2 text-sm">
                      {providerAnalytics.totalOrders !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Bookings:</span>
                          <span className="font-medium text-gray-900">
                            {providerAnalytics.totalOrders}
                          </span>
                        </div>
                      )}
                      {providerAnalytics.settledOrders !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Settled Bookings:
                          </span>
                          <span className="font-medium text-gray-900">
                            {providerAnalytics.settledOrders}
                          </span>
                        </div>
                      )}
                      {providerAnalytics.pendingOrders !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Pending Bookings:
                          </span>
                          <span className="font-medium text-gray-900">
                            {providerAnalytics.pendingOrders}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-50 bg-white p-5">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                      Financial Metrics
                    </h4>
                    <div className="space-y-2 text-sm">
                      {providerAnalytics.totalCommissionPaid !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Total Commission Paid:
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(
                              providerAnalytics.totalCommissionPaid,
                            )}
                          </span>
                        </div>
                      )}
                      {providerAnalytics.totalServiceAmount !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Total Service Amount:
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(
                              providerAnalytics.totalServiceAmount,
                            )}
                          </span>
                        </div>
                      )}
                      {providerAnalytics.averageOrderValue !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Average Booking Value:
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(
                              providerAnalytics.averageOrderValue,
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
