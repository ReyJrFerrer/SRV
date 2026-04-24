import React from "react";
import { Dialog } from "@headlessui/react";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface ServiceDetailsModalsProps {
  showDeleteConfirm: boolean;
  isDeleting: boolean;
  serviceTitle?: string;
  previewUrl: string | null;
  previewType: "image" | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onPreviewClose: () => void;
  onDeleteClick: () => void;
}

export const ServiceDetailsModals: React.FC<ServiceDetailsModalsProps> = ({
  showDeleteConfirm,
  isDeleting,
  serviceTitle,
  previewUrl,
  previewType,
  onDeleteConfirm,
  onDeleteCancel,
  onPreviewClose,
  onDeleteClick,
}) => {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-red-700">
              Permanently Delete Service?
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Are you sure you want to delete{" "}
              <b>{serviceTitle || "this service"}</b>? This action cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={onDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={onDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      <Dialog
        open={!!previewUrl}
        onClose={onPreviewClose}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
          onClick={onPreviewClose}
        />
        <div className="relative z-10 flex flex-col items-center justify-center">
          <button
            className="absolute right-2 top-2 z-20 rounded-full bg-white/80 p-2 text-gray-700 hover:bg-white"
            onClick={onPreviewClose}
            aria-label="Close preview"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="flex max-h-[90vh] max-w-[90vw] flex-col items-center rounded-lg bg-white p-4 shadow-2xl">
            {previewUrl && previewType === "image" && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[70vh] max-w-[80vw] rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      </Dialog>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onDeleteClick}
          disabled={isDeleting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-red-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-60"
        >
          <TrashIcon className="h-6 w-6" />
          {isDeleting ? "Deleting..." : "Delete Service"}
        </button>
      </div>
    </>
  );
};
