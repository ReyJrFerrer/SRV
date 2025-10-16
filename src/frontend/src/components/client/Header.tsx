// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useServiceManagement } from "../../hooks/serviceManagement";
import authCanisterService from "../../services/authCanisterService";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useLocationStore } from "../../store/locationStore";

// --- Props ---
export interface HeaderProps {
  className?: string;
}

interface MapModalProps {
  show: boolean;
  onClose: () => void;
  center: { lat: number; lng: number };
  address: string;
  status: string;
  mapsApiLoaded: boolean;
}

// Cooldown config: skip geolocation attempts if user denied within this window (ms)
const GEO_DENIAL_KEY = "geoDeniedAt";
const GEO_DENIAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
// Cache for last resolved address to avoid flicker/changes between loads
// Client uses its own cache key and a 5-hour TTL
const ADDR_CACHE_KEY = "GMAPS_ADDR_CACHE_CLIENT_V1";
const ADDR_CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5h
interface AddrCache {
  address: string;
  ts: number;
}

// --- Map Modal Component (moved outside) ---
const MapModal: React.FC<MapModalProps> = ({
  show,
  onClose,
  center,
  address,
  status,
  mapsApiLoaded,
}) => {
  if (!show) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Controlled camera state: preserve user zoom and panning
  const [zoom, setZoom] = useState<number>(16);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    center,
  );

  useEffect(() => {
    if (show) {
      setMapCenter(center);
      // keep existing zoom to avoid jarring resets
    }
  }, [show, center.lat, center.lng]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-lg">
        <button
          className="absolute top-3 right-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
          onClick={onClose}
          aria-label="Close map"
          tabIndex={0}
        >
          <span className="text-xl font-bold text-gray-700">&times;</span>
        </button>
        <div className="relative flex-1">
          {/* Recenter button (icon-only, positioned above native zoom +/-) */}
          <button
            type="button"
            className="pointer-events-auto absolute right-3 bottom-24 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-200 hover:bg-gray-50"
            onClick={() => {
              setMapCenter(center);
              setZoom((z) => (typeof z === "number" ? Math.max(z, 16) : 16));
            }}
            aria-label="Recenter map"
            title="Re-center map"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
              <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
            </svg>
          </button>
          {mapsApiLoaded ? (
            <Map
              center={mapCenter}
              zoom={zoom}
              mapId="6922634ff75ae05ac38cc473"
              style={{ width: "100%", height: "100%" }}
              disableDefaultUI={true}
              mapTypeControl={false}
              zoomControl={true}
              streetViewControl={false}
              gestureHandling={"greedy"}
              onCameraChanged={(ev: any) => {
                try {
                  const next = ev?.detail;
                  if (next?.center) setMapCenter(next.center);
                  if (typeof next?.zoom === "number") setZoom(next.zoom);
                } catch {}
              }}
            >
              {/* Keep marker at the provided center (fixed location), not at camera center */}
              <AdvancedMarker position={center} />
            </Map>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading map...
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 bg-white p-3 text-center text-xs text-gray-600">
          {status === "ok" && address !== "Detecting location..."
            ? address
            : `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`}
        </div>
      </div>
    </div>
  );
};

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
            let address = results[0].formatted_address as string;
            // Remove geocode prefix if present (e.g., "geocode, " at the beginning)
            address = address.replace(/^[^,]+,\s*/, "");
            setGmapsAddress(address);
            setGmapsStatus("ok");
            try {
              const payload: AddrCache = { address, ts: Date.now() };
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
    if (!locationLoading && !isAuthLoading) {
      setPlaceholder(
        searchPlaceholders[
          Math.floor(Math.random() * searchPlaceholders.length)
        ],
      );
    }
  }, [locationLoading, isAuthLoading]);

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
            <span className="text-xl font-bold text-gray-800">
              {displayName}
            </span>
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
                className="flex-1 border-none bg-transparent p-0 text-lg text-gray-800 placeholder-gray-500 focus:ring-0 focus:outline-none"
                placeholder={placeholder}
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() =>
                  setShowSuggestions(filteredSuggestions.length > 0)
                }
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute top-full left-0 z-10 w-full rounded-b-xl border border-blue-100 bg-white shadow-lg">
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
        <MapModal
          show={showMap}
          onClose={() => setShowMap(false)}
          center={{ lat: geoLocation.latitude, lng: geoLocation.longitude }}
          address={gmapsAddress}
          status={gmapsStatus}
          mapsApiLoaded={mapsApiLoaded}
        />
      )}
    </APIProvider>
  );
};

export default Header;
