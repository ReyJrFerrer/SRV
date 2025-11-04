import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/solid";
import ServiceListItem from "../../components/client/home page/ServiceListingCard";
import BottomNavigation from "../../components/client/NavigationBar";
import SearchBar from "../../components/client/SearchBar";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import { ServiceGridSkeleton } from "../../components/common/pageFlowImprovements/Skeletons";

// Hooks
import {
  useAllServicesWithProviders,
  EnrichedService,
} from "../../hooks/serviceInformation";

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("query") || searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [results, setResults] = useState<EnrichedService[]>([]);

  // --- State for sorting and filtering ---
  const [showFilters, setShowFilters] = useState(false); // NEW: Toggle for filter visibility
  // Pending (unapplied) filter state
  const [pendingSortBy, setPendingSortBy] = useState("rating");
  const [pendingMaxPrice, setPendingMaxPrice] = useState(0);
  const [pendingMinRating, setPendingMinRating] = useState(0);
  // Applied filter state
  const [sortBy, setSortBy] = useState("rating");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [minRating, setMinRating] = useState(0);

  // Sync pending state with applied state when opening filter panel
  useEffect(() => {
    if (showFilters) {
      setPendingSortBy(sortBy);
      setPendingMaxPrice(maxPrice);
      setPendingMinRating(minRating);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilters]);

  const {
    services: allServices,
    loading,
    error,
  } = useAllServicesWithProviders();

  const performSearch = useCallback(
    (currentQuery: string) => {
      if (!currentQuery.trim() || allServices.length === 0) {
        setResults([]);
        return;
      }
      const lowerCaseQuery = currentQuery.toLowerCase();
      const filteredResults = allServices.filter(
        (service) =>
          service.name.toLowerCase().includes(lowerCaseQuery) ||
          (service.title &&
            service.title.toLowerCase().includes(lowerCaseQuery)) ||
          (service.category &&
            service.category.name.toLowerCase().includes(lowerCaseQuery)) ||
          (service.description &&
            service.description.toLowerCase().includes(lowerCaseQuery)) ||
          (service.providerName &&
            service.providerName.toLowerCase().includes(lowerCaseQuery)),
      );
      setResults(filteredResults);
    },
    [allServices],
  );

  useEffect(() => {
    const currentQ = queryParam || "";
    setSearchQuery(currentQ);
    if (currentQ) {
      performSearch(currentQ);
    } else {
      setResults([]);
    }
  }, [queryParam, performSearch]);

  useEffect(() => {
    document.title = searchQuery
      ? `SRV | Search: ${searchQuery}`
      : "SRV | Search Results";
  }, [searchQuery]);

  // --- REFACTORED: Memoized sorting and filtering logic ---
  const sortedAndFilteredResults = useMemo(() => {
    const safeResults = results.map((service) => ({
      ...service,
      rating: {
        average: service.rating?.average ?? 0,
        count: service.rating?.count ?? 0,
      },
    }));

    const filtered = safeResults.filter((service) => {
      const priceMatch = service.price.amount <= maxPrice;
      const ratingMatch = service.rating.average >= minRating;
      return priceMatch && ratingMatch;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price.amount - b.price.amount;
        case "price_desc":
          return b.price.amount - a.price.amount;
        case "rating":
        default:
          if (b.rating.average !== a.rating.average) {
            return b.rating.average - a.rating.average;
          }
          return (b.rating.count || 0) - (a.rating.count || 0);
      }
    });
  }, [results, sortBy, maxPrice, minRating]);

  const handleSearchOnPage = (newQuery: string) => {
    const trimmedNewQuery = newQuery.trim();
    if (trimmedNewQuery !== searchQuery.trim()) {
      setSearchParams({ query: trimmedNewQuery });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="flex-grow truncate text-lg font-semibold text-gray-800">
            {searchQuery ? `Results for "${searchQuery}"` : "Search Services"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-grow">
            <SearchBar
              placeholder="Search for another service..."
              onSearch={handleSearchOnPage}
              initialQuery={searchQuery}
              redirectToSearchResultsPage={false}
              servicesList={allServices}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative rounded-lg bg-gray-100 p-3 text-gray-600 hover:bg-gray-200"
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-2 pb-20 sm:p-4">
        {loading && (
          <div className="py-2">
            <ServiceGridSkeleton count={8} />
          </div>
        )}
        {error && (
          <div className="py-16 text-center">
            <p className="text-lg text-red-500">
              Error loading services. Please try again.
            </p>
          </div>
        )}

        {/* --- Collapsible Filter and Sort Controls --- */}
        {showFilters && !loading && !error && results.length > 0 && (
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
              {/* Apply Filters button in the same row */}
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

        {!loading &&
          !error &&
          searchQuery &&
          sortedAndFilteredResults.length === 0 && (
            <div className="py-16 text-center">
              <MagnifyingGlassIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-lg text-gray-500">
                No services found matching your criteria.
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Try adjusting your search or filters.
              </p>
            </div>
          )}

        {!loading && !error && !searchQuery && (
          <div className="py-16 text-center">
            <MagnifyingGlassIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-lg text-gray-500">
              Enter a term above to search for services.
            </p>
          </div>
        )}

        {!loading && !error && sortedAndFilteredResults.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {sortedAndFilteredResults.map((service, idx) => (
              <Appear key={service.id} delayMs={idx * 30} variant="fade-up">
                <ServiceListItem service={service} retainMobileLayout={true} />
              </Appear>
            ))}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default SearchResultsPage;
