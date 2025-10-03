// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, BellIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import authCanisterService from "../../../services/authCanisterService";
import { useProviderNotifications } from "../../../hooks/useProviderNotificationsWithPush";
import { useLocationStore } from "../../../store/locationStore";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";

// --- Props ---
export interface HeaderProps {
  className?: string;
}

// Google Maps config
const gmapLibraries: "places"[] = ["places"]; // reserve for future autocomplete
const GEO_DENIAL_KEY = "geoDeniedAt";
const GEO_DENIAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

// --- Main Header Component ---
const Header: React.FC<HeaderProps> = ({ className }) => {
  // --- Service Management Hook ---
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Notification count from custom hook
  const { unreadCount } = useProviderNotifications();

  // --- Use Zustand location store ---
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
  } = useLocationStore();

  // Get locationStore separately to avoid dependency issues
  const locationStore = useLocationStore();

  // --- State: User profile ---
  const [profile, setProfile] = useState<any>(null);

  // --- State: Show/hide map modal ---
  const [showMap, setShowMap] = useState(false);

  // --- Display name for welcome message ---
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";

  // --- Effect: Fetch user profile and initialize location ---
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

  // Reverse geocode status
  const [gmapsAddress, setGmapsAddress] = useState<string>(
    "Detecting location...",
  );
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "unsupported" | "failed"
  >("idle");

  // Pre-check denial cooldown
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

  // Load Google Maps script
  const mapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";
  const { isLoaded: mapsReady } = useJsApiLoader({
    id: "header-gmap-script",
    googleMapsApiKey: mapsApiKey,
    libraries: gmapLibraries,
  });

  // Reverse geocode
  useEffect(() => {
    if (!mapsReady) return;
    if (gmapsStatus !== "idle") return;
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
          if (!(window as any).google?.maps) {
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
        } catch {
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
          } catch {}
        } else {
          setGmapsStatus("failed");
          setGmapsAddress("Failed to get location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [mapsReady, gmapsStatus]);

  // Map Modal with Google Maps
  const MapModal: React.FC = () => {
    if (!geoLocation || !geoLocation.latitude || !geoLocation.longitude)
      return null;
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) setShowMap(false);
    };
    const center = { lat: geoLocation.latitude, lng: geoLocation.longitude };
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
            onClick={() => setShowMap(false)}
            aria-label="Close map"
            tabIndex={0}
          >
            <span className="text-xl font-bold text-gray-700">&times;</span>
          </button>
          <div className="flex-1">
            {mapsReady ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={center}
                zoom={16}
                options={{ disableDefaultUI: false, mapTypeControl: false }}
              >
                <Marker position={center} />
              </GoogleMap>
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

  // --- Notification button handler ---
  const handleNotificationsClick = () => {
    navigate("/provider/notifications");
  };

  // --- Render: Header layout ---
  return (
    <header
      className={`w-full max-w-full space-y-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-6 shadow-lg ${className}`}
    >
      {/* --- Desktop Header: Logo, Welcome, Notification Button --- */}
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
        {/* Notification Button with badge */}
        {isAuthenticated && (
          <button
            onClick={handleNotificationsClick}
            className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
            aria-label="Notifications"
          >
            <BellIcon className="h-10 w-10 text-blue-700 transition-colors group-hover:text-yellow-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* --- Mobile Header: Logo, Welcome, Notification Button --- */}
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
              onClick={handleNotificationsClick}
              className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
              aria-label="Notifications"
            >
              <BellIcon className="h-8 w-8 text-blue-600 transition-colors group-hover:text-yellow-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                  {unreadCount}
                </span>
              )}
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

      {/* --- Location Section (search bar removed, location detection restored) --- */}
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
      </div>

      {/* --- Map Modal for Location Display --- */}
      {showMap && <MapModal />}
    </header>
  );
};

export default Header;
