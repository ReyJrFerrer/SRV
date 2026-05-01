import React from "react";
import { PencilIcon, TagIcon } from "@heroicons/react/24/solid";
import Tooltip from "../../common/Tooltip";
import ViewReviewsButton from "../../../components/common/ViewReviewsButton";

interface Props {
  onBack: () => void;
  service: any;
  serviceImages: Array<{ dataUrl?: string | null }> | undefined;
  isLoadingServiceImages: boolean;
  hasActiveBookings: boolean;
  activeBookingsCount: number;
  editTitleCategory: boolean;
  editedTitle: string;
  editedCategory: string;
  categories: Array<{ id: string; name: string }>;
  categoriesLoading: boolean;
  savingTitleCategory: boolean;
  reviewCount: number;
  averageRating: number;
  setEditedTitle: (v: string) => void;
  setEditedCategory: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const HeroSection: React.FC<Props> = ({
  service,
  serviceImages,
  isLoadingServiceImages,
  hasActiveBookings,
  activeBookingsCount,
  editTitleCategory,
  editedTitle,
  editedCategory,
  categories,
  categoriesLoading,
  savingTitleCategory,
  reviewCount,
  averageRating,
  setEditedTitle,
  setEditedCategory,
  onEdit,
  onSave,
  onCancel,
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [currentImageSrc, setCurrentImageSrc] = React.useState<string>("");

  // Get the first image - prefer dataUrl (loaded), fall back to url (raw)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstImage: any =
    serviceImages && serviceImages.length > 0 ? serviceImages[0] : null;
  const imageSrc = firstImage?.dataUrl || firstImage?.url || null;

  // Check if we have a valid image (dataUrl or url)
  const hasValidImage = !!(
    firstImage &&
    (firstImage.dataUrl || firstImage.url)
  );

  // Determine the fallback image source
  const getFallbackImageSrc = () => {
    if (service.category?.slug) {
      return `/images/ai-sp/${service.category.slug}.svg`;
    }
    return "/images/ai-sp/others.svg";
  };

  // Effect to handle image loading and preloading
  React.useEffect(() => {
    const loadImage = async () => {
      if (hasValidImage && imageSrc) {
        // If it's already the current image and loaded, no need to reload
        if (currentImageSrc === imageSrc && imageLoaded) {
          return;
        }

        // Reset loading state
        setImageLoaded(false);
        setCurrentImageSrc(imageSrc);

        // For SVG, data URLs, or remote URLs, handle appropriately
        if (
          imageSrc.endsWith(".svg") ||
          imageSrc.startsWith("data:") ||
          imageSrc.startsWith("http")
        ) {
          // For remote URLs and SVGs, we need to check if they load
          if (imageSrc.startsWith("http")) {
            const img = new Image();
            img.onload = () => {
              setImageLoaded(true);
            };
            img.onerror = () => {
              setCurrentImageSrc(getFallbackImageSrc());
              setImageLoaded(true);
            };
            img.src = imageSrc;
          } else {
            setImageLoaded(true);
          }
          return;
        }

        // Preload the image
        const img = new Image();
        img.onload = () => {
          setImageLoaded(true);
        };
        img.onerror = () => {
          // On error, use fallback
          setCurrentImageSrc(getFallbackImageSrc());
          setImageLoaded(true);
        };
        img.src = imageSrc;
      } else if (!isLoadingServiceImages && !hasValidImage) {
        // Only set fallback when loading is complete AND we confirmed there's no valid image
        const fallback = getFallbackImageSrc();
        if (currentImageSrc !== fallback) {
          setCurrentImageSrc(fallback);
          setImageLoaded(true);
        }
      }
    };

    loadImage();
  }, [
    serviceImages,
    hasValidImage,
    imageSrc,
    isLoadingServiceImages,
    service.category?.slug,
    currentImageSrc,
    imageLoaded,
  ]);

  return (
    <>
      <section className="relative mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:mt-8">
        <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-yellow-50">
          {(isLoadingServiceImages || !currentImageSrc || !imageLoaded) && (
            <div className="absolute inset-0 h-full w-full animate-pulse bg-gray-200"></div>
          )}

          {/* Show image once we have a source and it's loaded */}
          {currentImageSrc && (
            <img
              src={currentImageSrc}
              alt="Service Hero"
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={
                !imageLoaded ? { position: "absolute", top: 0, left: 0 } : {}
              }
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = getFallbackImageSrc();
                setImageLoaded(true);
              }}
            />
          )}

          <div className="absolute inset-0 bg-transparent"></div>
        </div>

        <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
          {savingTitleCategory ? (
            // Skeleton UI when saving
            <div className="min-w-0 flex-1 animate-pulse">
              <div className="mb-4 h-8 w-3/4 rounded-lg bg-gray-200"></div>
              <div className="h-6 w-1/2 rounded-lg bg-gray-200"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2
                      className="break-words text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl"
                      title={service.title}
                    >
                      {service.title}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        service.status === "Available"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                      title={
                        service.status === "Available"
                          ? "Service is available"
                          : "Service is unavailable"
                      }
                    >
                      {service.status === "Available"
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 sm:text-base">
                    <TagIcon className="h-5 w-5 text-yellow-500" />
                    {service.category.name}
                  </div>
                </div>

                <Tooltip
                  content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                  showWhenDisabled={hasActiveBookings}
                >
                  <button
                    onClick={hasActiveBookings ? undefined : onEdit}
                    className={`shrink-0 rounded-full bg-gray-50 p-3 transition-colors hover:bg-yellow-50 hover:text-yellow-600 ${hasActiveBookings ? "cursor-not-allowed opacity-50" : ""}`}
                    aria-label="Edit title and category"
                    disabled={hasActiveBookings}
                  >
                    <PencilIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </Tooltip>
              </div>

              {editTitleCategory && (
                <div className="mt-2 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-lg font-bold text-gray-900 focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="Service Title"
                    maxLength={40}
                  />
                  <select
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-yellow-500 focus:ring-yellow-500"
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      {categoriesLoading
                        ? "Loading categories..."
                        : "Select Category"}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={onCancel}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Cancel editing title and category"
                      disabled={savingTitleCategory}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onSave}
                      className="flex items-center justify-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Save title and category"
                      disabled={savingTitleCategory}
                    >
                      {savingTitleCategory ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Minimal Review Section */}
              <div className="mt-2 flex items-center border-t border-gray-100 pt-6">
                <ViewReviewsButton
                  serviceId={service.id}
                  averageRating={averageRating}
                  totalReviews={reviewCount}
                  variant="card"
                  className="w-full max-w-sm"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default HeroSection;
