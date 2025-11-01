// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, BellIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import authCanisterService from "../../../services/authCanisterService";
import { useProviderNotifications } from "../../../hooks/useProviderNotificationsWithPush";
import { useLocationStore } from "../../../store/locationStore";
import EnableLocationButton from "../../common/EnableLocationButton";
import { APIProvider } from "@vis.gl/react-google-maps";
import LocationMapModal from "../../common/LocationMapModal";

// --- Props ---
export interface HeaderProps {
  className?: string;
}

// Map modal moved to components/common/LocationMapModal

// Google Maps config (reserved for future autocomplete)
const GEO_DENIAL_KEY = "geoDeniedAt";
const GEO_DENIAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
const ADDR_CACHE_KEY = "GMAPS_ADDR_CACHE_PROVIDER_V1";
const ADDR_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
interface AddrCache {
  address: string;
  ts: number;
}

// (removed inline MapModal; using LocationMapModal instead)

// --- Main Header Component ---
const Header: React.FC<HeaderProps> = ({ className }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { unreadCount } = useProviderNotifications();
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
    requestLocation,
    locationStatus,
  } = useLocationStore();
  const [profile, setProfile] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";
  const [gmapsAddress, setGmapsAddress] = useState<string>(
    "Detecting location...",
  );
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "unsupported" | "failed"
  >("idle");
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);

  const mapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";

  useEffect(() => {
    const loadInitialData = async () => {
      if (isAuthenticated) {
        try {
          const userProfile = await authCanisterService.getMyProfile();
          setProfile(userProfile);
        } catch (error) {
          /* Profile fetch failed */
        }
      }
      if (!isAuthLoading) {
        requestLocation();
      }
    };
    if (!isAuthLoading) {
      loadInitialData();
    }
  }, [isAuthenticated, isAuthLoading, requestLocation]);

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

  // Seed from cache and mark API loaded
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
    if ((window as any).google?.maps) setMapsApiLoaded(true);
  }, []);

  // Reverse geocode using detected store location (no direct geolocation call)
  useEffect(() => {
    if (!mapsApiLoaded || !geoLocation || gmapsStatus !== "idle") return;
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      setGmapsStatus("loading");
      geocoder.geocode(
        { location: { lat: geoLocation.latitude, lng: geoLocation.longitude } },
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
  }, [mapsApiLoaded, gmapsStatus, geoLocation]);

  const handleNotificationsClick = () => {
    navigate("/provider/notifications");
  };

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

  // --- Render: Header layout ---
  return (
    <APIProvider apiKey={mapsApiKey}>
      <header
        className={`w-full max-w-full space-y-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-6 shadow-lg ${className}`}
      >
        {/* --- Desktop Header: Logo, Welcome, Notification Button --- */}
        <div className="hidden items-center justify-between md:flex">
          <div className="flex items-center space-x-6">
            <Link to="/provider/home">
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
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
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
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
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
            <span className="text-xl font-bold text-gray-800">
              {displayName}
            </span>
          </div>
        </div>

        {/* --- Location Section (search bar removed, location detection restored) --- */}
        <div className="rounded-2xl border border-blue-100 bg-yellow-200 p-6 shadow">
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
              {/* Coordinates/accuracy debug chip removed */}
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
        </div>
      </header>
      {/* --- Map Modal for Location Display --- */}
      {mapsApiLoaded && geoLocation && (
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
