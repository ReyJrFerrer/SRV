import React from "react";
import ServiceListItem, {
  ServiceListingCardSkeleton,
} from "./ServiceListingCard";
import {
  EnrichedService,
  useAllServicesWithProviders,
} from "../../../hooks/serviceInformation";
import { getCategoryImage } from "../../../utils/serviceHelpers";

interface ServicesListProps {
  className?: string;
}

const ServicesList: React.FC<ServicesListProps> = ({ className = "" }) => {
  // Use the realtime hook for live updates from Firestore
  const { services, loading, error } = useAllServicesWithProviders();

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
          {services.map((service) => (
            <div key={service.id}>
              <ServiceListItem service={enhanceService(service)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesList;
