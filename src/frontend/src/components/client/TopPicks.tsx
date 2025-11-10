import React from "react";
/* Use standard React and HTML elements, styling with Tailwind CSS v4 */
// SVG icons will use standard SVG elements below
import ServiceListItem from "./home page/ServiceListingCard";
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

// --- SVG Icons ---
const ArrowRightIcon = () => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={3}
    stroke="currentColor"
    className="h-4 w-4 text-blue-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="h-12 w-12 text-gray-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

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
          <ArrowRightIcon />
        </button>
      </div>

      {services.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <SearchIcon />
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
