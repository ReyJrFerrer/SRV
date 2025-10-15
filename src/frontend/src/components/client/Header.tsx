// Component: Client Header
// Purpose: Shows welcome, location preview with reverse geocode, profile access, and search.
// Dependencies: Zustand location store, @vis.gl/react-google-maps for modal map.
// Notes: Google Maps API is provided by a single root APIProvider.
// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useServiceManagement } from "../../hooks/serviceManagement";
import authCanisterService from "../../services/authCanisterService";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useLocationStore } from "../../store/locationStore";

// --- Props ---
export interface HeaderProps {
  className?: string;
}

// Cooldown config: skip geolocation attempts if user denied within this window (ms)
const GEO_DENIAL_KEY = "geoDeniedAt";
const GEO_DENIAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

// --- Main Header Component ---
const Header: React.FC<HeaderProps> = ({ className }) => {
  // --- Service & Auth ---
  const { services } = useServiceManagement();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // --- Location store ---
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
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

  // --- New: Resolved formatted geocoded address (Google Maps) ---
  const [gmapsAddress, setGmapsAddress] = useState<string>(
    "Detecting location...",
  );
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "unsupported" | "failed"
  >("idle");

  // --- New: State to track if Google Maps API script has loaded ---
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);

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

  // Root API key comes from APIProvider

  // Reverse geocode via Google on mount (independent from internal store)
  useEffect(() => {
    // The new library loads the script via APIProvider, so we check for the google object
    const isApiReady = !!(window as any).google?.maps;
    if (!isApiReady) {
      // If the API isn't ready, the APIProvider will handle loading it.
      // We can add a listener or simply rely on re-renders.
      // For simplicity, this effect will re-run when other dependencies change.
      return;
    }
    setMapsApiLoaded(true); // Mark API as loaded
    if (gmapsStatus !== "idle") return; // skip if preset (e.g., denied cooldown)
    if (!("geolocation" in navigator)) {
      setGmapsStatus("unsupported");
      setGmapsAddress("Geolocation not supported");
      return;
    }
    setGmapsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          if (!(window as any).google || !(window as any).google.maps) {
            setGmapsStatus("failed");
            setGmapsAddress("Maps not available");
            return;
          }
          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results: any, status: string) => {
              if (status === "OK" && results && results[0]) {
                setGmapsAddress(results[0].formatted_address);
                setGmapsStatus("ok");
              } else {
                setGmapsStatus("failed");
                setGmapsAddress("Unable to resolve address");
              }
            },
          );
        } catch (e) {
          setGmapsStatus("failed");
          setGmapsAddress("Reverse geocode failed");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGmapsStatus("denied");
          setGmapsAddress("Location access denied");
          try {
            localStorage.setItem(GEO_DENIAL_KEY, Date.now().toString());
          } catch {
            /* ignore */
          }
        } else {
          setGmapsStatus("failed");
          setGmapsAddress("Failed to get location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [gmapsStatus]); // Removed mapsReady dependency

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
    if (!locationLoading && !isAuthLoading) {
      setPlaceholder(
        searchPlaceholders[
          Math.floor(Math.random() * searchPlaceholders.length)
        ],
      );
    }
  }, [locationLoading, isAuthLoading]);

  // --- Handlers ---
  // Go to profile page
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

  // --- Map Modal: shows user's detected location on a map ---
  const MapModal: React.FC = () => {
    if (!geoLocation || !geoLocation.latitude || !geoLocation.longitude)
      return null;
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) setShowMap(false);
    };
    const center = {
      lat: geoLocation.latitude,
      lng: geoLocation.longitude,
    };
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-lg">
          <button
            className="absolute right-3 top-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
            onClick={() => setShowMap(false)}
            aria-label="Close map"
            tabIndex={0}
          >
            <span className="text-xl font-bold text-gray-700">&times;</span>
          </button>
          <div className="flex-1">
            {mapsApiLoaded ? (
              <Map
                defaultCenter={center}
                defaultZoom={16}
                mapId="6922634ff75ae05ac38cc473" // IMPORTANT: Add your Map ID here
                style={{ width: "100%", height: "100%" }}
                disableDefaultUI={false}
                mapTypeControl={false}
              >
                <AdvancedMarker position={center} />
              </Map>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Loading map...
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 bg-white p-3 text-center text-xs text-gray-600">
            {gmapsStatus === "ok" && gmapsAddress !== "Detecting location..."
              ? gmapsAddress
              : `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`}
          </div>
        </div>
      </div>
    );
  };

  // Note: Search change handler defined above.

  // --- Render: Header layout ---
  return (
    <header
      className={`w-full max-w-full space-y-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-6 shadow-lg ${className}`}
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
          <span className="text-xl font-bold text-gray-800">{displayName}</span>
        </div>
      </div>

      {/* --- Location & Search Section --- */}
      <div className="rounded-2xl border border-blue-100 bg-yellow-200 p-6 shadow">
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
              onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
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

      {/* --- Map Modal for Location Display --- */}
      {showMap && <MapModal />}
    </header>
  );
};

export default Header;
