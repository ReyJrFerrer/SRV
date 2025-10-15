import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export const PaymentValidationPage: React.FC = () => {
  const {
    pendingValidations,
    loading,
    refreshPendingValidations,
    validateRemittancePayment,
    getOrderWithMedia,
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderMedia, setOrderMedia] = useState<any[]>([]);
  const [validationReason, setValidationReason] = useState("");
  const [validationApproved, setValidationApproved] = useState(true);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  useEffect(() => {
    refreshPendingValidations();
  }, [refreshPendingValidations]);

  const filteredOrders = pendingValidations.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceProviderId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  const handleViewOrder = async (order: any) => {
    setSelectedOrder(order);
    try {
      const { mediaItems } = await getOrderWithMedia(order.id);
      setOrderMedia(mediaItems);
      setShowMediaModal(true);
    } catch (error) {
      console.error("Failed to load order media:", error);
      setOrderMedia([]);
      setShowMediaModal(true);
    }
  };

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

  const openValidationModal = (order: any) => {
    setSelectedOrder(order);
    setShowValidationModal(true);
    setValidationApproved(true);
    setValidationReason("");
  };

  const isOverdue = (createdAt: Date) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return new Date(createdAt) < oneDayAgo;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow">
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
                  Payment Validation
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Review and validate payment proofs from service providers
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => refreshPendingValidations(true)}
                  disabled={loading.pendingValidations}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
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
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
                    <EyeIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Pending Validation
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.pendingValidations
                        ? "..."
                        : filteredOrders.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Recent Submissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.pendingValidations
                        ? "..."
                        : filteredOrders.filter((order) => {
                            const oneHourAgo = new Date(
                              Date.now() - 60 * 60 * 1000,
                            );
                            return (
                              new Date(
                                order.paymentSubmittedAt || order.createdAt,
                              ) > oneHourAgo
                            );
                          }).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500">
                    <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Overdue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.pendingValidations
                        ? "..."
                        : filteredOrders.filter((order) =>
                            isOverdue(
                              new Date(
                                order.paymentSubmittedAt || order.createdAt,
                              ),
                            ),
                          ).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="max-w-md">
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
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="Search by order ID or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              Pending Validations ({filteredOrders.length})
            </h2>
          </div>

          <div className="p-6">
            {loading.pendingValidations ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-500">
                  Loading pending validations...
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <CheckCircleIcon className="h-12 w-12" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900">
                  No pending validations
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm
                    ? "No orders match your search criteria."
                    : "All payment proofs have been validated."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`rounded-lg border p-6 hover:bg-gray-50 ${
                      isOverdue(
                        new Date(order.paymentSubmittedAt || order.createdAt),
                      )
                        ? "border-red-200 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {order.id}
                          </h3>
                          {isOverdue(
                            new Date(
                              order.paymentSubmittedAt || order.createdAt,
                            ),
                          ) && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              <ExclamationTriangleIcon className="mr-1 h-3 w-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Provider
                            </p>
                            <p className="text-sm text-gray-900">
                              Provider {order.serviceProviderId}
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
                              Submitted
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatDate(
                                new Date(
                                  order.paymentSubmittedAt || order.createdAt,
                                ),
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.paymentProofMediaIds.length} proof(s)
                              uploaded
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          View Proof
                        </button>
                        <button
                          onClick={() => openValidationModal(order)}
                          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Validate
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

      {/* Media Modal */}
      {showMediaModal && selectedOrder && (
        <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative top-20 mx-auto w-4/5 max-w-4xl rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Payment Proofs - {selectedOrder.id}
                </h3>
                <button
                  onClick={() => {
                    setShowMediaModal(false);
                    setSelectedOrder(null);
                    setOrderMedia([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Provider:</span>
                    <p className="text-gray-900">
                      Provider {selectedOrder.serviceProviderId}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Amount:</span>
                    <p className="text-gray-900">
                      {formatCurrency(selectedOrder.amount)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Commission:
                    </span>
                    <p className="text-gray-900">
                      {formatCurrency(selectedOrder.commissionAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Submitted:
                    </span>
                    <p className="text-gray-900">
                      {formatDate(
                        new Date(
                          selectedOrder.paymentSubmittedAt ||
                            selectedOrder.createdAt,
                        ),
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {orderMedia.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {orderMedia.map((media, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <h4 className="mb-2 font-medium text-gray-900">
                        Proof #{index + 1}
                      </h4>
                      {media.mimeType?.startsWith("image/") ? (
                        <img
                          src={
                            media.url ||
                            `data:${media.mimeType};base64,${media.data}`
                          }
                          alt={`Payment proof ${index + 1}`}
                          className="h-64 w-full rounded border object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-image.png";
                          }}
                        />
                      ) : (
                        <div className="flex h-64 w-full items-center justify-center rounded border bg-gray-100">
                          <p className="text-gray-500">Preview not available</p>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Type: {media.mimeType || "Unknown"}</p>
                        <p>
                          Size:{" "}
                          {media.sizeBytes
                            ? `${Math.round(media.sizeBytes / 1024)} KB`
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No proof images
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No payment proof images were uploaded for this order.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowMediaModal(false);
                    setSelectedOrder(null);
                    setOrderMedia([]);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowMediaModal(false);
                    openValidationModal(selectedOrder);
                  }}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Validate Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && selectedOrder && (
        <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Validate Payment
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Order ID: {selectedOrder.id}
                </p>
                <p className="text-sm text-gray-600">
                  Amount: {formatCurrency(selectedOrder.amount)}
                </p>
                <p className="text-sm text-gray-600">
                  Commission: {formatCurrency(selectedOrder.commissionAmount)}
                </p>
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Decision
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="validation"
                      value="approve"
                      checked={validationApproved}
                      onChange={() => setValidationApproved(true)}
                      className="mr-2"
                    />
                    Approve Payment
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="validation"
                      value="reject"
                      checked={!validationApproved}
                      onChange={() => setValidationApproved(false)}
                      className="mr-2"
                    />
                    Reject Payment
                  </label>
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reason (Optional)
                </label>
                <textarea
                  value={validationReason}
                  onChange={(e) => setValidationReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  rows={3}
                  placeholder="Enter reason for approval/rejection..."
                />
              </div>
              <div className="flex justify-end space-x-3">
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
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {validationApproved ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
