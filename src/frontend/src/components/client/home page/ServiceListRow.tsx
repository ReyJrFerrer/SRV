import React, { useState, useEffect } from "react";
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
      const mapCopy = { ...serviceDataMap };
      const toFetch = serviceIds.filter((id) => !mapCopy[id]);

      if (toFetch.length === 0) return;

      await Promise.all(
        toFetch.map(async (serviceId) => {
          try {
            mapCopy[serviceId] = {
              isVerified: false,
              averageRating: 0,
              totalReviews: 0,
              serviceImages: [],
              userImageUrl: null,
              isLoadingImages: true,
            };

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

            mapCopy[serviceId] = {
              isVerified: (serviceDetails as any)?.isVerified || false,
              averageRating,
              totalReviews: visibleReviews.length,
              serviceImages,
              userImageUrl,
              isLoadingImages: false,
            };
          } catch (err) {
            console.error(`Error fetching data for service ${serviceId}:`, err);
            mapCopy[serviceId] = {
              isVerified: false,
              averageRating: 0,
              totalReviews: 0,
              serviceImages: [],
              userImageUrl: null,
              isLoadingImages: false,
            };
          }
        }),
      );

      setServiceDataMap(mapCopy);
    };

    if (services.length > 0) {
      fetchServiceData();
    }
  }, [services]);

  const enhanceService = (service: EnrichedService): EnrichedService => ({
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
  });

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="h-7 w-32 animate-pulse rounded-md bg-gray-200"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <ServiceListingCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <h2 className="mb-4 text-lg font-bold sm:text-xl">Book Now!</h2>
        <p className="text-red-500">Error loading services: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-full ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">Book Now!</h2>
      </div>

      {services.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">No services available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const serviceData = serviceDataMap[service.id] || {
              isVerified: false,
              averageRating: service.rating?.average || 0,
              totalReviews: service.rating?.count || 0,
              serviceImages: [],
              userImageUrl: null,
              isLoadingImages: true,
            };

            return (
              <div key={service.id}>
                <ServiceListItem
                  service={enhanceService(service)}
                  serviceData={serviceData}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServicesList;
