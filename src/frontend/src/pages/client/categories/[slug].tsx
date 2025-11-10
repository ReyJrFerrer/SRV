// SECTION: Imports — dependencies for this page
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/solid";
import SearchBar from "../../../components/client/SearchBar";
import ServiceListItem from "../../../components/client/home page/ServiceListingCard";
import BottomNavigation from "../../../components/client/NavigationBar";
import Appear from "../../../components/common/pageFlowImprovements/Appear";
import {
  useServicesByCategory,
  useAllServicesWithProviders,
  EnrichedService,
} from "../../../hooks/serviceInformation";
import serviceCanisterService from "../../../services/serviceCanisterService";
import { getCategoryIcon } from "../../../utils/serviceHelpers";

interface CategoryState {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
}

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1);
  };

  const [category, setCategory] = useState<CategoryState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [pendingSortBy, setPendingSortBy] = useState("rating");
  const [pendingMaxPrice, setPendingMaxPrice] = useState(10000);
  const [pendingMinRating, setPendingMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    if (showFilters) {
      setPendingSortBy(sortBy);
      setPendingMaxPrice(maxPrice);
      setPendingMinRating(minRating);
    }
  }, [showFilters]);

  const categoryId = category?.id || "";
  const isAllServices = slug === "all-service-types";

  const allServicesHook = useAllServicesWithProviders();
  const categoryServicesHook = useServicesByCategory(categoryId);

  const { services, error: servicesError } = isAllServices
    ? allServicesHook
    : categoryServicesHook;

  useEffect(() => {
    document.title = category ? `${category.name} | SRV` : "Category | SRV";
  }, [category]);

  useEffect(() => {
    if (!slug) return;
    const loadCategory = async () => {
      try {
        const canisterCategories =
          await serviceCanisterService.getAllCategories();
        let foundCategory: CategoryState | null = null;

        if (canisterCategories && canisterCategories.length > 0) {
          const matchedCategory = canisterCategories.find(
            (cat) => cat.slug === slug,
          );
          if (matchedCategory) {
            foundCategory = {
              id: matchedCategory.id,
              name: matchedCategory.name,
              description:
                matchedCategory.description ||
                `Services in ${matchedCategory.name} category`,
              slug: matchedCategory.slug,
              icon: getCategoryIcon(matchedCategory.name),
            };
          } else if (slug === "all-service-types") {
            foundCategory = {
              id: "all",
              name: "All Service Types",
              description: "Browse all available service types",
              slug: "all-service-types",
            };
          }
        }
        setCategory(foundCategory);
      } catch (error) {
        //console.error("Failed to load category data:", error);
        setCategory(null);
      }
    };
    loadCategory();
  }, [slug]);

  const handleSearch = (term: string) => setSearchTerm(term);

  // Create service data for ServiceListItem
  const createServiceData = (service: EnrichedService) => ({
    isVerified: false,
    averageRating: service.rating?.average ?? 0,
    totalReviews: service.rating?.count ?? 0,
    mediaUrls: service.media || [],
  });

  const sortedAndFilteredServices = useMemo(() => {
    let processedServices = services.filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    processedServices = processedServices.filter((service) => {
      const safeRating = service.rating?.average ?? 0;
      const priceMatch = service.price.amount <= maxPrice;
      const ratingMatch = safeRating >= minRating;
      return priceMatch && ratingMatch;
    });
    return processedServices.sort((a, b) => {
      const safeRatingA = a.rating?.average ?? 0;
      const safeRatingB = b.rating?.average ?? 0;
      const safeCountA = a.rating?.count ?? 0;
      const safeCountB = b.rating?.count ?? 0;

      switch (sortBy) {
        case "price_asc":
          return a.price.amount - b.price.amount;
        case "price_desc":
          return b.price.amount - a.price.amount;
        case "rating":
        default:
          if (safeRatingB !== safeRatingA) {
            return safeRatingB - safeRatingA;
          }
          return safeCountB - safeCountA;
      }
    });
  }, [services, searchTerm, sortBy, maxPrice, minRating]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-40 bg-white px-4 py-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="truncate text-xl font-bold">
            {category ? category.name : "Loading…"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-grow">
            <SearchBar
              placeholder={`Search in ${category ? category.name : "Category"}`}
              onSearch={handleSearch}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative rounded-lg bg-gray-100 p-3 text-gray-600 hover:bg-gray-200"
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* SECTION: Services list and filters */}
      <div className="p-2 sm:p-4">
        {/* SECTION: Collapsible filter panel */}
        {showFilters && (
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sort By
                </label>
                <select
                  value={pendingSortBy}
                  onChange={(e) => setPendingSortBy(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="rating">Best Rating</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Price: ₱{pendingMaxPrice.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={pendingMaxPrice}
                  onChange={(e) => setPendingMaxPrice(Number(e.target.value))}
                  className="mt-2 block w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Min Rating: {pendingMinRating.toFixed(1)} ★
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={pendingMinRating}
                  onChange={(e) => setPendingMinRating(Number(e.target.value))}
                  className="mt-2 block w-full"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSortBy(pendingSortBy);
                    setMaxPrice(pendingMaxPrice);
                    setMinRating(pendingMinRating);
                    setShowFilters(false);
                  }}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-400"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {servicesError && (
          <div className="mb-4 rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700">
            <span className="block sm:inline">{servicesError.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {sortedAndFilteredServices.map((service, idx) => (
            <Appear key={service.id} delayMs={idx * 30} variant="fade-up">
              <ServiceListItem
                service={service}
                serviceData={createServiceData(service)}
                retainMobileLayout={true}
              />
            </Appear>
          ))}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default CategoryPage;
