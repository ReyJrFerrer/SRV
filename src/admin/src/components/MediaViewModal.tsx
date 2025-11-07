import React, { useState, useEffect } from "react";
import { XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/solid";

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

  // Reset image error when modal opens with new media
  useEffect(() => {
    setImageError(false);
  }, [mediaItem?.id]);

  // Handle download
  const handleDownload = () => {
    if (mediaItem?.url && mediaItem?.fileName) {
      const link = document.createElement("a");
      link.href = mediaItem.url;
      link.download = mediaItem.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle image load error
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
        {/* Header with close and download buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {mediaItem?.fileName || "Media Viewer"}
          </h3>
          <div className="flex items-center space-x-2">
            {mediaItem && !loading && !error && (
              <button
                onClick={handleDownload}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            )}
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
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
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
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
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

