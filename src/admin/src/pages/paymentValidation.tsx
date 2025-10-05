import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  ArrowLeftIcon,
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

  const filteredOrders = pendingValidations.filter((order) =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.serviceProviderId.toLowerCase().includes(searchTerm.toLowerCase())
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
      await validateRemittancePayment(selectedOrder.id, validationApproved, validationReason);
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
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <EyeIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Validation
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.pendingValidations ? "..." : filteredOrders.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Recent Submissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.pendingValidations ? "..." : filteredOrders.filter(order => {
                        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                        return new Date(order.paymentSubmittedAt || order.createdAt) > oneHourAgo;
                      }).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Overdue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading.pendingValidations ? "..." : filteredOrders.filter(order => 
                        isOverdue(new Date(order.paymentSubmittedAt || order.createdAt))
                      ).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="max-w-md">
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
        </div>

        {/* Orders List */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
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
                    className={`p-6 border rounded-lg hover:bg-gray-50 ${
                      isOverdue(new Date(order.paymentSubmittedAt || order.createdAt))
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
                          {isOverdue(new Date(order.paymentSubmittedAt || order.createdAt)) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Provider</p>
                            <p className="text-sm text-gray-900">
                              Provider {order.serviceProviderId}
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
                            <p className="text-sm font-medium text-gray-500">Submitted</p>
                            <p className="text-sm text-gray-900">
                              {formatDate(new Date(order.paymentSubmittedAt || order.createdAt))}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.paymentProofMediaIds.length} proof(s) uploaded
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          View Proof
                        </button>
                        <button
                          onClick={() => openValidationModal(order)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
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
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Provider:</span>
                    <p className="text-gray-900">Provider {selectedOrder.serviceProviderId}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Amount:</span>
                    <p className="text-gray-900">{formatCurrency(selectedOrder.amount)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Commission:</span>
                    <p className="text-gray-900">{formatCurrency(selectedOrder.commissionAmount)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Submitted:</span>
                    <p className="text-gray-900">{formatDate(new Date(selectedOrder.paymentSubmittedAt || selectedOrder.createdAt))}</p>
                  </div>
                </div>
              </div>

              {orderMedia.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderMedia.map((media, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Proof #{index + 1}
                      </h4>
                      {media.mimeType?.startsWith('image/') ? (
                        <img
                          src={media.url || `data:${media.mimeType};base64,${media.data}`}
                          alt={`Payment proof ${index + 1}`}
                          className="w-full h-64 object-contain border rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-64 border rounded flex items-center justify-center bg-gray-100">
                          <p className="text-gray-500">Preview not available</p>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Type: {media.mimeType || 'Unknown'}</p>
                        <p>Size: {media.sizeBytes ? `${Math.round(media.sizeBytes / 1024)} KB` : 'Unknown'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No proof images</h3>
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
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowMediaModal(false);
                    openValidationModal(selectedOrder);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={validationReason}
                  onChange={(e) => setValidationReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleValidatePayment}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
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
