import React from "react";
import { Link } from "react-router-dom";
import {
  StarIcon,
  MapPinIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/solid";
import useServiceById from "../../hooks/serviceDetail";
import { useServiceReviews } from "../../hooks/reviewManagement";
import { EnrichedService } from "../../hooks/serviceInformation";
import { useUserImage } from "../../hooks/useMediaLoader";
import { useServiceImages } from "../../hooks/useMediaLoader";

interface ServiceListItemProps {
  service: EnrichedService;
  inCategories?: boolean;
  isGridItem?: boolean;
  retainMobileLayout?: boolean;
}

// ===================== ServiceListItem Component =====================
const ServiceListItem: React.FC<ServiceListItemProps> = React.memo(
  ({ service, isGridItem = false, retainMobileLayout = false }) => {
    // Fetch the latest service data to get isVerified
    const { service: fetchedService } = useServiceById(service.id);
    const isVerified = fetchedService?.isVerified;
    // Use the same logic as ServiceDetailPageComponent for review count
    const { reviews = [], getAverageRating } = useServiceReviews(service.id);
    const visibleReviews = Array.isArray(reviews)
      ? reviews.filter((r) => r.status === "Visible")
      : [];
    const totalReviews =
      visibleReviews.length > 0
        ? visibleReviews.length
        : typeof service.rating?.count === "number"
          ? service.rating.count
          : 0;
    const averageRating =
      visibleReviews.length > 0
        ? getAverageRating(visibleReviews)
        : service.rating?.average || 0;
    const serviceRating = {
      average: averageRating,
      count: totalReviews,
      loading: false,
    };
    const { images } = useServiceImages(service.id);

    // Define layout classes based on props
    const itemWidthClass = isGridItem
      ? "w-full" // Full width for grid items
      : "w-full"; // Default width for list items

    // Determine availability status (simplified since we may not have full availability data)
    const isAvailable = service.availability?.isAvailable ?? false;
    const availabilityText = isAvailable ? "Available Now" : "Not Available";

    const priceLocationContainerClass = retainMobileLayout
      ? "flex flex-row justify-between items-center mt-auto pt-2 border-t border-gray-100" // Price and Location on same line
      : "flex flex-col items-start sm:flex-row sm:justify-between sm:items-center mt-auto pt-2 border-t border-gray-100"; // Default responsive

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
      // Handle special cases for mapping
      if (categoryIconMap[slug]) {
        return `/images/categories/${categoryIconMap[slug]}`;
      }
      // Fallback: try replacing hyphens with spaces and capitalize
      const fallback = `/images/categories/${slug.replace(/-/g, " ")}.svg`;
      return fallback;
    };
    const { userImageUrl, refetch } = useUserImage(service.providerAvatar);
    refetch();
    return (
      <Link
        to={`/client/service/${service.id}`}
        className={`service-card block ${itemWidthClass} group flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white/90 shadow-lg transition-all duration-200 hover:border-yellow-400`}
      >
        <div className="relative">
          {/* Image container */}
          <div className="aspect-video w-full bg-blue-50">
            <img
              src={
                images[0]?.url ||
                (userImageUrl &&
                  userImageUrl !== "/default-avatar.png" &&
                  userImageUrl !== "" &&
                  userImageUrl !== undefined)
                  ? userImageUrl
                  : service.category?.slug
                    ? `/images/ai-sp/${service.category.slug}.svg`
                    : "/images/ai-sp/others.svg"
              }
              alt={service.title}
              className="service-image h-full w-full rounded-t-2xl object-cover transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/images/ai-sp/others.svg";
              }}
            />
          </div>
          {/* Category icon and availability badge row */}
          <div className="pointer-events-none absolute top-2 right-2 left-2 flex items-center justify-between">
            {/* Category icon (if available) */}
            {service.category?.slug && (
              <img
                src={getCategoryIcon(service.category.slug)}
                alt={service.category.name || "Category"}
                className="h-8 w-8 rounded-full border border-gray-200 bg-white shadow"
                title={service.category.name}
                onError={(e) => {
                  e.currentTarget.src = "/images/categories/others.svg";
                }}
              />
            )}
            {/* Availability badge */}
            <div
              className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white shadow ${isAvailable ? "bg-green-500" : "bg-red-500"}`}
              style={{ marginLeft: "auto" }}
            >
              {availabilityText}
            </div>
          </div>
        </div>

        <div className="service-content relative flex flex-grow flex-col p-4">
          <div className="flex-grow">
            {/* Service title at the top */}
            <p className="mb-1 truncate text-lg leading-tight font-bold text-blue-800 transition-colors duration-200 group-hover:text-yellow-500">
              {service.title}
            </p>
            {/* Provider name below service title, with blue check if verified */}
            <p className="mb-2 flex items-center gap-1 truncate text-base text-blue-700">
              {service.providerName}
              {isVerified && (
                <CheckBadgeIcon
                  className="ml-1 h-5 w-5 text-blue-500"
                  title="Verified provider"
                />
              )}
            </p>

            {/* Location info - city/address if available */}
            {service.location &&
              (service.location.city || service.location.address) && (
                <div className="mb-2 flex items-center text-sm text-blue-700">
                  <MapPinIcon className="mr-1 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {service.location.city}
                    {service.location.state
                      ? `, ${service.location.state}`
                      : ""}
                    {/* {service.location.serviceDistance &&
                      service.location.serviceDistanceUnit && (
                        <>
                          {" "}
                          ( {service.location.serviceDistance}{" "}
                          {service.location.serviceDistanceUnit} )
                        </>
                      )} */}
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
        {/* 'Check service' banner: overlaps the bottom of the card on hover, no extra space when not hovered */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 flex h-10 w-full items-center justify-center rounded-b-2xl border-t border-yellow-300 bg-yellow-200 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="text-base font-bold tracking-wide text-blue-800">
            Check service
          </span>
        </div>
      </Link>
    );
  },
);

// ===================== End ServiceListItem Component =====================
export default ServiceListItem;
