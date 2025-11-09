import React from "react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  reviewId: string | null;
  isDeleting: boolean;
  onConfirm: (reviewId: string) => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  reviewId,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !reviewId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-red-700">
          Delete Review?
        </h3>
        <p className="mb-4 text-sm text-gray-700">
          Are you sure you want to delete this review? This action will hide
          the review and cannot be undone.
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
            onClick={() => onConfirm(reviewId)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

