import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

// Components
import SearchBar from "../../../components/client/SearchBar";
import ServiceListItem from "../../../components/client/ServiceListItem";
import BottomNavigation from "../../../components/client/BottomNavigation";

// Hooks
import { useAllServicesWithProviders } from "../../../hooks/serviceInformation";

const ViewAllServicesPage: React.FC = () => {
  const navigate = useNavigate();

  // Use the hook to get all services with provider information
  const { services, loading, error } = useAllServicesWithProviders();

  // Set document title
  useEffect(() => {
    document.title = "SRV | All Services";
  }, []);

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white px-4 py-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">All Services</h1>
        </div>

        <SearchBar
          placeholder="Search for service"
          className="mb-2"
          servicesList={services}
          redirectToSearchResultsPage={false}
        />
      </div>

      {/* Services List */}
      <div className="px-4 py-6">
        {error && (
          <div className="mb-4 rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700">
            <span className="block sm:inline">
              {typeof error === "string" ? error : error.message}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : services.length === 0 && !error ? (
          <div className="py-10 text-center">
            <p className="text-gray-500">No services available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceListItem
                key={service.id}
                service={service}
                inCategories={true}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ViewAllServicesPage;
