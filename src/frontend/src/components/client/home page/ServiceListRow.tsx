import React, { useState, useEffect, useMemo } from "react";
import ServiceListItem from "./ServiceListingCard";
import {
  EnrichedService,
  useAllServicesWithProviders,
} from "../../../hooks/serviceInformation";
import { getCategoryImage } from "../../../utils/serviceHelpers";
import reviewCanisterService from "../../../services/reviewCanisterService";
import serviceCanisterService from "../../../services/serviceCanisterService";

interface ServicesListProps {
  className?: string;
}

const ServicesList: React.FC<ServicesListProps> = ({ className = "" }) => {
  // Use the realtime hook for live updates from Firestore
  const { services, loading, error } = useAllServicesWithProviders();

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Service data state map with proper typing
  interface ServiceData {
    isVerified?: boolean;
    averageRating: number;
    totalReviews: number;
    mediaUrls: string[]; // URLs to be loaded by ServiceListingCard
  }

  const [serviceDataMap, setServiceDataMap] = useState<
    Record<string, ServiceData>
  >({});

  // Effect to fetch service data for all services
  useEffect(() => {
    const fetchServiceData = async () => {
      // Only fetch data for services that will be displayed
      const servicesToDisplay = services.slice(0, displayCount);
      const serviceIds = servicesToDisplay.map((s) => s.id);

      // Only fetch data for services we haven't fetched yet
      const toFetch = serviceIds.filter((id) => !serviceDataMap[id]);

      if (toFetch.length === 0) return;

      // Initialize loading state for new services
      const newEntries: Record<string, ServiceData> = {};
      toFetch.forEach((serviceId) => {
        // Find the service to get media URLs
        const service = services.find((s) => s.id === serviceId);
        newEntries[serviceId] = {
          isVerified: false,
          averageRating: 0,
          totalReviews: 0,
          mediaUrls: service?.media || [],
        };
      });

      // Update state with loading placeholders
      setServiceDataMap((prev) => ({ ...prev, ...newEntries }));

      // Fetch data for all new services
      const fetchedData = await Promise.all(
        toFetch.map(async (serviceId) => {
          try {
            // Find the service to get media URLs
            const service = services.find((s) => s.id === serviceId);

            // Fetch service details for verification status
            const serviceDetails =
              await serviceCanisterService.getService(serviceId);

            // Fetch reviews for ratings
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

            return {
              serviceId,
              data: {
                isVerified: (serviceDetails as any)?.isVerified || false,
                averageRating,
                totalReviews: visibleReviews.length,
                mediaUrls: service?.media || [],
              },
            };
          } catch (err) {
            console.error(`Error fetching data for service ${serviceId}:`, err);
            // Find the service to get media URLs even on error
            const service = services.find((s) => s.id === serviceId);
            return {
              serviceId,
              data: {
                isVerified: false,
                averageRating: 0,
                totalReviews: 0,
                mediaUrls: service?.media || [],
              },
            };
          }
        }),
      );

      // Update state with fetched data
      const updatedData: Record<string, ServiceData> = {};
      fetchedData.forEach(({ serviceId, data }) => {
        updatedData[serviceId] = data;
      });

      setServiceDataMap((prev) => ({ ...prev, ...updatedData }));
    };

    if (services.length > 0) {
      fetchServiceData();
    }
  }, [services, displayCount]); // Only depend on services and displayCount

  // Memoize the enhance service function
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

  // Memoize the services with their data
  const servicesWithData = useMemo(() => {
    // Only show services up to displayCount
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

  // Handler for loading more services
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Simulate a small delay for UX
    setTimeout(() => {
      setDisplayCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, services.length),
      );
      setIsLoadingMore(false);
    }, 300);
  };

  // Check if there are more services to load
  const hasMore = displayCount < services.length;

  // Show error state
  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <h2 className="mb-4 text-lg font-bold sm:text-xl">Book Now!</h2>
        <p className="text-red-500">Error loading services: {error.message}</p>
      </div>
    );
  }

  // Always show the layout with services or skeleton cards
  return (
    <div className={`w-full max-w-full ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">Book Now!</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {servicesWithData.map(({ service, serviceData }) => (
          <div key={service.id}>
            <ServiceListItem service={service} serviceData={serviceData} />
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {!loading && services.length > 0 && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-400"
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
