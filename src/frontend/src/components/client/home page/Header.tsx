import React, { useState, useEffect, useRef } from "react";
import {
  MapPinIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useServiceManagement } from "../../../hooks/serviceManagement";
import authCanisterService from "../../../services/authCanisterService";
import MapFunctions, {
  MapFunctionsHandle,
} from "../../common/GMapFunctions/MapFunctions";
import { useLocationStore } from "../../../store/locationStore";
import { useLogout } from "../../../hooks/logout";

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
  const { logout } = useLogout();

  // --- Use Zustand location store ---
  const { locationLoading, locationStatus, addressMode } = useLocationStore();

  // Get requestLocation function separately to avoid dependency issues
  const locationStore = useLocationStore();

  // --- State: User profile ---
  const [profile, setProfile] = useState<any>(null);

  // --- State: Search bar ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // --- Sticky mini header behavior with hysteresis + layout preservation ---
  const headerRef = useRef<HTMLDivElement | null>(null);
  // const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [isMini, setIsMini] = useState(false);
  const [showMiniLocation, setShowMiniLocation] = useState(false);
  const primaryMapRef = useRef<MapFunctionsHandle | null>(null);
  const miniMapRef = useRef<MapFunctionsHandle | null>(null);
  useEffect(() => {
    // Add hysteresis + rAF throttling to avoid rapid toggle near boundary
    let lastY = window.scrollY;
    let ticking = false;
    const ENTER_MINI_AT = 140; // px
    const EXIT_MINI_BELOW = 100; // px

    const onScroll = () => {
      const y = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsMini((prev) => {
            if (!prev && y > ENTER_MINI_AT) return true;
            if (prev && y < EXIT_MINI_BELOW) return false;
            return prev;
          });

          const delta = y - lastY;
          if (y > ENTER_MINI_AT) {
            if (delta < -8) setShowMiniLocation(true);
            else if (delta > 8) setShowMiniLocation(false);
          } else {
            setShowMiniLocation(false);
          }
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Toggle body class so global layout can compensate for fixed mini overlay
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isMini) document.body.classList.add("has-mini-header");
    else document.body.classList.remove("has-mini-header");
    return () => document.body.classList.remove("has-mini-header");
  }, [isMini]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // --- Menu items ---
  const menuItems = [
    { label: "Profile", to: "/client/profile" },
    { label: "Settings", to: "/client/settings" },
    { label: "Terms & Conditions", to: "/client/terms" },
    { label: "Report", to: "/client/report" },
    { label: "Help & Support", to: "/client/help" },
  ];

  const handleMenuClick = (to: string) => {
    setShowMenu(false);
    navigate(to);
  };

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  // --- State: Search suggestions ---
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim().length > 0) {
      // Combine service names and provider names for suggestions
      const serviceNames = Array.from(
        new Set(
          services.map((service) => service.title).filter((name) => !!name),
        ),
      );
      const providerNames = Array.from(
        new Set(
          services
            .map((service) => service.providerName)
            .filter((name) => !!name),
        ),
      );
      const allSuggestions = [...serviceNames, ...providerNames];
      const filtered = allSuggestions
        .filter((suggestion): suggestion is string => !!suggestion)
        .filter((suggestion) =>
          suggestion.toLowerCase().includes(value.toLowerCase()),
        );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Effect: fetch user profile when auth loads (location handled by post-login modal)
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
    };

    if (!isAuthLoading) {
      loadInitialData();
    }
  }, [isAuthenticated, isAuthLoading, locationStore]);

  // Effect: Monitor permission state changes to detect when user enables/disables location
  useEffect(() => {
    let isMounted = true;
    let permissionStatus: PermissionStatus | null = null;
    let previousState: PermissionState | null = null;

    const checkPermission = async () => {
      if (typeof navigator === "undefined" || !(navigator as any).permissions)
        return;

      try {
        permissionStatus = await (navigator as any).permissions.query({
          name: "geolocation",
        });
        previousState = permissionStatus!.state;

        const handlePermissionChange = () => {
          if (!isMounted || !permissionStatus) return;

          const currentState = permissionStatus.state;

          // When permission changes from denied/prompt to granted, fetch location automatically
          if (
            (previousState === "denied" || previousState === "prompt") &&
            currentState === "granted"
          ) {
            // Automatically request location and switch to automatic mode
            locationStore.requestLocation(true);
          }
          // When permission changes to denied, trigger the store handler
          else if (currentState === "denied") {
            locationStore.handlePermissionDenied();
          }

          previousState = currentState;
        };

        permissionStatus!.onchange = handlePermissionChange;
      } catch {
        // Ignore errors (older browsers)
      }
    };

    checkPermission();

    return () => {
      isMounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [locationStore]);

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

  const handleLocationClick = () => {
    if (primaryMapRef.current?.openChangeLocation) {
      primaryMapRef.current.openChangeLocation();
      return;
    }
    if (miniMapRef.current?.openChangeLocation) {
      miniMapRef.current.openChangeLocation();
    }
  };

  // --- Handler: suggestion click for search bar ---
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Redirect to search results page with the selected suggestion
    navigate(`/client/search-results?query=${encodeURIComponent(suggestion)}`);
  };

  // --- Display name for welcome message ---
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";

  // --- Render: Header layout ---
  return (
    <>
      <header
        ref={headerRef}
        data-tour="client-header"
        // style={{ minHeight: headerHeight ? `${headerHeight}px` : undefined }}
        className={`sticky top-0 z-40 w-full max-w-full rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm ${className}`}
      >
        {/* Full header content always rendered; visually hidden when mini is active to prevent layout jump */}
        <div
          className={`space-y-6 transition-all duration-300 ease-in-out ${isMini ? "pointer-events-none invisible opacity-0" : "visible opacity-100"}`}
        >
          {/* --- Desktop Header: Logo, Welcome, Profile Button --- */}
          <div className="hidden items-center justify-between md:flex">
            <div className="flex items-center space-x-6">
              <Link to="/client/home">
                <img
                  src="/logo.svg"
                  alt="SRV Logo"
                  className="h-20 w-auto drop-shadow-md transition-transform duration-300 hover:scale-110"
                />
              </Link>
              <div className="h-10 border-l-2 border-blue-100"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tracking-wide text-blue-700">
                  Welcome,{" "}
                  <span className="text-2xl font-bold text-gray-900">
                    {displayName}
                  </span>
                </span>
              </div>
            </div>
            {isAuthenticated && (
              <button
                onClick={handleProfileClick}
                className="group relative rounded-full bg-white p-2 shadow-sm transition-all hover:scale-105 hover:shadow-md"
              >
                <UserCircleIcon className="h-10 w-10 text-yellow-500 transition-colors group-hover:text-yellow-600" />
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
                  className="h-16 w-auto drop-shadow-md transition-transform duration-300 hover:scale-110"
                />
              </Link>
              {isAuthenticated && (
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="group relative rounded-full bg-white p-2 shadow-sm transition-all hover:scale-105 hover:shadow-md"
                >
                  <Bars3Icon className="h-8 w-8 text-blue-600 transition-colors group-hover:text-blue-700" />
                </button>
              )}
            </div>
            <hr className="my-4 border-yellow-200" />
            <div className="flex flex-row flex-wrap items-baseline gap-x-2 gap-y-0">
              <span className="text-xl font-semibold tracking-wide text-blue-700">
                Welcome,
              </span>
              <span className="text-xl font-bold text-gray-900">
                {displayName}
              </span>
            </div>
          </div>

          {/* --- Location & Search Section --- */}
          <div
            data-tour="client-search"
            className="rounded-xl border border-yellow-300 bg-yellow-100 p-5 shadow-sm transition-all duration-300 ease-in-out"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={handleLocationClick}
                disabled={
                  addressMode === "context" && locationStatus === "allowed"
                }
                className="flex items-center gap-2 rounded-xl border border-transparent bg-white/0 text-left transition hover:border-blue-200 focus:border-blue-300 focus:outline-none disabled:cursor-not-allowed"
                aria-label="Open my location details"
              >
                <MapPinIcon className="h-6 w-6 text-yellow-500" />
                <span className="text-base font-bold text-gray-800">
                  My Location
                </span>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <MapFunctions ref={primaryMapRef} />
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
              <div className="relative flex w-full items-center rounded-xl border border-gray-300 bg-white p-3 shadow-sm transition-all duration-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type="text"
                  className="w-full border-none bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 md:text-lg lg:text-xl"
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() =>
                    setShowSuggestions(filteredSuggestions.length > 0)
                  }
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 100)
                  }
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <ul className="absolute left-0 top-full z-10 w-full rounded-b-xl border border-gray-200 bg-white shadow-md">
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
        </div>
      </header>
      {/* Mini sticky header as a fixed overlay so it always shows regardless of nesting/overflow */}
      {isMini && (
        <div className="mini-header fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
          <div className="w-full rounded-b-xl border-b border-yellow-300 bg-yellow-100 p-3 shadow-sm">
            {/* Location row (reveals on slight scroll-up) */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                showMiniLocation
                  ? "max-h-16 translate-y-0 opacity-100"
                  : "max-h-0 -translate-y-1 opacity-0"
              }`}
            >
              <div className="-mt-1 mb-1 ml-1 flex items-center gap-2">
                <MapFunctions ref={miniMapRef} />
              </div>
            </div>

            {/* Search row (always visible) */}
            <form
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(
                    `/client/search-results?query=${encodeURIComponent(searchQuery)}`,
                  );
                }
              }}
            >
              <div className="relative flex w-full items-center rounded-xl border border-gray-300 bg-white p-3 shadow-sm transition-all duration-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  className="w-full border-none bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 md:text-lg lg:text-xl"
                  placeholder={placeholder}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <ul className="absolute left-0 top-full z-50 w-full rounded-b-xl border border-gray-200 bg-white shadow-md">
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
        </div>
      )}

      {/* Slide-out Menu */}
      {showMenu && (
        <>
          <div
            className="animate-fade-in fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowMenu(false)}
          />
          <div className="animate-slide-in-from-right fixed right-0 top-0 z-50 h-full w-[65%] max-w-[280px] bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleMenuClick(item.to!)}
                    className="w-full px-4 py-4 text-left text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 py-4">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-4 text-left text-base font-medium text-red-600 hover:bg-gray-50"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
