// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useServiceManagement } from "../../hooks/serviceManagement";
import authCanisterService from "../../services/authCanisterService";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import ActiveService from "../../components/client/ActiveService";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --- Props ---
export interface HeaderProps {
  className?: string;
}

// --- Fix leaflet marker icon for proper display ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// --- Main Header Component ---
const Header: React.FC<HeaderProps> = ({ className }) => {
  // --- Service Management Hook ---
  const { services } = useServiceManagement();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // --- State: Geolocation for map modal ---
  const [geoLocation, setGeoLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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

  // --- State: Location display ---
  const [userAddress, setUserAddress] = useState<string>("");
  const [userProvince, setUserProvince] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(true);

  // --- State: Show/hide map modal ---
  const [showMap, setShowMap] = useState(false);

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

  // Effect: fetch user profile and location info after auth
  // --- Effect: Fetch user profile and detect location on mount ---
  useEffect(() => {
    // Helper: retry fetch with delay (for OpenStreetMap reverse geocoding)
    const fetchWithRetry = async (
      url: string,
      attempts: number,
      delayMs: number,
    ): Promise<any> => {
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error("Fetch failed");
          return await res.json();
        } catch (err) {
          if (i < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
      throw new Error("All fetch attempts failed");
    };

    // Main: load profile and location
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
      setLocationLoading(true);
      // Request geolocation from browser
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setGeoLocation({ latitude, longitude });
            try {
              const data = await fetchWithRetry(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                3, // attempts
                1500, // delay ms
              );
              if (data && data.address) {
                const { city, town, village, county, state, region, province } =
                  data.address;
                // Special case: Baguio
                let cityPart = city || town || village || "";
                let provinceVal = county || state || region || province || "";
                if (
                  (cityPart.toLowerCase() === "baguio" ||
                    cityPart.toLowerCase() === "baguio city") &&
                  [
                    "cordillera administrative region",
                    "car",
                    "region",
                  ].includes(provinceVal.toLowerCase())
                ) {
                  cityPart = "Baguio City";
                  provinceVal = "Benguet";
                }
                // Only set city/municipality and province, do not include other details
                setUserAddress(cityPart || "Could not determine city");
                setUserProvince(provinceVal);
                // Cache the address for faster subsequent loads
                if (
                  location &&
                  "latitude" in location &&
                  "longitude" in location
                ) {
                  localStorage.setItem(
                    `address_${location.latitude}_${location.longitude}`,
                    JSON.stringify({
                      address: cityPart,
                      province: provinceVal,
                    }),
                  );
                }
              } else {
                setUserAddress("Could not determine city");
                setUserProvince("");
              }
              setLocationLoading(false);
            } catch (err) {
              setUserAddress("Could not determine city");
              setUserProvince("");
              setLocationLoading(false);
            }
          },
          () => {
            // Permission denied or error
            setLocationLoading(false);
            setUserAddress("");
            setUserProvince("");
            setGeoLocation(null);
          },
        );
      } else {
        setLocationLoading(false);
        setUserAddress("");
        setUserProvince("");
        setGeoLocation(null);
      }
    };
    if (!isAuthLoading) {
      loadInitialData();
    }
    // Only run once after auth loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAuthLoading]);

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

  // --- Map Modal: Shows user's detected location on a map ---
  const MapModal: React.FC = () => {
    if (!geoLocation || !geoLocation.latitude || !geoLocation.longitude)
      return null;
    // Close modal if background is clicked
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setShowMap(false);
      }
    };
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex h-[70vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
          {/* Close Button */}
          <button
            className="absolute top-3 right-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
            onClick={() => setShowMap(false)}
            aria-label="Close map"
            tabIndex={0}
          >
            <span className="text-xl font-bold text-gray-700">&times;</span>
          </button>
          <div className="flex-1 overflow-hidden rounded-b-lg">
            <MapContainer
              center={[geoLocation.latitude, geoLocation.longitude]}
              zoom={16}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[geoLocation.latitude, geoLocation.longitude]}>
                <Popup>You are here</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      </div>
    );
  };

  // --- Handler: search input change ---
  // Only one handler should exist. The correct handler is defined above with dynamicSuggestions.

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
              Welcome Back,{" "}
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
            Welcome Back,
          </span>
          <span className="text-xl font-bold text-gray-800">{displayName}</span>
        </div>
      </div>
      <ActiveService />

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
            {locationLoading || isAuthLoading ? (
              <span className="animate-pulse text-gray-500">
                Detecting location...
              </span>
            ) : userAddress && userProvince ? (
              <button
                type="button"
                className="text-left font-medium text-blue-900 transition-all duration-200 hover:text-lg hover:text-blue-700 focus:outline-none"
                style={{ textDecoration: "none" }}
                onClick={() => setShowMap(true)}
              >
                {userAddress}, {userProvince}
              </button>
            ) : (
              <span className="text-left text-gray-500">Location not set</span>
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
              onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
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

      {/* --- Map Modal for Location Display --- */}
      {showMap && <MapModal />}
    </header>
  );
};

export default Header;
