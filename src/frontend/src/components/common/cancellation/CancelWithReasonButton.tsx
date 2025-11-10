import React, { useState } from "react";

export interface CancelWithReasonButtonProps {
  show: boolean;
  confirmTitle?: string;
  confirmDescription: string;
  textareaLabel: string;
  submitText: string;
  cancelText: string;
  isSubmitting?: boolean;
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

const CancelWithReasonButton: React.FC<CancelWithReasonButtonProps> = ({
  show,
  confirmTitle = "Cancel Booking?",
  confirmDescription = "Please let us know why you're cancelling. This helps us improve your experience.",
  textareaLabel = "Reason for cancellation",
  submitText = "Submit",
  cancelText = "Cancel",
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason.");
      return;
    }
    try {
      await onSubmit(reason.trim());
      setReason("");
      setError(null);
    } catch (err) {
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-red-700">{confirmTitle}</h3>
        <p className="mb-3 text-sm text-gray-700">{confirmDescription}</p>

        <label
          htmlFor="cancel-reason"
          className="mb-1 block text-sm font-semibold text-gray-700"
        >
          {textareaLabel}
        </label>
        <textarea
          id="cancel-reason"
          className="mb-1 min-h-[96px] w-full resize-none rounded-lg border border-gray-300 p-3 text-sm shadow focus:outline-none focus:ring-2 focus:ring-red-400"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          maxLength={500}
          placeholder="Type your reason here (required)"
          disabled={isSubmitting}
        />
        <div className="mb-3 text-right text-xs text-gray-500">
          {reason.length}/500
        </div>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelText}
          </button>
          <button
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? "Submitting..." : submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelWithReasonButton;
