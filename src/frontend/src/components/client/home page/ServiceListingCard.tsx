import React from "react";
import { Link } from "react-router-dom";
import {
  StarIcon,
  MapPinIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/solid";
import { EnrichedService } from "../../../hooks/serviceInformation";

// Enhanced service data interface with all fetched information
export interface EnhancedServiceData {
  isVerified?: boolean;
  averageRating: number;
  totalReviews: number;
  serviceImages: string[];
  userImageUrl: string | null;
  isLoadingImages: boolean;
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
    // Use the passed service data instead of fetching
    const {
      isVerified,
      averageRating,
      totalReviews,
      serviceImages,
      userImageUrl,
      isLoadingImages,
    } = serviceData;

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
        (u.startsWith("data:") || u.startsWith("http") || u.startsWith("/")) &&
        u.length > 20;

      // Priority 1: Service images (if loaded and valid)
      const firstImage = serviceImages[0];
      if (isValidImageUrl(firstImage)) {
        return firstImage;
      }

      // Priority 2: User avatar (if loaded and valid)
      if (!isLoadingImages && isValidImageUrl(userImageUrl)) {
        return userImageUrl;
      }

      // Priority 3: Category-specific fallback
      if (service.category?.slug) {
        return `/images/ai-sp/${service.category.slug}.svg`;
      }

      // Priority 4: Default fallback
      return "/images/ai-sp/others.svg";
    };
    return (
      <div className="group relative flex flex-col items-center transition-all duration-300">
        <Link
          to={`/client/service/${service.id}`}
          className={`service-card relative block ${itemWidthClass} overflow-hidden rounded-2xl border border-blue-100 bg-white/90 pb-1 shadow-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02] hover:border-yellow-400 hover:shadow-xl group-hover:pb-2`}
        >
          <div className="relative">
            {/* Image container */}
            <div className="aspect-video w-full bg-blue-50">
              <img
                src={getImageSource()}
                alt={service.title}
                className="service-image h-full w-full rounded-t-2xl object-cover transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/ai-sp/others.svg";
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
