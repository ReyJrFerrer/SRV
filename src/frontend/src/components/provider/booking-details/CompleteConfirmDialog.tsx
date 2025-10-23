import React from "react";

interface Props {
  show: boolean;
  clientName: string;
  isCompleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const CompleteConfirmDialog: React.FC<Props> = ({
  show,
  clientName,
  isCompleting,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-green-600">
          Complete Booking?
        </h3>
        <p className="mb-4 text-sm text-gray-700">
          Are you sure you want to mark this booking with <b>{clientName}</b> as
          completed?
        </p>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={onCancel}
            disabled={isCompleting}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
            onClick={onConfirm}
            disabled={isCompleting}
          >
            {isCompleting ? "Proceeding..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteConfirmDialog;
