import React from "react";

interface Props {
  open: boolean;
  packageTitle?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeletePackageConfirmDialog: React.FC<Props> = ({
  open,
  packageTitle,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-red-700">Delete Package?</h3>
        <p className="mb-4 text-sm text-gray-700">
          Are you sure you want to delete{" "}
          <b>{packageTitle || "this package"}</b>? This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletePackageConfirmDialog;
