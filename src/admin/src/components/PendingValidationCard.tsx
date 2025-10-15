import React, { useState } from "react";

interface PendingValidation {
  id: string;
  orderId: string;
  serviceProviderName: string;
  serviceType: string;
  amount: number;
  commissionAmount: number;
  paymentMethod: string;
  paymentProofMediaIds: string[];
  submittedAt: Date;
}

interface PendingValidationCardProps {
  validation: PendingValidation;
  onApprove: (orderId: string, reason?: string) => void;
  onReject: (orderId: string, reason: string) => void;
  onViewMedia: (mediaIds: string[]) => void;
  loading?: boolean;
}

export const PendingValidationCard: React.FC<PendingValidationCardProps> = ({
  validation,
  onApprove,
  onReject,
  onViewMedia,
  loading = false,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [reason, setReason] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleActionClick = (action: "approve" | "reject") => {
    setActionType(action);
    setShowActions(true);
    if (action === "approve") {
      setReason("");
    }
  };

  const handleConfirm = () => {
    if (actionType === "approve") {
      onApprove(validation.orderId, reason || undefined);
    } else if (actionType === "reject" && reason.trim()) {
      onReject(validation.orderId, reason.trim());
    }
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setShowActions(false);
    setActionType(null);
    setReason("");
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Order #{validation.orderId.slice(-8)}
            </h3>
            <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
              Pending Validation
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Service Provider</p>
              <p className="text-sm font-medium text-gray-900">
                {validation.serviceProviderName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Type</p>
              <p className="text-sm font-medium text-gray-900">
                {validation.serviceType}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(validation.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Commission</p>
              <p className="text-sm font-semibold text-orange-600">
                {formatCurrency(validation.commissionAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="text-sm font-medium text-gray-900">
                {validation.paymentMethod}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(validation.submittedAt)}
              </p>
            </div>
          </div>

          {validation.paymentProofMediaIds.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-500">Payment Proof</p>
              <button
                onClick={() => onViewMedia(validation.paymentProofMediaIds)}
                className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
              >
                View Media ({validation.paymentProofMediaIds.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {!showActions ? (
        <div className="flex space-x-3">
          <button
            onClick={() => handleActionClick("approve")}
            disabled={loading}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : "Approve"}
          </button>
          <button
            onClick={() => handleActionClick("reject")}
            disabled={loading}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="border-t border-gray-200 pt-4">
          <div className="mb-4">
            <label
              htmlFor="reason"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {actionType === "approve"
                ? "Approval Note (Optional)"
                : "Rejection Reason (Required)"}
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionType === "approve"
                  ? "Optional note for approval..."
                  : "Please provide a reason for rejection..."
              }
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleConfirm}
              disabled={loading || (actionType === "reject" && !reason.trim())}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading
                ? "Processing..."
                : `Confirm ${actionType === "approve" ? "Approval" : "Rejection"}`}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
