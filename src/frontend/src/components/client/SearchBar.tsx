import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

// --- Types: Service and Props ---
interface SearchableService {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  providerName?: string;
  category: {
    name: string;
  };
}
interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  redirectToSearchResultsPage?: boolean;
  initialQuery?: string;
  servicesList?: SearchableService[];
}

// --- Main SearchBar Component ---
const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search for service",
  className = "",
  redirectToSearchResultsPage = true,
  initialQuery = "",
  servicesList = [],
}) => {
  // --- State ---
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchableService[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // --- Suggestion Logic ---
  const fetchSuggestions = useCallback(
    (currentQuery: string) => {
      if (currentQuery.trim().length > 1) {
        const lowerCaseQuery = currentQuery.toLowerCase();
        const filteredSuggestions = servicesList
          .filter(
            (service) =>
              (service.title &&
                service.title.toLowerCase().includes(lowerCaseQuery)) ||
              (service.description &&
                service.description.toLowerCase().includes(lowerCaseQuery)) ||
              service.category.name.toLowerCase().includes(lowerCaseQuery) ||
              (service.providerName &&
                service.providerName.toLowerCase().includes(lowerCaseQuery)) ||
              (service.name &&
                service.name.toLowerCase().includes(lowerCaseQuery)),
          )
          .slice(0, 5); // Limit to 5 suggestions
        setSuggestions(filteredSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [servicesList],
  );

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    fetchSuggestions(newQuery);
  };
  const handleSubmit = (
    e?: React.FormEvent,
    submissionQuery: string = query,
  ) => {
    e?.preventDefault();
    setShowSuggestions(false);
    inputRef.current?.blur();
    const finalQuery = submissionQuery.trim();
    if (finalQuery) {
      if (onSearch) onSearch(finalQuery);
      if (redirectToSearchResultsPage) {
        navigate(`/client/search-results?q=${encodeURIComponent(finalQuery)}`);
      }
    }
  };
  const handleSuggestionClick = (service: SearchableService) => {
    const suggestionText =
      service.title ||
      service.name ||
      service.providerName ||
      service.category.name;
    setQuery(suggestionText || "");
    setShowSuggestions(false);
    handleSubmit(undefined, suggestionText);
  };
  const handleClearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && focusedSuggestionIndex >= 0) {
        e.preventDefault();
        const selectedService = suggestions[focusedSuggestionIndex];
        if (selectedService) {
          handleSuggestionClick(selectedService);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }
  };

  // --- Effect: Close suggestions when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Render: SearchBar Layout ---
  return (
    <div ref={searchBarRef} className="relative">
      {/* Search input and button */}
      <form
        onSubmit={handleSubmit}
        className={`search-bar group flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-green-400 focus-within:shadow-md hover:border-gray-300 hover:shadow ${className}`}
      >
        <MagnifyingGlassIcon className="mr-3 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length > 1 && fetchSuggestions(query)}
          placeholder={placeholder}
          className="w-full bg-transparent py-1 text-gray-700 outline-none"
          aria-label="Search"
        />
        {query && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </form>
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="py-1">
            {suggestions.map((service, index) => (
              <li
                key={service.id}
                onClick={() => handleSuggestionClick(service)}
                className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
                  index === focusedSuggestionIndex ? "bg-gray-100" : ""
                }`}
              >
                <div className="font-medium">
                  {service.title || service.name || service.providerName || ""}
                </div>
                <div className="text-sm text-gray-500">
                  {service.category.name}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
