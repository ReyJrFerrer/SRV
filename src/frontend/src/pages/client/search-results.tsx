// SECTION: Imports — dependencies for this page
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/solid";
import { useReputation } from "../../hooks/useReputation";
import ServiceListItem from "../../components/client/home page/ServiceListingCard";
import BottomNavigation from "../../components/client/NavigationBar";
import SearchBar from "../../components/client/SearchBar";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import EmptyState from "../../components/common/EmptyState";
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

  const [showFilters, setShowFilters] = useState(false);
  const [pendingSortBy, setPendingSortBy] = useState("rating");
  const [pendingMaxPrice, setPendingMaxPrice] = useState(0);
  const [pendingMinRating, setPendingMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    if (showFilters) {
      setPendingSortBy(sortBy);
      setPendingMaxPrice(maxPrice);
      setPendingMinRating(minRating);
    }
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

  // Create service data for ServiceListItem
  const createServiceData = (service: EnrichedService) => ({
    isVerified: false,
    averageRating: service.rating?.average ?? 0,
    totalReviews: service.rating?.count ?? 0,
    mediaUrls: service.media || [],
    reputationScore: serviceDataMap[service.id]?.reputationScore,
  });

  // Map to hold fetched reputation scores for visible services
  const { fetchUserReputation } = useReputation();
  const [serviceDataMap, setServiceDataMap] = React.useState<
    Record<string, { reputationScore?: number }>
  >({});

  useEffect(() => {
    if (!sortedAndFilteredResults || sortedAndFilteredResults.length === 0)
      return;
    const toFetch = sortedAndFilteredResults.filter(
      (s) => !!s.providerId && !serviceDataMap[s.id],
    );
    if (toFetch.length === 0) return;

    let mounted = true;
    (async () => {
      const results = await Promise.all(
        toFetch.map(async (s) => {
          try {
            const rep = await fetchUserReputation(s.providerId);
            const score =
              rep && typeof rep.trustScore === "number"
                ? Math.round(rep.trustScore)
                : undefined;
            return { id: s.id, reputationScore: score };
          } catch {
            return { id: s.id, reputationScore: undefined };
          }
        }),
      );
      if (!mounted) return;
      setServiceDataMap((prev) => {
        const copy = { ...prev };
        results.forEach((r) => {
          copy[r.id] = { reputationScore: r.reputationScore };
        });
        return copy;
      });
    })();

    return () => {
      mounted = false;
    };
  }, [sortedAndFilteredResults, fetchUserReputation, serviceDataMap]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-2xl bg-gray-50 px-5 py-3.5 text-gray-700 transition-all hover:bg-gray-100 hover:text-blue-600 font-bold active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="flex-grow truncate text-xl font-black text-gray-900">
            {searchQuery ? `Results for "${searchQuery}"` : "Search Services"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
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
            className={`relative rounded-xl p-3 transition-colors ${
              showFilters
                ? "bg-blue-600 text-white"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            }`}
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="flex-grow space-y-4 overflow-y-auto p-4 pb-24">
        {error && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 py-16 text-center shadow-sm">
            <p className="text-lg font-bold text-red-500">
              Error loading services. Please try again.
            </p>
          </div>
        )}

        {/* SECTION: Filter and sort controls */}
        {showFilters && !loading && !error && results.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 items-end gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-900">
                  Sort By
                </label>
                <select
                  value={pendingSortBy}
                  onChange={(e) => setPendingSortBy(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rating">Best Rating</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block flex justify-between text-sm font-bold text-gray-900">
                  <span>Max Price</span>
                  <span className="text-blue-600">
                    ₱{pendingMaxPrice.toLocaleString()}
                  </span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="10000000"
                  step="100"
                  value={pendingMaxPrice}
                  onChange={(e) => setPendingMaxPrice(Number(e.target.value))}
                  className="block h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
                />
              </div>
              <div>
                <label className="mb-2 block flex justify-between text-sm font-bold text-gray-900">
                  <span>Min Rating</span>
                  <span className="text-yellow-500">
                    {pendingMinRating.toFixed(1)} ★
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={pendingMinRating}
                  onChange={(e) => setPendingMinRating(Number(e.target.value))}
                  className="block h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-yellow-400"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setSortBy(pendingSortBy);
                    setMaxPrice(pendingMaxPrice);
                    setMinRating(pendingMinRating);
                    setShowFilters(false);
                  }}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:bg-blue-800 active:scale-95 shadow-sm"
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
            <div className="mt-4 rounded-3xl border border-gray-100 bg-white py-8 shadow-sm">
              <EmptyState
                icon={
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-400" />
                }
                title="No services found"
                message="No services matched your search criteria. Try adjusting your search or filters."
                actionLabel="Clear Search"
                onAction={() => handleSearchOnPage("")}
              />
            </div>
          )}

        {!loading && !error && !searchQuery && (
          <div className="mt-4 rounded-3xl border border-gray-100 bg-white py-8 shadow-sm">
            <EmptyState
              icon={<MagnifyingGlassIcon className="h-12 w-12 text-gray-400" />}
              title="Search Services"
              message="Enter a term above to search for services."
            />
          </div>
        )}

        {!loading && !error && sortedAndFilteredResults.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {sortedAndFilteredResults.map((service, idx) => (
              <Appear key={service.id} delayMs={idx * 30} variant="fade-up">
                <ServiceListItem
                  service={service}
                  serviceData={createServiceData(service)}
                  retainMobileLayout={true}
                />
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
