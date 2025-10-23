import React from "react";

interface Props {
  show: boolean;
  clientName: string;
  isDeclinining: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeclineConfirmDialog: React.FC<Props> = ({
  show,
  clientName,
  isDeclinining,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-red-700">
          Decline Booking?
        </h3>
        <p className="mb-4 text-sm text-gray-700">
          Are you sure you want to decline this booking from{" "}
          <b>{clientName || "this client"}</b>? This action cannot be undone and
          the client will be notified.
        </p>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={onCancel}
            disabled={isDeclinining}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={isDeclinining}
          >
            {isDeclinining ? "Declining..." : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclineConfirmDialog;
