// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useServiceManagement } from "../../hooks/serviceManagement";
import authCanisterService from "../../services/authCanisterService";
import { APIProvider } from "@vis.gl/react-google-maps";
import MapFunctions from "../common/GMapFunctions/MapFunctions";
import { useLocationStore } from "../../store/locationStore";

// --- Props ---
export interface HeaderProps {
  className?: string;
}

// --- Main Header Component ---
const Header: React.FC<HeaderProps> = ({ className }) => {
  // --- Service Management Hook ---
  const { services } = useServiceManagement();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // --- Use Zustand location store ---
  const { locationLoading, locationStatus } = useLocationStore();

  // Get requestLocation function separately to avoid dependency issues
  const locationStore = useLocationStore();

  // --- State: User profile ---
  const [profile, setProfile] = useState<any>(null);

  // --- State: Search bar ---
  const [searchQuery, setSearchQuery] = useState("");
  // Static search bar placeholders
  const searchPlaceholders = [
    "Looking for a plumber?",
    "Looking for an electrician?",
    "Looking for a cleaner?",
    "Looking for a tutor?",
    "Looking for a mechanic?",
    "Looking for a photographer?",
    "Looking for a pet sitter?",
    "Looking for a gardener?",
    "Looking for a painter?",
    "Looking for a babysitter?",
  ];
  const [placeholder, setPlaceholder] = useState(searchPlaceholders[0]);

  // --- State: (map modal handled by MapFunctions) ---
  // --- Sticky header: show/hide location area on scroll ---
  const [showLocationArea, setShowLocationArea] = useState(true);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 10) {
        // scrolling down
        setShowLocationArea(false);
      } else if (y < lastY - 10) {
        // scrolling up
        setShowLocationArea(true);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // maps logic has been extracted into MapFunctions component
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";

  // --- State: Search suggestions ---
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- Handler: Search input change ---
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim().length > 0) {
      // Only use service names for suggestions, not categories
      const serviceNames = Array.from(
        new Set(
          services.map((service) => service.title).filter((name) => !!name),
        ),
      );
      const filtered = serviceNames.filter((suggestion) =>
        suggestion.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Effect: fetch user profile and initialize location when auth loads
  useEffect(() => {
    const loadInitialData = async () => {
      // Fetch user profile if authenticated
      if (isAuthenticated) {
        try {
          const userProfile = await authCanisterService.getMyProfile();
          setProfile(userProfile);
        } catch (error) {
          /* Profile fetch failed */
        }
      }

      // Initialize location through Zustand store (will check cache first)
      if (!isAuthLoading) {
        locationStore.requestLocation();
      }
    };

    if (!isAuthLoading) {
      loadInitialData();
    }
  }, [isAuthenticated, isAuthLoading, locationStore]);

  // --- Effect: Randomize search bar placeholder after location loads ---
  useEffect(() => {
    if (
      !locationLoading &&
      !isAuthLoading &&
      (locationStatus === "allowed" || locationStatus === "unsupported")
    ) {
      setPlaceholder(
        searchPlaceholders[
          Math.floor(Math.random() * searchPlaceholders.length)
        ],
      );
    }
  }, [locationLoading, isAuthLoading, locationStatus]);

  // --- Handler: go to profile page ---
  const handleProfileClick = () => {
    navigate("/client/profile");
  };

  // --- Handler: suggestion click for search bar ---
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  // --- Display name for welcome message ---
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";

  // MapModal moved outside the component to avoid re-creation on each render

  // --- Handler: search input change ---
  // Only one handler should exist. The correct handler is defined above with dynamicSuggestions.

  // --- Render: Header layout ---
  return (
    <APIProvider apiKey={mapsApiKey}>
      <header
        className={`w-full max-w-full space-y-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-6 shadow-lg ${className} sticky top-0 z-40`}
      >
        {/* --- Desktop Header: Logo, Welcome, Profile Button --- */}
        <div className="hidden items-center justify-between md:flex">
          <div className="flex items-center space-x-6">
            <Link to="/client/home">
              <img
                src="/logo.svg"
                alt="SRV Logo"
                className="h-20 w-auto drop-shadow-md transition-all duration-300 hover:scale-110"
              />
            </Link>
            <div className="h-10 border-l-2 border-blue-100"></div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-wide text-blue-700">
                Welcome,{" "}
                <span className="text-2xl font-bold text-gray-800">
                  {displayName}
                </span>
              </span>
            </div>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleProfileClick}
              className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
            >
              <UserCircleIcon className="h-10 w-10 text-blue-700 transition-colors group-hover:text-yellow-500" />
            </button>
          )}
        </div>

        {/* --- Mobile Header: Logo, Welcome, Profile Button --- */}
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            <Link to="/client/home">
              <img
                src="/logo.svg"
                alt="SRV Logo"
                className="h-16 w-auto drop-shadow-md transition-all duration-300 hover:scale-110"
              />
            </Link>
            {isAuthenticated && (
              <button
                onClick={handleProfileClick}
                className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
              >
                <UserCircleIcon className="h-8 w-8 text-blue-600 transition-colors group-hover:text-yellow-500" />
              </button>
            )}
          </div>
          <hr className="my-4 border-blue-100" />
          <div className="flex flex-row flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-xl font-semibold tracking-wide text-blue-700">
              Welcome,
            </span>
            <span className="text-xl font-bold text-gray-800">
              {displayName}
            </span>
          </div>
        </div>

        {/* --- Location & Search Section --- */}
        <div className="rounded-2xl border border-blue-100 bg-yellow-200 p-6 shadow transition-all duration-200">
          <div className={`${showLocationArea ? "block" : "hidden"}`}>
            {/* location area shown/hidden based on scroll */}
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <MapPinIcon className="h-6 w-6 text-blue-600" />
              <span className="text-base font-bold text-gray-800">
                My Location
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <MapFunctions />
          </div>
          {/* --- Search Bar for Service Queries --- */}
          <form
            className="mt-4 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate(
                  `/client/search-results?query=${encodeURIComponent(searchQuery)}`,
                );
              }
            }}
          >
            <div className="relative flex w-full items-center rounded-xl border border-blue-100 bg-white p-4 shadow-md focus-within:ring-2 focus-within:ring-yellow-300">
              <input
                type="text"
                className="flex-1 border-none bg-transparent p-0 text-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-0"
                placeholder={placeholder}
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() =>
                  setShowSuggestions(filteredSuggestions.length > 0)
                }
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute left-0 top-full z-10 w-full rounded-b-xl border border-blue-100 bg-white shadow-lg">
                  {filteredSuggestions.map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="cursor-pointer px-4 py-2 text-gray-700 hover:bg-blue-50"
                      onMouseDown={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </form>
        </div>
      </header>
      {/* Map modal handled inside MapFunctions component */}
    </APIProvider>
  );
};

export default Header;
