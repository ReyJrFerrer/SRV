import React from "react";
/* Use standard React and HTML elements, styling with Tailwind CSS v4 */
// SVG icons will use standard SVG elements below
import ServiceListItem from "./home page/ServiceListingCard";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  EnrichedService,
  useTopPickServices,
} from "../../hooks/serviceInformation";
import { getCategoryImage } from "../../utils/serviceHelpers";

// --- Types and Props ---
interface TopPicksProps {
  style?: object;
  limit?: number;
  onViewAllPress: () => void; // Navigation is handled by the parent
}

// Using Heroicons for icons (imported above)

const TopPicks: React.FC<TopPicksProps> = ({
  style,
  limit = 4,
  onViewAllPress,
}) => {
  // Use the custom hook to fetch top pick services
  const { services, loading, error } = useTopPickServices(limit);

  // Enhance service data with the correct hero image
  const enhanceService = (service: EnrichedService): EnrichedService => ({
    ...service,
    heroImage: getCategoryImage(service.category.name),
  });

  // Create service data for ServiceListItem
  const createServiceData = (service: EnrichedService) => ({
    isVerified: false,
    averageRating: service.rating?.average ?? 0,
    totalReviews: service.rating?.count ?? 0,
    mediaUrls: service.media || [],
  });

  // --- Render: Top Picks Layout ---
  if (loading) {
    return (
      <div
        className={`flex h-52 items-center justify-center px-4 ${style ?? ""}`}
      >
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-4 ${style ?? ""}`}>
        <div className="text-center text-red-500">
          Failed to load services: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 ${style ?? ""}`}>
      <div className="mb-4 flex flex-row items-center justify-between">
        <span className="text-xl font-bold text-gray-800">Book Now!!</span>
        <button
          onClick={onViewAllPress}
          className="group flex flex-row items-center"
          type="button"
        >
          <span className="mr-1 text-blue-600">View All</span>
          <ArrowRightIcon className="h-4 w-4 text-blue-600" />
        </button>
      </div>

      {services.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400" />
          </div>
          <span className="text-gray-500">
            No services available at the moment
          </span>
        </div>
      ) : (
        // Service List
        <div className="flex flex-col gap-4 pb-4">
          {services.map(enhanceService).map((item) => (
            <ServiceListItem
              key={item.id}
              service={item}
              serviceData={createServiceData(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TopPicks;
