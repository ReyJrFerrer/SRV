import React from "react";
import {
  CameraIcon,
} from "@heroicons/react/24/solid";

export interface MediaItem {
  dataUrl?: string | null;
  url?: string | null;
  error?: any;
  validationStatus?: "Pending" | "Validated" | "Rejected";
}

interface MediaGalleryProps {
  title: string;
  icon: React.ReactNode;
  items: MediaItem[];
  isLoading: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  onItemClick: (url: string, type: "image" | "pdf") => void;
  isPdfFile: (url: string) => boolean;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  title,
  icon,
  items,
  isLoading,
  emptyIcon,
  emptyMessage = "No items available",
  onItemClick,
  isPdfFile,
}) => {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
          {icon}
          {title}
        </h3>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-blue-300">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600"></div>
            <p>Loading...</p>
          </div>
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((item: any, index: number) => {
            const url = item.dataUrl || item.url;
            if (!url) return null;

            return (
              <button
                key={index}
                className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-blue-100 bg-blue-50 shadow-sm focus:outline-none"
                onClick={() => {
                  onItemClick(url, isPdfFile(url) ? "pdf" : "image");
                }}
                type="button"
                tabIndex={0}
                aria-label={`Inspect ${title.toLowerCase()} ${index + 1}`}
              >
                {item.error ? (
                  <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                    {icon}
                    <p className="mt-1">Failed to load</p>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`${title} ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-blue-300">
            {emptyIcon || <CameraIcon className="mx-auto mb-4 h-12 w-12" />}
            <p>{emptyMessage}</p>
          </div>
        </div>
      )}
    </section>
  );
};
