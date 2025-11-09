import React, { useState, useEffect, useMemo } from "react";
import ServiceListItem, {
  ServiceListingCardSkeleton,
} from "./ServiceListingCard";
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

  // Service data state map with proper typing
  interface ServiceData {
    isVerified?: boolean;
    averageRating: number;
    totalReviews: number;
    serviceImages: string[];
    userImageUrl: string | null;
    isLoadingImages: boolean;
  }

  const [serviceDataMap, setServiceDataMap] = useState<
    Record<string, ServiceData>
  >({});

  // Effect to fetch service data for all services
  useEffect(() => {
    const fetchServiceData = async () => {
      const serviceIds = services.map((s) => s.id);
      
      // Only fetch data for services we haven't fetched yet
      const toFetch = serviceIds.filter((id) => !serviceDataMap[id]);

      if (toFetch.length === 0) return;

      // Initialize loading state for new services
      const newEntries: Record<string, ServiceData> = {};
      toFetch.forEach((serviceId) => {
        newEntries[serviceId] = {
          isVerified: false,
          averageRating: 0,
          totalReviews: 0,
          serviceImages: [],
          userImageUrl: null,
          isLoadingImages: true,
        };
      });

      // Update state with loading placeholders
      setServiceDataMap((prev) => ({ ...prev, ...newEntries }));

      // Fetch data for all new services
      const fetchedData = await Promise.all(
        toFetch.map(async (serviceId) => {
          try {
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

            // Find the service from the list to get provider avatar
            const service = services.find((s) => s.id === serviceId);

            // For service images, we'll use the heroImage from the enriched service
            // and the provider avatar as fallback
            const serviceImages: string[] = [];
            if (service?.heroImage) {
              serviceImages.push(service.heroImage);
            }

            // Use provider avatar from enriched service
            const userImageUrl = service?.providerAvatar || null;

            return {
              serviceId,
              data: {
                isVerified: (serviceDetails as any)?.isVerified || false,
                averageRating,
                totalReviews: visibleReviews.length,
                serviceImages,
                userImageUrl,
                isLoadingImages: false,
              },
            };
          } catch (err) {
            console.error(`Error fetching data for service ${serviceId}:`, err);
            return {
              serviceId,
              data: {
                isVerified: false,
                averageRating: 0,
                totalReviews: 0,
                serviceImages: [],
                userImageUrl: null,
                isLoadingImages: false,
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
  }, [services, serviceDataMap]);

  // Memoize the enhance service function
  const enhanceService = useMemo(
    () => (service: EnrichedService): EnrichedService => ({
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
    return services.map((service) => {
      const serviceData = serviceDataMap[service.id] || {
        isVerified: false,
        averageRating: service.rating?.average || 0,
        totalReviews: service.rating?.count || 0,
        serviceImages: [],
        userImageUrl: null,
        isLoadingImages: true,
      };

      return {
        service: enhanceService(service),
        serviceData,
      };
    });
  }, [services, serviceDataMap, enhanceService]);

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

      {loading || services.length === 0 ? (
        loading ? (
          // Show skeleton grid while initially loading
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <ServiceListingCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          // Show empty state when no services available
          <div className="py-12 text-center">
            <p className="text-gray-500">No services available at the moment.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {servicesWithData.map(({ service, serviceData }) => (
            <div key={service.id}>
              <ServiceListItem service={service} serviceData={serviceData} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesList;
