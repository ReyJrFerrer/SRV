import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export const RemittanceOrdersPage: React.FC = () => {
  const {
    remittanceOrders,
    remittanceProviders,
    loading,
    refreshRemittanceOrders,
    queryRemittanceOrders,
    validateRemittancePayment,
    cancelRemittanceOrder,
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationReason, setValidationReason] = useState("");
  const [validationApproved, setValidationApproved] = useState(true);
  const [showMobileBar, setShowMobileBar] = useState(false);
  // Mobile: show an actions modal when a row is tapped
  const [showActionsModal, setShowActionsModal] = useState(false);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "AwaitingPayment", label: "Awaiting Payment" },
    { value: "PaymentSubmitted", label: "Payment Submitted" },
    { value: "PaymentValidated", label: "Payment Validated" },
    { value: "Settled", label: "Settled" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  const dateOptions = [
    { value: "", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
  ];

  useEffect(() => {
    refreshRemittanceOrders();
    // Load all orders for filtering
    loadAllOrders();
  }, [refreshRemittanceOrders]);

  useEffect(() => {
    const onScroll = () => {
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [remittanceOrders, searchTerm, statusFilter, providerFilter, dateFilter]);

  const loadAllOrders = async () => {
    try {
      await queryRemittanceOrders({}, { size: 1000 });
    } catch (error) {
      console.error("Failed to load all bookings:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...remittanceOrders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.serviceProviderName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.serviceProviderId
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Provider filter
    if (providerFilter) {
      filtered = filtered.filter(
        (order) => order.serviceProviderId === providerFilter,
      );
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(
        (order) => new Date(order.createdAt) >= startDate,
      );
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AwaitingPayment":
        return "bg-yellow-100 text-yellow-800";
      case "PaymentSubmitted":
        return "bg-blue-100 text-blue-800";
      case "PaymentValidated":
        return "bg-green-100 text-green-800";
      case "Settled":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "AwaitingPayment":
        return <ClockIcon className="h-4 w-4" />;
      case "PaymentSubmitted":
        return <ArrowUpTrayIcon className="h-4 w-4" />;
      case "PaymentValidated":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Settled":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Cancelled":
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AwaitingPayment":
        return "Awaiting Payment";
      case "PaymentSubmitted":
        return "Payment Submitted";
      case "PaymentValidated":
        return "Payment Validated";
      case "Settled":
        return "Settled";
      case "Cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const isLoading = loading.remittanceOrders;

  const handleValidatePayment = async () => {
    if (!selectedOrder) return;

    try {
      await validateRemittancePayment(
        selectedOrder.id,
        validationApproved,
        validationReason,
      );
      setShowValidationModal(false);
      setSelectedOrder(null);
      setValidationReason("");
      setValidationApproved(true);
    } catch (error) {
      console.error("Failed to validate payment:", error);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        await cancelRemittanceOrder(orderId);
      } catch (error) {
        console.error("Failed to cancel order:", error);
      }
    }
  };

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="z-50 border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow sm:sticky sm:top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Remittance Bookings
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Manage and track commission payment bookings
                  </p>
                </div>
              </div>
              <div className="ml-0 flex w-full flex-row gap-2 sm:ml-4 sm:w-auto sm:space-x-4">
                <button
                  onClick={() => refreshRemittanceOrders(true)}
                  disabled={isLoading}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Refresh
                </button>
                <Link
                  to="/remittance/analytics"
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
                >
                  <ChartBarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  Analytics
                </Link>
                <Link
                  to="/remittance"
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
                >
                  <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom actions bar (appears when header is scrolled out) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-yellow-100 px-4 py-3 backdrop-blur transition-all duration-300 ease-out supports-[backdrop-filter]:bg-white/80 sm:hidden ${
          showMobileBar
            ? "translate-y-0 bg-white/95 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-row items-stretch gap-2">
            <button
              onClick={() => refreshRemittanceOrders(true)}
              disabled={isLoading}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/remittance/analytics"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
            >
              <ChartBarIcon className="mr-2 h-4 w-4 text-blue-600" />
              Analytics
            </Link>
            <Link
              to="/remittance"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        {/* Filters */}
        <div className="mb-6 rounded-lg border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div>
              <label
                htmlFor="search"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Search
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Filter */}
            <div>
              <label
                htmlFor="provider"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Provider
              </label>
              <select
                id="provider"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="">All Providers</option>
                {remittanceProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label
                htmlFor="date"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Date Range
              </label>
              <select
                id="date"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                {dateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setProviderFilter("");
                  setDateFilter("");
                }}
                className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <FunnelIcon className="mr-2 h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Bookings ({filteredOrders.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading.remittanceOrders ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-500">
                  Loading bookings...
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <ClockIcon className="h-12 w-12" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900">
                  No bookings found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm || statusFilter || providerFilter || dateFilter
                    ? "Try adjusting your filters to see more results."
                    : "Remittance bookings will appear here once they are created."}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Booking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-gray-50 sm:cursor-default sm:hover:bg-transparent"
                      onClick={() => {
                        // On mobile, toggle the inline actions row
                        if (
                          typeof window !== "undefined" &&
                          window.matchMedia("(max-width: 639px)").matches
                        ) {
                          setSelectedOrder(order);
                          setShowActionsModal(true);
                        }
                      }}
                      role={
                        typeof window !== "undefined" &&
                        window.matchMedia("(max-width: 639px)").matches
                          ? "button"
                          : undefined
                      }
                      tabIndex={
                        typeof window !== "undefined" &&
                        window.matchMedia("(max-width: 639px)").matches
                          ? 0
                          : -1
                      }
                      onKeyDown={(e) => {
                        if (
                          !(
                            typeof window !== "undefined" &&
                            window.matchMedia("(max-width: 639px)").matches
                          )
                        )
                          return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedOrder(order);
                          setShowActionsModal(true);
                        }
                      }}
                      aria-expanded={false}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <span>{order.id}</span>
                          <span className="ml-2 hidden text-xs text-gray-400 sm:hidden">
                            Tap for actions
                          </span>
                          <ChevronRightIcon className="ml-3 h-4 w-4 text-gray-300 sm:hidden" />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        <div>
                          <div className="font-medium text-gray-900">
                            {order.serviceProviderName || "Unknown Provider"}
                          </div>
                          <div className="text-gray-500">
                            {order.serviceProviderId}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(order.commissionAmount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="ml-1">
                            {getStatusLabel(order.status)}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="hidden whitespace-nowrap px-6 py-4 text-sm font-medium sm:table-cell">
                        <div className="flex space-x-2">
                          {order.status === "AwaitingPayment" && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="inline-flex items-center rounded-md border bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              Cancel
                            </button>
                          )}
                          {order.status === "PaymentSubmitted" && (
                            <>
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="inline-flex items-center rounded-md border bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                              >
                                View Proof
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowValidationModal(true);
                                  setValidationApproved(true);
                                }}
                                className="inline-flex items-center rounded-md border bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              >
                                Validate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredOrders.length)} of{" "}
                  {filteredOrders.length} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Validation Modal */}
      {showValidationModal && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-blue-100 bg-white shadow-xl sm:max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                </span>
                <h3 className="text-base font-semibold text-gray-900">
                  Validate Payment
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setSelectedOrder(null);
                  setValidationReason("");
                  setValidationApproved(true);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              {/* Summary */}
              <div className="mb-4 rounded-lg border border-yellow-100 bg-yellow-50/30 px-4 py-3">
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-gray-500">Booking ID</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(selectedOrder.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Commission</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(selectedOrder.commissionAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedOrder.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Decision segmented control */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Decision
                </label>
                <div className="inline-flex w-full overflow-hidden rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setValidationApproved(true)}
                    className={`flex-1 px-3 py-2 text-sm font-medium focus:outline-none ${
                      validationApproved
                        ? "bg-green-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={validationApproved}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidationApproved(false)}
                    className={`flex-1 border-l border-gray-200 px-3 py-2 text-sm font-medium focus:outline-none ${
                      !validationApproved
                        ? "bg-red-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={!validationApproved}
                  >
                    Reject
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Choose an action, then optionally provide a reason.
                </p>
              </div>

              {/* Reason */}
              <div className="mb-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reason (Optional)
                </label>
                <textarea
                  value={validationReason}
                  onChange={(e) => setValidationReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  rows={3}
                  placeholder={
                    validationApproved
                      ? "Add any notes for approval..."
                      : "Add reason for rejection (optional)..."
                  }
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setSelectedOrder(null);
                  setValidationReason("");
                  setValidationApproved(true);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleValidatePayment}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                  validationApproved
                    ? "bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500"
                    : "bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500"
                }`}
              >
                {validationApproved ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Actions Modal */}
      {showActionsModal && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/50 p-4 sm:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-blue-100 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                </span>
                <h3 className="text-base font-semibold text-gray-900">
                  Booking Actions
                </h3>
              </div>
              <button
                onClick={() => setShowActionsModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <div className="mb-4 rounded-lg border border-yellow-100 bg-yellow-50/30 px-4 py-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Booking ID</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedOrder.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(selectedOrder.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selectedOrder.status)}`}
                    >
                      {getStatusIcon(selectedOrder.status)}
                      <span className="ml-1">
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {selectedOrder.status === "AwaitingPayment" && (
                  <button
                    onClick={() => {
                      handleCancelOrder(selectedOrder.id);
                      setShowActionsModal(false);
                    }}
                    className="inline-flex items-center justify-center rounded-md border bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Cancel Booking
                  </button>
                )}
                {selectedOrder.status === "PaymentSubmitted" && (
                  <>
                    <button
                      onClick={() => {
                        // Keep behavior consistent with desktop
                        setSelectedOrder(selectedOrder);
                      }}
                      className="inline-flex items-center justify-center rounded-md border bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      View Proof
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsModal(false);
                        setShowValidationModal(true);
                        setValidationApproved(true);
                      }}
                      className="inline-flex items-center justify-center rounded-md border bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Validate
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setShowActionsModal(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
