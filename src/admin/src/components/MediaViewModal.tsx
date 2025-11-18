import React, { useState, useEffect } from "react";
import {
  ExclamationTriangleIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

interface MediaViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: {
    id: string;
    url: string;
    fileName: string;
    contentType: string;
  } | null;
  loading?: boolean;
  error?: string | null;
}

export const MediaViewModal: React.FC<MediaViewModalProps> = ({
  isOpen,
  onClose,
  mediaItem,
  loading = false,
  error = null,
}) => {
  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    setImageError(false);
  }, [mediaItem?.id]);

  const handleImageError = () => {
    setImageError(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {mediaItem?.fileName || "Media Viewer"}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal content */}
        <div className="p-4">
          {loading ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500">Loading media...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-red-500">
                  <ExclamationTriangleIcon className="mx-auto h-16 w-16" />
                </div>
                <p className="text-sm font-medium text-red-600">
                  Failed to load media
                </p>
                <p className="mt-2 text-xs text-gray-500">{error}</p>
              </div>
            </div>
          ) : mediaItem && imageError ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-gray-400">
                  <PhotoIcon className="mx-auto h-16 w-16" />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  Image failed to load
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  The image may be corrupted or unavailable
                </p>
              </div>
            </div>
          ) : mediaItem ? (
            <img
              src={mediaItem.url}
              alt={mediaItem.fileName}
              className="max-h-[70vh] max-w-full rounded object-contain"
              onError={handleImageError}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};
