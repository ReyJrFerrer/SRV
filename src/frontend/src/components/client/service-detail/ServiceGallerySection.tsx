import React from "react";
import {
  CameraIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useServiceImages } from "../../../hooks/useMediaLoader";

export const ServiceImageModal: React.FC<{
  src: string;
  onClose: () => void;
}> = ({ src, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    onClick={onClose}
  >
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <img
        src={src}
        alt="Service Gallery Large"
        className="max-h-[80vh] max-w-[90vw] rounded-2xl border-4 border-white bg-white shadow-2xl"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/default-provider.svg";
        }}
      />
      <button
        className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
        onClick={onClose}
        aria-label="Close"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>
    </div>
  </div>
);

const ServiceGallerySection: React.FC<{
  serviceId: string;
  imageUrls: string[];
}> = ({ serviceId, imageUrls }) => {
  const { images, isLoading, errorCount } = useServiceImages(
    serviceId,
    imageUrls,
  );
  const [modalImage, setModalImage] = React.useState<string | null>(null);

  const displayImages = images?.slice(0, 5) || [];

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
        <CameraIcon className="h-6 w-6 text-blue-600" />
        Service Gallery
      </h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: Math.min(imageUrls.length || 4, 5) }).map(
            (_, index) => (
              <div
                key={index}
                className="flex aspect-square animate-pulse items-center justify-center rounded-lg bg-gray-200"
              >
                <div className="h-8 w-8 rounded bg-gray-300"></div>
              </div>
            ),
          )}
        </div>
      ) : displayImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {displayImages.map((image, index) => (
            <div
              key={index}
              className="group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-blue-100 bg-gray-50 shadow transition-all duration-200 focus-within:scale-105 hover:z-10 hover:scale-105"
              onClick={() => image.dataUrl && setModalImage(image.dataUrl)}
              tabIndex={0}
              aria-label={`Inspect service image ${index + 1}`}
              role="button"
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && image.dataUrl)
                  setModalImage(image.dataUrl);
              }}
            >
              {image.error ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                  <CameraIcon className="h-10 w-10 text-gray-300" />
                  <span className="text-xs text-red-400">Failed to load</span>
                </div>
              ) : image.dataUrl ? (
                <div className="relative h-full w-full">
                  <img
                    src={image.dataUrl}
                    alt={`Service gallery image ${index + 1}`}
                    className="h-full w-full rounded-xl border-4 border-yellow-200 object-cover transition-all duration-200 group-hover:border-blue-700 group-focus:border-blue-700"
                    loading="lazy"
                    tabIndex={-1}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/default-provider.svg";
                    }}
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-white/80 p-1 text-blue-700 shadow transition-transform group-hover:scale-110 group-focus:scale-110">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </span>
                </div>
              ) : (
                <div className="flex h-full w-full animate-pulse items-center justify-center bg-gray-200">
                  <div className="h-6 w-6 rounded bg-gray-300"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-gray-100 bg-gray-50"
            >
              <CameraIcon className="h-10 w-10 text-gray-300" />
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-gray-500">
        {displayImages.length > 0
          ? `Showing ${displayImages.length} of ${imageUrls.length} service images${errorCount > 0 ? ` (${errorCount} failed to load)` : ""}`
          : "The service provider will add photos of their work soon."}
      </p>
      {modalImage && (
        <ServiceImageModal
          src={modalImage}
          onClose={() => setModalImage(null)}
        />
      )}
    </div>
  );
};

export default ServiceGallerySection;
