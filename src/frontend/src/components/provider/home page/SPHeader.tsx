// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, BellIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import authCanisterService from "../../../services/authCanisterService";
import { useProviderNotifications } from "../../../hooks/useProviderNotificationsWithPush";
import { useLocationStore } from "../../../store/locationStore";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

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

// Google Maps config (reserved for future autocomplete)
const GEO_DENIAL_KEY = "geoDeniedAt";
const GEO_DENIAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

// --- Map Modal Component (outside) ---
const MapModal: React.FC<MapModalProps> = ({ show, onClose, center, address, status, mapsApiLoaded }) => {
  if (!show) return null;
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  // Controlled camera state to preserve zoom/position across re-renders
  const [zoom, setZoom] = useState<number>(16);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(center);

  useEffect(() => {
    // When modal opens or the provided center changes, sync the controlled state
    if (show) {
      setMapCenter(center);
      // don't forcibly reset zoom if user already changed it in-session
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
          className="absolute right-3 top-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
          onClick={onClose}
          aria-label="Close map"
          tabIndex={0}
        >
          <span className="text-xl font-bold text-gray-700">&times;</span>
        </button>
        <div className="relative flex-1">
          {/* Recenter button */}
          <button
            type="button"
            className="pointer-events-auto absolute right-3 top-3 z-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
            onClick={() => {
              setMapCenter(center);
              setZoom((z) => (typeof z === 'number' ? Math.max(z, 16) : 16));
            }}
            aria-label="Recenter map"
          >
            Recenter
          </button>
          {mapsApiLoaded ? (
            <Map
              center={mapCenter}
              zoom={zoom}
              mapId="6922634ff75ae05ac38cc473"
              style={{ width: "100%", height: "100%" }}
              disableDefaultUI={false}
              mapTypeControl={false}
              zoomControl={true}
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
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading map...</div>
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
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { unreadCount } = useProviderNotifications();
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
    requestLocation,
  } = useLocationStore();
  const [profile, setProfile] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";
  const [gmapsAddress, setGmapsAddress] = useState<string>("Detecting location...");
  const [gmapsStatus, setGmapsStatus] = useState<"idle" | "loading" | "ok" | "denied" | "unsupported" | "failed">("idle");
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";

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
      const raw = typeof window !== "undefined" ? localStorage.getItem(GEO_DENIAL_KEY) : null;
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

  // Mark API loaded once Google script is present
  useEffect(() => {
    if ((window as any).google?.maps) {
      setMapsApiLoaded(true);
    }
  }, []);

  // Reverse geocode using detected location
  useEffect(() => {
    if (!mapsApiLoaded || !geoLocation || gmapsStatus !== "idle") return;
    if (!("geolocation" in navigator)) {
      setGmapsStatus("unsupported");
      setGmapsAddress("Geolocation not supported");
      return;
    }
    setGmapsStatus("loading");
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode(
      { location: { lat: geoLocation.latitude, lng: geoLocation.longitude } },
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
  }, [mapsApiLoaded, gmapsStatus, geoLocation]);

  const handleNotificationsClick = () => {
    navigate("/provider/notifications");
  };

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

      </header>
      {/* --- Map Modal for Location Display --- */}
      {mapsApiLoaded && geoLocation && (
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
