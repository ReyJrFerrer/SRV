import React from "react";
import {
  PhotoIcon,
  PencilIcon,
  DocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import Tooltip from "../../common/Tooltip";

interface TempImage {
  url: string;
  dataUrl: string | null;
  error: string | null;
  isNew?: boolean;
}

interface ImageItem {
  url?: string;
  dataUrl?: string | null;
  error?: string | null;
}

interface Props {
  hasActiveBookings: boolean;
  activeBookingsCount: number;
  editImages: boolean;
  tempDisplayImages: TempImage[];
  serviceImages?: ImageItem[];
  uploadError: string | null;
  uploadingImages: boolean;
  savingImages: boolean;
  onToggleEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onPreview: (url: string, type: "image" | "pdf") => void;
  isPdfFile: (url: string) => boolean;
}

const ImagesSection: React.FC<Props> = ({
  hasActiveBookings,
  activeBookingsCount,
  editImages,
  tempDisplayImages,
  serviceImages,
  uploadError,
  uploadingImages,
  savingImages,
  onToggleEdit,
  onCancel,
  onSave,
  onUpload,
  onRemove,
  onPreview,
  isPdfFile,
}) => {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-md flex items-center gap-2 font-bold text-gray-900 lg:text-xl">
          <PhotoIcon className="h-6 w-6 text-yellow-600" />
          Service Images
        </h3>
        <Tooltip
          content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
          showWhenDisabled={hasActiveBookings}
        >
          <button
            onClick={hasActiveBookings ? undefined : onToggleEdit}
            className={`rounded-full p-2 transition-colors hover:bg-gray-100 ${hasActiveBookings ? "cursor-not-allowed opacity-50" : ""}`}
            aria-label="Edit images"
            disabled={hasActiveBookings}
          >
            <PencilIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </Tooltip>
      </div>

      {savingImages ? (
        // Skeleton UI when saving
        <div className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-video rounded-lg bg-gray-200"></div>
          ))}
        </div>
      ) : editImages ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {tempDisplayImages.length > 0 ? (
              tempDisplayImages.map((image, index) => (
                <div
                  key={index}
                  className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm"
                >
                  {image.error ? (
                    <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                      <PhotoIcon className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-1">Failed to load</p>
                    </div>
                  ) : image.dataUrl ? (
                    <img
                      src={image.dataUrl}
                      alt={`Service image ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-yellow-500"></div>
                    </div>
                  )}
                  <button
                    onClick={() => onRemove(index)}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    aria-label="Remove image"
                    type="button"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  {image.isNew && (
                    <div className="absolute left-1 top-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                      NEW
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-gray-400">
                <PhotoIcon className="mb-2 h-12 w-12" />
                <span className="text-base">No images uploaded yet.</span>
              </div>
            )}
            {tempDisplayImages.length < 10 && (
              <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-yellow-600 transition-colors hover:border-blue-400 hover:bg-gray-100">
                <PhotoIcon className="mb-1 h-8 w-8" />
                <span className="text-xs">Add Image</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  multiple
                  className="hidden"
                  onChange={onUpload}
                  disabled={uploadingImages}
                />
              </label>
            )}
          </div>
          {uploadError && (
            <div className="mt-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
              {uploadError}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={uploadingImages || savingImages}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={uploadingImages || savingImages}
            >
              {(uploadingImages || savingImages) && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {uploadingImages || savingImages ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {serviceImages && serviceImages.length > 0 ? (
            serviceImages.map((image: any, index: number) => {
              const url = image.dataUrl || image.url;
              if (!url) return null;
              return (
                <button
                  key={index}
                  className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm focus:outline-none"
                  onClick={() =>
                    onPreview(url, isPdfFile(url) ? "pdf" : "image")
                  }
                  type="button"
                  tabIndex={0}
                  aria-label="Inspect image"
                >
                  {image.error ? (
                    <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                      <PhotoIcon className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-1">Failed to load</p>
                    </div>
                  ) : isPdfFile(url) ? (
                    <div className="flex flex-col items-center justify-center">
                      <DocumentIcon className="h-12 w-12 text-red-500" />
                      <span className="mt-1 text-xs text-gray-700">
                        View PDF
                      </span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Service image ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </button>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-gray-400">
              <PhotoIcon className="mb-2 h-12 w-12" />
              <span className="text-base">No images uploaded yet.</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ImagesSection;
