// --- Imports ---
import React, { useState, useEffect } from "react";
import { MapPinIcon, BellIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import authCanisterService from "../../../services/authCanisterService";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useProviderNotifications } from "../../../hooks/useProviderNotificationsWithPush";
import { useLocationStore } from "../../../store/locationStore";

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
              <span className="text-left text-gray-500">
                {userAddress || "Location not set"}
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
