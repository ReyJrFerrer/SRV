import React from "react";
import { Link } from "react-router-dom";
import {
  StarIcon,
  MapPinIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/solid";
import { EnrichedService } from "../../../hooks/serviceInformation";
import {
  useServiceImages,
  useUserImage,
} from "../../../hooks/useMediaLoader";

// Enhanced service data interface with all fetched information
export interface EnhancedServiceData {
  isVerified?: boolean;
  averageRating: number;
  totalReviews: number;
  mediaUrls: string[]; // URLs to load
}

interface ServiceListItemProps {
  service: EnrichedService;
  serviceData: EnhancedServiceData;
  inCategories?: boolean;
  isGridItem?: boolean;
  retainMobileLayout?: boolean;
}

// Skeleton that mirrors the ServiceListItem layout
export const ServiceListingCardSkeleton: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div
      className={`group relative flex flex-col items-center transition-all duration-300 ${className}`}
    >
      <div
        className={`service-card relative block w-full overflow-hidden rounded-2xl border border-blue-100 bg-white/90 pb-1 shadow-lg`}
      >
        <div className="relative">
          <div className="h-32 w-full animate-pulse rounded-t-2xl bg-gray-200" />
          <div className="absolute left-2 right-2 top-2 flex items-center justify-between">
            <div className="h-8 w-8 animate-pulse rounded-full border border-gray-200 bg-white shadow" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>

        <div className="service-content relative flex flex-grow flex-col p-4">
          <div className="flex-grow">
            <div className="mx-auto mb-2 h-5 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="mx-auto mb-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="mb-2 flex items-center text-sm text-blue-700">
              <div className="mr-1 h-4 w-4 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>

        <div className="mt-2 h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:mt-3 group-hover:h-10">
          <div className="flex h-10 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-200 px-2 shadow-sm">
            <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================== ServiceListItem Component =====================
const ServiceListItem: React.FC<ServiceListItemProps> = React.memo(
  ({
    service,
    serviceData,
    retainMobileLayout = false,
    isGridItem = false,
  }) => {
    // Track image loading state to prevent flash of default image
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageSrc, setImageSrc] = React.useState<string>(
      `/images/ai-sp/${service.category?.slug || "others"}.svg`,
    );

    // Load service images using the hook
    const { images: serviceImages, isLoading: isLoadingServiceImages } =
      useServiceImages(service.id, serviceData.mediaUrls, {
        enabled: !!service.id && serviceData.mediaUrls.length > 0,
      });

    // Load provider avatar using the hook
    const { userImageUrl, isLoading: isLoadingUserImage } = useUserImage(
      service.providerAvatar,
      {
        enabled: !!service.providerAvatar,
      },
    );

    // Determine if images are still loading
    const isLoadingImages = isLoadingServiceImages || isLoadingUserImage;

    // Extract loaded image data URLs
    const loadedServiceImages =
      serviceImages?.map((img) => img.dataUrl).filter((url): url is string => !!url && url.length > 0) || [];

    // Use the passed service data
    const { isVerified, averageRating, totalReviews } = serviceData;

    const serviceRating = {
      average: averageRating,
      count: totalReviews,
      loading: false,
    };

    // Define layout classes based on props
    const itemWidthClass = isGridItem ? "w-full" : "w-full";

    // Determine availability status
    const isAvailable = service.availability?.isAvailable ?? false;
    const availabilityText = isAvailable ? "Available Now" : "Not Available";

    const priceLocationContainerClass = retainMobileLayout
      ? "flex flex-row justify-between items-center mt-auto pt-2 border-t border-gray-100"
      : "flex flex-col items-start sm:flex-row sm:justify-between sm:items-center mt-auto pt-2 border-t border-gray-100";

    const priceMarginClass = !retainMobileLayout ? "mb-0.5 sm:mb-0" : "";

    // Helper function to render rating stars
    const renderRatingStars = (rating: number, size: string = "h-3 w-3") => {
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;
      const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

      return (
        <div className="flex items-center">
          {/* Full stars */}
          {Array.from({ length: fullStars }, (_, i) => (
            <StarIcon key={`full-${i}`} className={`${size} text-yellow-400`} />
          ))}

          {/* Half star */}
          {hasHalfStar && (
            <div className="relative">
              <StarIcon className={`${size} text-gray-300`} />
              <div className="absolute inset-0 w-1/2 overflow-hidden">
                <StarIcon className={`${size} text-yellow-400`} />
              </div>
            </div>
          )}

          {/* Empty stars */}
          {Array.from({ length: emptyStars }, (_, i) => (
            <StarIcon key={`empty-${i}`} className={`${size} text-gray-300`} />
          ))}
        </div>
      );
    };

    // Category icon mapping
    const categoryIconMap: Record<string, string> = {
      "gadget-technicians": "gadget-technicians.svg",
      "beauty-services": "beauty-services.svg",
      "home-services": "home-services.svg",
      "beauty-wellness": "beauty-wellness.svg",
      "automobile-repairs": "automobile-repairs.svg",
      "cleaning-services": "cleaning-services.svg",
      "delivery-errands": "delivery-errands.svg",
      photographer: "photographer.svg",
      tutoring: "tutoring.svg",
      others: "others.svg",
    };

    // Normalize slug for mapping
    const getCategoryIcon = (slug: string | undefined): string => {
      if (!slug) return "/images/categories/others.svg";
      if (categoryIconMap[slug]) {
        return `/images/categories/${categoryIconMap[slug]}`;
      }
      const fallback = `/images/categories/${slug.replace(/-/g, " ")}.svg`;
      return fallback;
    };

    // Helper function to determine the image source with proper priority
    const getImageSource = (): string => {
      // Accept any valid image URL (data:, http(s) or local path)
      const isValidImageUrl = (u?: string | null): u is string =>
        !!u &&
        u.length > 20 &&
        (u.startsWith("data:") || u.startsWith("http") || u.startsWith("/"));

      // Priority 1: Service images (if loaded and valid)
      const firstImage = loadedServiceImages[0];
      if (isValidImageUrl(firstImage)) {
        return firstImage;
      }

      // Priority 2: User avatar (if loaded and valid)
      if (
        !isLoadingImages &&
        isValidImageUrl(userImageUrl) &&
        userImageUrl !== "/default-provider.svg"
      ) {
        return userImageUrl;
      }

      // Priority 3: Category-specific fallback
      if (service.category?.slug) {
        return `/images/ai-sp/${service.category.slug}.svg`;
      }

      // Priority 4: Default fallback
      return "/images/ai-sp/others.svg";
    };

    // Effect to preload image and update state when ready
    React.useEffect(() => {
      const imageSource = getImageSource();

      // Reset loading state when image source changes
      setImageLoaded(false);
      setImageSrc(imageSource);

      // For SVG or already loaded images, mark as loaded immediately
      if (imageSource.endsWith(".svg") || imageSource.startsWith("data:")) {
        setImageLoaded(true);
        return;
      }

      // Preload the image
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        // On error, use fallback and mark as loaded
        setImageSrc("/images/ai-sp/others.svg");
        setImageLoaded(true);
      };
      img.src = imageSource;

      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }, [loadedServiceImages, userImageUrl, service.category?.slug, isLoadingImages]);

    // Show skeleton while data is loading (after all hooks)
    if (isLoadingImages) {
      return <ServiceListingCardSkeleton />;
    }

    return (
      <div className="group relative flex flex-col items-center transition-all duration-300">
        <Link
          to={`/client/service/${service.id}`}
          className={`service-card relative block ${itemWidthClass} overflow-hidden rounded-2xl border border-blue-100 bg-white/90 pb-1 shadow-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02] hover:border-yellow-400 hover:shadow-xl group-hover:pb-2`}
        >
          <div className="relative">
            {/* Image container */}
            <div className="aspect-video w-full bg-blue-50">
              {!imageLoaded && (
                <div className="h-full w-full animate-pulse rounded-t-2xl bg-gray-200" />
              )}
              <img
                src={imageSrc}
                alt={service.title}
                className={`service-image h-full w-full rounded-t-2xl object-cover transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={
                  !imageLoaded ? { position: "absolute", top: 0, left: 0 } : {}
                }
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/ai-sp/others.svg";
                  setImageLoaded(true);
                }}
              />
            </div>
            {/* Category icon and availability badge row */}
            <div className="absolute left-2 right-2 top-2 flex items-center justify-between">
              {/* Category icon as an action button (small yellow circle with icon) */}
              {service.category?.slug && (
                <button
                  aria-label={service.category.name || "Category"}
                  title={service.category.name}
                  className="relative z-10 flex items-center justify-center rounded-full"
                  onClick={(e) => {
                    // stop propagation so clicking the category icon doesn't navigate the card link
                    e.stopPropagation();
                  }}
                >
                  <img
                    src={getCategoryIcon(service.category.slug)}
                    alt={service.category.name || "Category"}
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/images/categories/others.svg";
                    }}
                  />
                </button>
              )}

              {/* Availability badge */}
              <div
                className={`rounded-full px-3 py-0.5 text-xs font-semibold text-white shadow ${isAvailable ? "bg-green-500" : "bg-red-500"}`}
                style={{ marginLeft: "auto" }}
              >
                {availabilityText}
              </div>
            </div>
          </div>

          <div className="service-content relative flex flex-grow flex-col p-4">
            <div className="flex-grow">
              {/* Service title */}
              <p className="mb-1 mt-2 truncate text-lg font-bold leading-tight text-blue-800 transition-colors duration-200 group-hover:text-yellow-500">
                {service.title}
              </p>
              {/* Provider name with verification badge */}
              <p className="mb-2 flex items-center gap-1 truncate text-base font-bold text-blue-700">
                {service.providerName}
                {isVerified && (
                  <CheckBadgeIcon
                    className="ml-1 h-5 w-5 text-blue-500"
                    title="Verified provider"
                  />
                )}
              </p>

              {/* Location info */}
              {service.location &&
                (service.location.city || service.location.address) && (
                  <div className="mb-2 flex items-center text-sm text-blue-700">
                    <MapPinIcon className="mr-1 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {service.location.city}
                      {service.location.state
                        ? `, ${service.location.state}`
                        : ""}
                    </span>
                  </div>
                )}
            </div>

            <div className={priceLocationContainerClass}>
              <div className="mb-1 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className={`text-xl font-bold text-blue-800 ${priceMarginClass} flex items-center gap-2`}
                >
                  {`₱${service.price.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </p>
                <div className="flex items-center text-sm text-blue-800">
                  {serviceRating.count > 0 ? (
                    <>
                      {renderRatingStars(serviceRating.average, "h-5 w-5")}
                      <span className="ml-1 font-semibold">
                        {serviceRating.average.toFixed(1)}
                      </span>
                      <span className="ml-1 text-gray-500">
                        ({serviceRating.count})
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center text-gray-400">
                      {renderRatingStars(0, "h-5 w-5")}
                      <span className="ml-1">(0)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Check service banner with smooth expand animation */}
          <div className="mt-2 h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:mt-3 group-hover:h-10">
            <div className="flex h-10 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-200 px-2 shadow-sm">
              <span className="text-base font-bold tracking-wide text-blue-800">
                Check service
              </span>
            </div>
          </div>
        </Link>
      </div>
    );
  },
);

// ===================== End ServiceListItem Component =====================
export default ServiceListItem;
