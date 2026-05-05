// Imports
import React, { useState, useEffect, useMemo } from "react";
import ServiceListItem from "./ServiceListingCard";
import {
  EnrichedService,
  useAllServicesWithProviders,
} from "../../../hooks/serviceInformation";
import { useReputation } from "../../../hooks/useReputation";
import { getCategoryImage } from "../../../utils/serviceHelpers";
import reviewCanisterService from "../../../services/reviewCanisterService";
import serviceCanisterService from "../../../services/serviceCanisterService";
import EmptyState from "../../common/EmptyState";

// Types
interface ServicesListProps {
  className?: string;
}

const ServicesList: React.FC<ServicesListProps> = ({ className = "" }) => {
  const { services, loading, error } = useAllServicesWithProviders();
  const { fetchUserReputation } = useReputation();

  const ITEMS_PER_PAGE = 10;
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  interface ServiceData {
    isVerified?: boolean;
    averageRating: number;
    totalReviews: number;
    mediaUrls: string[]; // URLs to be loaded by ServiceListingCard
    reputationScore?: number | undefined;
  }

  const [serviceDataMap, setServiceDataMap] = useState<
    Record<string, ServiceData>
  >({});

  useEffect(() => {
    const fetchServiceData = async () => {
      const servicesToDisplay = services.slice(0, displayCount);
      const serviceIds = servicesToDisplay.map((s) => s.id);
      const toFetch = serviceIds.filter((id) => !serviceDataMap[id]);

      if (toFetch.length === 0) return;
      const newEntries: Record<string, ServiceData> = {};
      toFetch.forEach((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        newEntries[serviceId] = {
          isVerified: false,
          averageRating: 0,
          totalReviews: 0,
          mediaUrls: service?.media || [],
        };
      });

      setServiceDataMap((prev) => ({ ...prev, ...newEntries }));

      const fetchedData = await Promise.all(
        toFetch.map(async (serviceId) => {
          try {
            const service = services.find((s) => s.id === serviceId);
            const serviceDetails =
              await serviceCanisterService.getService(serviceId);
            const reviews =
              await reviewCanisterService.getServiceReviews(serviceId);
            const visibleReviews = reviews.filter(
              (r: any) => r.status === "Visible",
            );
            const averageRating =
              visibleReviews.length > 0
                ? visibleReviews.reduce(
                    (acc: number, r: any) => acc + r.rating,
                    0,
                  ) / visibleReviews.length
                : 0;
            let reputationScore: number | undefined = undefined;
            try {
              if (service?.providerId) {
                const rep = await fetchUserReputation(service.providerId);
                if (rep && typeof rep.trustScore === "number") {
                  reputationScore = Math.round(rep.trustScore);
                }
              }
            } catch (e) {
              // ignore
            }

            const result = {
              serviceId,
              data: {
                isVerified: (serviceDetails as any)?.isVerified || false,
                averageRating,
                totalReviews: visibleReviews.length,
                mediaUrls: service?.media || [],
                reputationScore,
              },
            };

            return result;
          } catch (err) {
            const service = services.find((s) => s.id === serviceId);
            const fallback = {
              serviceId,
              data: {
                isVerified: false,
                averageRating: 0,
                totalReviews: 0,
                mediaUrls: service?.media || [],
                reputationScore: undefined,
              },
            };
            return fallback;
          }
        }),
      );

      const updatedData: Record<string, ServiceData> = {};
      fetchedData.forEach(({ serviceId, data }) => {
        updatedData[serviceId] = data;
      });

      setServiceDataMap((prev) => ({ ...prev, ...updatedData }));
    };

    if (services.length > 0) {
      fetchServiceData();
    }
  }, [services, displayCount, fetchUserReputation]); // Only depend on services and displayCount

  const enhanceService = useMemo(
    () =>
      (service: EnrichedService): EnrichedService => ({
        ...service,
        heroImage: getCategoryImage(service.category.name),
        rating: {
          average: service.rating.average ?? 0,
          count: service.rating.count ?? 0,
        },
        price: {
          amount: service.price.amount,
          unit: service.price.unit,
          display: `₱${service.price.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        },
      }),
    [],
  );

  const servicesWithData = useMemo(() => {
    const servicesToShow = services.slice(0, displayCount);

    return servicesToShow.map((service) => {
      const serviceData = serviceDataMap[service.id] || {
        isVerified: false,
        averageRating: service.rating?.average || 0,
        totalReviews: service.rating?.count || 0,
        mediaUrls: service.media || [],
      };

      return {
        service: enhanceService(service),
        serviceData,
      };
    });
  }, [services, serviceDataMap, enhanceService, displayCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, services.length),
      );
      setIsLoadingMore(false);
    }, 300);
  };

  const hasMore = displayCount < services.length;

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <h2 className="mb-4 text-lg font-bold sm:text-xl">Book Now!</h2>
        <p className="text-red-500">Error loading services: {error.message}</p>
      </div>
    );
  }

  return (
    <div
      data-tour="client-book-now"
      className={`w-full max-w-full ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">Book Now!</h2>
      </div>

      {!loading && services.length === 0 ? (
        <div className="mb-8 mt-8">
          <EmptyState
            icon={
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            }
            title="No services found"
            message="There are currently no services available in your selected location."
            actionLabel="Explore Categories"
            onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {servicesWithData.map(({ service, serviceData }) => (
            <div key={service.id}>
              <ServiceListItem service={service} serviceData={serviceData} />
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!loading && services.length > 0 && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Loading...</span>
              </div>
            ) : (
              <span>Load More Services</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ServicesList;
