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
  const [settlementInstruction, setSettlementInstruction] = useState<any | null>(null);
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
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceProviderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
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
                <h1 className="text-2xl font-bold text-gray-900 mt-2">
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
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
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
                  Generate payment instructions for service providers to pay their commission fees.
                  Instructions include GCash account details, reference numbers, and payment amounts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search by order ID or provider..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Order Status
              </label>
              <select
                id="status"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Orders ({filteredOrders.length})
            </h2>
          </div>

          <div className="p-6">
            {loading.remittanceOrders ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-500">
                  Loading orders...
                </p>
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
                    className="p-6 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {order.id}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                          >
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Provider</p>
                            <p className="text-sm text-gray-900">
                              {order.serviceProviderName || "Unknown Provider"}
                            </p>
                            <p className="text-xs text-gray-500">{order.serviceProviderId}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Amount</p>
                            <p className="text-sm text-gray-900">
                              {formatCurrency(order.amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Commission: {formatCurrency(order.commissionAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Created</p>
                            <p className="text-sm text-gray-900">
                              {formatDate(order.createdAt)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.serviceType}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleGenerateInstruction(order)}
                          disabled={isGenerating || order.status !== "AwaitingPayment"}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGenerating ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <DocumentTextIcon className="h-4 w-4 mr-2" />
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-lg font-medium text-blue-900 mb-4">
                      Payment Instructions
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded border">
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {settlementInstruction.instructions}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Amount to Pay:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(settlementInstruction.commissionAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">GCash Account:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {settlementInstruction.corporateGcashAccount}
                        </span>
                        <button
                          onClick={() => copyToClipboard(settlementInstruction.corporateGcashAccount)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Reference Number:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {settlementInstruction.referenceNumber}
                        </span>
                        <button
                          onClick={() => copyToClipboard(settlementInstruction.referenceNumber)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Validity</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Expires At:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(settlementInstruction.expiresAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Time Remaining:</span>
                      <span className={`text-sm font-medium ${
                        isExpired(settlementInstruction.expiresAt) 
                          ? 'text-red-600' 
                          : 'text-gray-900'
                      }`}>
                        {formatTimeRemaining(settlementInstruction.expiresAt)}
                      </span>
                    </div>
                    {isExpired(settlementInstruction.expiresAt) && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded">
                        <p className="text-xs text-red-800">
                          This instruction has expired. Generate a new one if needed.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Order Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Order ID:</span>
                    <p className="text-sm text-gray-900 font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Service Provider:</span>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.serviceProviderName || "Unknown Provider"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Service Amount:</span>
                    <p className="text-sm text-gray-900">{formatCurrency(selectedOrder.amount)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Commission Amount:</span>
                    <p className="text-sm text-gray-900">{formatCurrency(selectedOrder.commissionAmount)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Service Type:</span>
                    <p className="text-sm text-gray-900">{selectedOrder.serviceType}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Created:</span>
                    <p className="text-sm text-gray-900">{formatDate(selectedOrder.createdAt)}</p>
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
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const instructionText = `${settlementInstruction.instructions}\n\nReference: ${settlementInstruction.referenceNumber}\nAmount: ${formatCurrency(settlementInstruction.commissionAmount)}\nGCash: ${settlementInstruction.corporateGcashAccount}`;
                    copyToClipboard(instructionText);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
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
