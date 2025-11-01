// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useServiceManagement } from "../../hooks/serviceManagement";
import authCanisterService from "../../services/authCanisterService";
import { APIProvider } from "@vis.gl/react-google-maps";
import LocationMapModal from "../common/LocationMapModal";
import { useLocationStore } from "../../store/locationStore";
import EnableLocationButton from "../common/EnableLocationButton";

// --- Props ---
export interface HeaderProps {
  className?: string;
}

// Map modal is now extracted to components/common/LocationMapModal

// Cooldown config: skip geolocation attempts if user denied within this window (ms)
const GEO_DENIAL_KEY = "geoDeniedAt";
const GEO_DENIAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
// Cache for last resolved address to avoid flicker/changes between loads
// Client uses its own cache key and a 2-minute TTL
const ADDR_CACHE_KEY = "GMAPS_ADDR_CACHE_CLIENT_V1";
const ADDR_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
interface AddrCache {
  address: string;
  ts: number;
}

// (removed inline MapModal; using LocationMapModal instead)

// --- Main Header Component ---
const Header: React.FC<HeaderProps> = ({ className }) => {
  // --- Service Management Hook ---
  const { services } = useServiceManagement();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // --- Use Zustand location store ---
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
    locationStatus,
  } = useLocationStore();

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

  // --- State: Show/hide map modal ---
  const [showMap, setShowMap] = useState(false);
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

  // --- New: Resolved formatted geocoded address (Google Maps) ---
  const [gmapsAddress, setGmapsAddress] = useState<string>(
    "Detecting location...",
  );
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "unsupported" | "failed"
  >("idle");

  // --- New: State to track if Google Maps API script has loaded ---
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);

  // API key for client maps
  const mapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";

  // Pre-check: if user previously denied recently, set status immediately
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(GEO_DENIAL_KEY)
          : null;
      if (raw) {
        const ts = Number(raw);
        if (!isNaN(ts) && Date.now() - ts < GEO_DENIAL_COOLDOWN_MS) {
          setGmapsStatus("denied");
          setGmapsAddress("Location access previously denied");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // When locationStatus changes to denied/unsupported, reflect in gmapsStatus
  useEffect(() => {
    if (locationStatus === "denied") setGmapsStatus("denied");
    if (locationStatus === "unsupported") setGmapsStatus("unsupported");
  }, [locationStatus]);

  // --- API Key Definition ---
  // Root APIProvider supplies the key; keep placeholder only if needed elsewhere
  // Seed from cache first to stabilize display across reloads
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDR_CACHE_KEY);
      if (raw) {
        const cached: AddrCache = JSON.parse(raw);
        if (cached?.address && typeof cached.ts === "number") {
          const fresh = Date.now() - cached.ts < ADDR_CACHE_TTL_MS;
          if (fresh) {
            setGmapsAddress(cached.address);
            setGmapsStatus("ok");
          }
        }
      }
    } catch {}
  }, []);

  // Reverse geocode via Google when API is ready and we have a store location
  useEffect(() => {
    const isApiReady = !!(window as any).google?.maps;
    if (isApiReady && !mapsApiLoaded) setMapsApiLoaded(true);
    if (!mapsApiLoaded || !geoLocation) return;
    if (gmapsStatus !== "idle") return; // cache or prior status already set
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      setGmapsStatus("loading");
      geocoder.geocode(
        {
          location: {
            lat: geoLocation.latitude,
            lng: geoLocation.longitude,
          },
        },
        (results: any, status: string) => {
          if (status === "OK" && results && results[0]) {
            // Build a concise display address from address_components:
            const comps = results[0].address_components || [];
            const find = (type: string) => {
              const c = comps.find((cc: any) => cc.types && cc.types.indexOf(type) !== -1);
              return c ? c.long_name : undefined;
            };

            const premise = find("premise") || find("subpremise") || find("establishment") || find("point_of_interest");
            const streetNumber = find("street_number");
            const route = find("route");
            const barangay = find("sublocality_level_2") || find("sublocality") || find("neighborhood");
            // Prefer more specific administrative levels for locality/province
            const locality =
              find("locality") || find("postal_town") || find("administrative_area_level_3") || find("administrative_area_level_2");
            const province = find("administrative_area_level_2") || find("administrative_area_level_1");

            const line1 = premise || (streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber);
            const parts = [] as string[];
            if (line1) parts.push(line1);
            if (barangay) parts.push(barangay);
            if (locality) parts.push(locality);
            if (province) parts.push(province);

            const displayAddress = parts.length > 0 ? parts.join(", ") : (results[0].formatted_address as string);
            setGmapsAddress(displayAddress);
            setGmapsStatus("ok");
            try {
              const payload: AddrCache = { address: displayAddress, ts: Date.now() };
              localStorage.setItem(ADDR_CACHE_KEY, JSON.stringify(payload));
            } catch {}
          } else {
            setGmapsStatus("failed");
            setGmapsAddress("Unable to resolve address");
          }
        },
      );
    } catch {
      setGmapsStatus("failed");
      setGmapsAddress("Reverse geocode failed");
    }
  }, [mapsApiLoaded, geoLocation, gmapsStatus]);

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
            <div className="flex w-full items-center justify-start">
              {/* Priority order: Google reverse geocode -> stored userAddress/province -> status messages */}
              {gmapsStatus === "ok" ? (
                <button
                  type="button"
                  className="line-clamp-2 max-w-full text-left text-sm font-medium text-blue-900 transition-colors hover:text-blue-700 focus:outline-none"
                  onClick={() => setShowMap(true)}
                  title={gmapsAddress}
                >
                  {gmapsAddress}
                </button>
              ) : locationLoading ||
                isAuthLoading ||
                gmapsStatus === "loading" ? (
                <span className="animate-pulse text-sm text-gray-500">
                  Detecting location...
                </span>
              ) : userAddress && userProvince ? (
                <button
                  type="button"
                  className="text-left text-sm font-medium text-blue-900 transition-colors hover:text-blue-700 focus:outline-none"
                  onClick={() => setShowMap(true)}
                  title={`${userAddress}, ${userProvince}`}
                >
                  {userAddress}, {userProvince}
                </button>
              ) : (
                <span className="text-left text-sm text-gray-500">
                  {gmapsAddress}
                </span>
              )}
            </div>
            {(locationStatus === "denied" || locationStatus === "not_set") && (
              <div className="ml-3">
                <EnableLocationButton />
              </div>
            )}
          </div>
          {(locationStatus === "denied" || locationStatus === "not_set") && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              Location access is off. Some features are limited.
            </div>
          )}
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
      {/* --- Map Modal for Location Display --- */}
      {showMap && geoLocation && (
        <LocationMapModal
          show={showMap}
          onClose={() => setShowMap(false)}
          center={{ lat: geoLocation.latitude, lng: geoLocation.longitude }}
          address={gmapsAddress}
          status={gmapsStatus}
          mapsApiLoaded={mapsApiLoaded}
          accuracy={geoLocation.accuracy}
        />
      )}
    </APIProvider>
  );
};

export default Header;
