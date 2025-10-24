import React, { useState, ReactNode } from "react";

interface CancelWithReasonButtonProps {
  buttonText?: ReactNode;
  className?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  textareaLabel?: string;
  submitText?: string;
  cancelText?: string;
  disabled?: boolean;
  onSubmit: (reason: string) => Promise<void> | void;
}

const CancelWithReasonButton: React.FC<CancelWithReasonButtonProps> = ({
  buttonText = "Cancel Booking",
  className = "flex w-full items-center justify-center rounded-md bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600",
  confirmTitle = "Cancel Booking?",
  confirmDescription = "Please let us know why you're cancelling. This helps us improve your experience.",
  textareaLabel = "Reason for cancellation",
  submitText = "Submit",
  cancelText = "Cancel",
  disabled = false,
  onSubmit,
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      setOpen(false);
      setReason("");
      setError(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
  {buttonText}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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
              disabled={submitting}
            />
            <div className="mb-3 text-right text-xs text-gray-500">
              {reason.length}/500
            </div>
            {error && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                onClick={() => {
                  setOpen(false);
                  setReason("");
                  setError(null);
                }}
                disabled={submitting}
              >
                {cancelText}
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : submitText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CancelWithReasonButton;
