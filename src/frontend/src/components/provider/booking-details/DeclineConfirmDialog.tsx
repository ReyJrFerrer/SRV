import React, { useState } from "react";

interface Props {
  show: boolean;
  clientName: string;
  isDeclinining: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

const DeclineConfirmDialog: React.FC<Props> = ({
  show,
  clientName,
  isDeclinining,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-red-700">Decline Booking?</h3>
        <p className="mb-3 text-sm text-gray-700">
          Please provide a brief reason for declining this booking from <b>{clientName || "this client"}</b>.
        </p>
        <label htmlFor="decline-reason" className="mb-1 block text-sm font-semibold text-gray-700">Reason for declining</label>
        <textarea
          id="decline-reason"
          className="mb-1 min-h-[96px] w-full resize-none rounded-lg border border-gray-300 p-3 text-sm shadow focus:outline-none focus:ring-2 focus:ring-red-400"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          maxLength={500}
          placeholder="Type your reason here (required)"
          disabled={isDeclinining}
        />
        <div className="mb-3 text-right text-xs text-gray-500">{reason.length}/500</div>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="mt-2 flex gap-2">
          <button
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            onClick={onCancel}
            disabled={isDeclinining}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            onClick={() => {
              if (!reason.trim()) {
                setError("Please provide a reason for declining.");
                return;
              }
              onConfirm(reason.trim());
            }}
            disabled={isDeclinining}
          >
            {isDeclinining ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclineConfirmDialog;
