// Imports
import React from "react";
import { Link } from "react-router-dom";
import {
  StarIcon,
  MapPinIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/solid";
// ReputationBadge removed per request; use local color mapping for the top-right badge
import { EnrichedService } from "../../../hooks/serviceInformation";
import { useServiceImages, useUserImage } from "../../../hooks/useMediaLoader";

// Types
export interface EnhancedServiceData {
  isVerified?: boolean;
  averageRating: number;
  totalReviews: number;
  mediaUrls: string[];
  reputationScore?: number;
}

interface ServiceListItemProps {
  service: EnrichedService;
  serviceData: EnhancedServiceData;
  inCategories?: boolean;
  isGridItem?: boolean;
  retainMobileLayout?: boolean;
}

// Skeleton
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
          <div className="absolute top-2 right-2 left-2 flex items-center justify-between">
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

// Component
const ServiceListItem: React.FC<ServiceListItemProps> = React.memo(
  ({
    service,
    serviceData,
    retainMobileLayout = false,
    isGridItem = false,
  }) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageSrc, setImageSrc] = React.useState<string>(
      `/images/ai-sp/${service.category?.slug || "others"}.svg`,
    );
    const [showContent, setShowContent] = React.useState(false);
    const mountTimeRef = React.useRef<number>(Date.now());
    const skeletonShownAtRef = React.useRef<number | null>(null);

    const { images: serviceImages, isLoading: isLoadingServiceImages } =
      useServiceImages(service.id, serviceData.mediaUrls, {
        enabled: !!service.id && serviceData.mediaUrls.length > 0,
      });

    const { userImageUrl, isLoading: isLoadingUserImage } = useUserImage(
      service.providerAvatar,
      {
        enabled: !!service.providerAvatar,
      },
    );

    const isLoadingImages = isLoadingServiceImages || isLoadingUserImage;

    const loadedServiceImages =
      serviceImages
        ?.map((img) => img.dataUrl)
        .filter((url): url is string => !!url && url.length > 0) || [];

    const { isVerified, averageRating, totalReviews } = serviceData;

    const serviceRating = {
      average: averageRating,
      count: totalReviews,
      loading: false,
    };

    const itemWidthClass = isGridItem ? "w-full" : "w-full";

    const priceLocationContainerClass = retainMobileLayout
      ? "flex flex-row justify-between items-center mt-auto pt-2 border-t border-gray-100"
      : "flex flex-col items-start sm:flex-row sm:justify-between sm:items-center mt-auto pt-2 border-t border-gray-100";

    const priceMarginClass = !retainMobileLayout ? "mb-0.5 sm:mb-0" : "";

    const renderRatingStars = (rating: number, size: string = "h-3 w-3") => {
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;
      const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

      return (
        <div className="flex items-center">
          {Array.from({ length: fullStars }, (_, i) => (
            <StarIcon key={`full-${i}`} className={`${size} text-yellow-400`} />
          ))}
          {hasHalfStar && (
            <div className="relative">
              <StarIcon className={`${size} text-gray-300`} />
              <div className="absolute inset-0 w-1/2 overflow-hidden">
                <StarIcon className={`${size} text-yellow-400`} />
              </div>
            </div>
          )}
          {Array.from({ length: emptyStars }, (_, i) => (
            <StarIcon key={`empty-${i}`} className={`${size} text-gray-300`} />
          ))}
        </div>
      );
    };

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

    const getCategoryIcon = (slug: string | undefined): string => {
      if (!slug) return "/images/categories/others.svg";
      if (categoryIconMap[slug]) {
        return `/images/categories/${categoryIconMap[slug]}`;
      }
      const fallback = `/images/categories/${slug.replace(/-/g, " ")}.svg`;
      return fallback;
    };

    const getImageSource = (): string => {
      const isValidImageUrl = (u?: string | null): u is string =>
        !!u &&
        u.length > 20 &&
        (u.startsWith("data:") || u.startsWith("http") || u.startsWith("/"));

      const firstImage = loadedServiceImages[0];
      if (isValidImageUrl(firstImage)) {
        return firstImage;
      }

      if (
        !isLoadingImages &&
        isValidImageUrl(userImageUrl) &&
        userImageUrl !== "/default-provider.svg"
      ) {
        return userImageUrl;
      }

      if (service.category?.slug) {
        return `/images/ai-sp/${service.category.slug}.svg`;
      }

      return "/images/ai-sp/others.svg";
    };

    React.useEffect(() => {
      const imageSource = getImageSource();

      setImageLoaded(false);
      setImageSrc(imageSource);

      if (imageSource.endsWith(".svg") || imageSource.startsWith("data:")) {
        setImageLoaded(true);
        return;
      }

      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageSrc("/images/ai-sp/others.svg");
        setImageLoaded(true);
      };
      img.src = imageSource;

      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }, [
      loadedServiceImages,
      userImageUrl,
      service.category?.slug,
      isLoadingImages,
    ]);

    React.useEffect(() => {
      if (showContent) return;
      const isContentReady = !isLoadingImages && imageLoaded;
      if (!isContentReady) return;

      const timeSinceMount = Date.now() - mountTimeRef.current;
      const FAST_LOAD_THRESHOLD = 200;
      const MIN_SKELETON_DURATION = 400;

      if (timeSinceMount < FAST_LOAD_THRESHOLD) {
        setShowContent(true);
        return;
      }

      if (skeletonShownAtRef.current === null) {
        skeletonShownAtRef.current = Date.now();
      }
      const skeletonDuration = Date.now() - skeletonShownAtRef.current;
      if (skeletonDuration < MIN_SKELETON_DURATION) {
        const remainingTime = MIN_SKELETON_DURATION - skeletonDuration;
        const timer = setTimeout(() => {
          setShowContent(true);
        }, remainingTime);
        return () => clearTimeout(timer);
      } else {
        setShowContent(true);
      }
    }, [isLoadingImages, imageLoaded, showContent]);

    // Show skeleton while content is not ready
    if (!showContent) {
      return <ServiceListingCardSkeleton />;
    }

    return (
      <div className="group relative flex flex-col items-center transition-all duration-300">
        <Link
          to={`/client/service/${service.id}`}
          className={`service-card relative block ${itemWidthClass} overflow-hidden rounded-2xl border border-blue-100 bg-white/90 pb-1 shadow-lg transition-all duration-200 ease-in-out group-hover:pb-2 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-yellow-400 hover:shadow-xl`}
        >
          <div className="relative">
            <div className="aspect-video w-full rounded-t-2xl bg-blue-50">
              <img
                src={imageSrc}
                alt={service.title}
                className={`service-image relative z-10 h-full w-full rounded-t-2xl object-cover transition-opacity duration-1000 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/ai-sp/others.svg";
                  setImageLoaded(true);
                }}
              />
            </div>
            <div className="absolute top-2 right-2 left-2 z-20 flex items-center justify-between">
              <div className="flex items-center">
                {service.category?.slug && (
                  <button
                    aria-label={service.category.name || "Category"}
                    title={service.category.name}
                    className="relative z-10 flex items-center justify-center rounded-full"
                    onClick={(e) => {
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
              </div>

              {typeof serviceData.reputationScore === "number" &&
                (() => {
                  const score = Math.round(serviceData.reputationScore || 0);
                  // Color mapping based on reputation ranges:
                  // 0.00 - 20.00 => Building Trust (red)
                  // 20.01 - 50.00 => Reliable (yellow)
                  // 50.01 - 80.00 => Trusted (light blue)
                  // 80.01 - 100.00 => Premium (green)
                  const strongBg =
                    score > 80
                      ? "bg-green-600"
                      : score > 50
                        ? "bg-sky-500"
                        : score > 20
                          ? "bg-yellow-500"
                          : "bg-red-600";

                  return (
                    <div
                      title={`Reputation: ${score}`}
                      className={`z-10 flex items-center justify-center ${strongBg} rounded-full px-3 py-1 text-sm font-semibold text-white`}
                    >
                      {`Reputation: ${score}`}
                    </div>
                  );
                })()}
            </div>
          </div>

          <div className="service-content relative flex flex-grow flex-col p-4">
            <div className="flex-grow">
              <div className="mb-2 flex flex-col items-start gap-x-2 gap-y-1 text-base text-blue-700">
                <p className="mt-2 mb-1 truncate text-lg leading-tight font-bold text-blue-800 transition-colors duration-200 group-hover:text-yellow-500">
                  {service.title}
                </p>
                <p className="flex items-center gap-1 truncate font-bold">
                  {service.providerName}
                  {isVerified && (
                    <CheckBadgeIcon
                      className="ml-1 h-5 w-5 flex-shrink-0 text-blue-500"
                      title="Verified provider"
                    />
                  )}
                </p>
                {/* Reputation shown in top-right badge; removed inline score below name per UX request */}
              </div>
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

export default ServiceListItem;
