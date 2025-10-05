import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export const SettlementInstructionsPage: React.FC = () => {
  const {
    remittanceOrders,
    loading,
    refreshRemittanceOrders,
    generateSettlementInstruction,
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("AwaitingPayment");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [settlementInstruction, setSettlementInstruction] = useState<
    any | null
  >(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const statusOptions = [
    { value: "AwaitingPayment", label: "Awaiting Payment" },
    { value: "PaymentSubmitted", label: "Payment Submitted" },
    { value: "PaymentValidated", label: "Payment Validated" },
    { value: "Settled", label: "Settled" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  useEffect(() => {
    refreshRemittanceOrders();
  }, [refreshRemittanceOrders]);

  const filteredOrders = remittanceOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceProviderName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      order.serviceProviderId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diffInMs = expiresAt.getTime() - now.getTime();

    if (diffInMs <= 0) return "Expired";

    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(
      (diffInMs % (1000 * 60 * 60)) / (1000 * 60),
    );

    if (diffInHours > 0) {
      return `${diffInHours}h ${diffInMinutes}m remaining`;
    } else {
      return `${diffInMinutes}m remaining`;
    }
  };

  const handleGenerateInstruction = async (order: any) => {
    setIsGenerating(true);
    try {
      const instruction = await generateSettlementInstruction(order.id);
      setSelectedOrder(order);
      setSettlementInstruction(instruction);
      setShowInstructionModal(true);
    } catch (error) {
      console.error("Failed to generate settlement instruction:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log("Copied to clipboard");
    });
  };

  const isExpired = (expiresAt: Date) => {
    return new Date() > expiresAt;
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
        return <DocumentTextIcon className="h-4 w-4" />;
      case "PaymentValidated":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Settled":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "Cancelled":
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  to="/remittance"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to Remittance
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">
                  Settlement Instructions
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Generate and manage payment instructions for service providers
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => refreshRemittanceOrders(true)}
                  disabled={loading.remittanceOrders}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                >
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Instructions Info */}
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Settlement Instructions
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Generate payment instructions for service providers to pay
                  their commission fees. Instructions include GCash account
                  details, reference numbers, and payment amounts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Search */}
            <div>
              <label
                htmlFor="search"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Search Orders
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  placeholder="Search by order ID or provider..."
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
                Order Status
              </label>
              <select
                id="status"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
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
          </div>
        </div>

        {/* Orders List */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              Orders ({filteredOrders.length})
            </h2>
          </div>

          <div className="p-6">
            {loading.remittanceOrders ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-500">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <DocumentTextIcon className="h-12 w-12" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900">
                  No orders found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm || statusFilter !== "AwaitingPayment"
                    ? "No orders match your search criteria."
                    : "No orders are awaiting payment instructions."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-gray-200 p-6 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {order.id}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                          >
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Provider
                            </p>
                            <p className="text-sm text-gray-900">
                              {order.serviceProviderName || "Unknown Provider"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.serviceProviderId}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Amount
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatCurrency(order.amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Commission:{" "}
                              {formatCurrency(order.commissionAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Created
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatDate(order.createdAt)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.serviceType}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => handleGenerateInstruction(order)}
                          disabled={
                            isGenerating || order.status !== "AwaitingPayment"
                          }
                          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm leading-4 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <>
                              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <DocumentTextIcon className="mr-2 h-4 w-4" />
                              Generate Instruction
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Settlement Instruction Modal */}
      {showInstructionModal && selectedOrder && settlementInstruction && (
        <div className="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
          <div className="relative top-20 mx-auto w-4/5 max-w-4xl rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Settlement Instruction - {selectedOrder.id}
                </h3>
                <button
                  onClick={() => {
                    setShowInstructionModal(false);
                    setSelectedOrder(null);
                    setSettlementInstruction(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExclamationTriangleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Instruction Card */}
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="mb-4 text-lg font-medium text-blue-900">
                      Payment Instructions
                    </h4>
                    <div className="space-y-3">
                      <div className="rounded border bg-white p-4">
                        <p className="text-sm whitespace-pre-line text-gray-700">
                          {settlementInstruction.instructions}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-6">
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    Payment Details
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Amount to Pay:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(settlementInstruction.commissionAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        GCash Account:
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {settlementInstruction.corporateGcashAccount}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              settlementInstruction.corporateGcashAccount,
                            )
                          }
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Reference Number:
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {settlementInstruction.referenceNumber}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              settlementInstruction.referenceNumber,
                            )
                          }
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-6">
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    Validity
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Expires At:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(settlementInstruction.expiresAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Time Remaining:
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isExpired(settlementInstruction.expiresAt)
                            ? "text-red-600"
                            : "text-gray-900"
                        }`}
                      >
                        {formatTimeRemaining(settlementInstruction.expiresAt)}
                      </span>
                    </div>
                    {isExpired(settlementInstruction.expiresAt) && (
                      <div className="mt-2 rounded border border-red-200 bg-red-100 p-2">
                        <p className="text-xs text-red-800">
                          This instruction has expired. Generate a new one if
                          needed.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="mb-6 rounded-lg bg-gray-50 p-6">
                <h4 className="mb-4 text-lg font-medium text-gray-900">
                  Order Information
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Order ID:
                    </span>
                    <p className="font-mono text-sm text-gray-900">
                      {selectedOrder.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Service Provider:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.serviceProviderName || "Unknown Provider"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Service Amount:
                    </span>
                    <p className="text-sm text-gray-900">
                      {formatCurrency(selectedOrder.amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Commission Amount:
                    </span>
                    <p className="text-sm text-gray-900">
                      {formatCurrency(selectedOrder.commissionAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Service Type:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.serviceType}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Created:
                    </span>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedOrder.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInstructionModal(false);
                    setSelectedOrder(null);
                    setSettlementInstruction(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const instructionText = `${settlementInstruction.instructions}\n\nReference: ${settlementInstruction.referenceNumber}\nAmount: ${formatCurrency(settlementInstruction.commissionAmount)}\nGCash: ${settlementInstruction.corporateGcashAccount}`;
                    copyToClipboard(instructionText);
                  }}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Copy All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
