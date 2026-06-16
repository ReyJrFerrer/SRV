import React, { useState } from "react";

interface ReviewSummary {
  id: string;
  rating: number;
  comment: string;
  clientName?: string;
}

interface Props {
  open: boolean;
  review: ReviewSummary | null;
  isFlagging: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

const FlagReviewDialog: React.FC<Props> = ({
  open,
  review,
  isFlagging,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState("");

  if (!open || !review) return null;

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-center text-lg font-bold text-red-700">
          Flag Review
        </h3>

        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p className="mb-1 font-medium">
            Client: {review.clientName || "Anonymous"}
          </p>
          <p className="mb-1">
            Rating: {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </p>
          <p className="line-clamp-2 text-gray-500">
            {review.comment || "No comment"}
          </p>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Reason for flagging *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-red-400 focus:ring-2 focus:ring-red-200"
          rows={4}
          placeholder="Describe why this review should be reviewed by admin..."
          disabled={isFlagging}
        />

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={handleCancel}
            disabled={isFlagging}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!reason.trim() || isFlagging}
          >
            {isFlagging ? "Flagging..." : "Flag Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlagReviewDialog;
