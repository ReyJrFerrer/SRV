// --- Imports ---
import React, { useState, useEffect, useRef } from "react";
import {
  MapPinIcon,
  UserCircleIcon,
  Bars3Icon,
} from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import authCanisterService from "../../../services/authCanisterService";
import { useLocationStore } from "../../../store/locationStore";
import { useLogout } from "../../../hooks/logout";
import MapFunctions, {
  MapFunctionsHandle,
} from "../../common/GMapFunctions/MapFunctions";

// --- Props ---
export interface HeaderProps {
  className?: string;
  scrollTargetRef?: React.RefObject<HTMLElement>;
}

// Map functions extracted into components/common/GMapFunctions/MapFunctions

// --- Main Header Component ---
const Header: React.FC<HeaderProps> = ({ className, scrollTargetRef }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { logout } = useLogout();

  // --- Use Zustand location store ---
  const { locationStatus, addressMode } = useLocationStore();

  // Get requestLocation function separately to avoid dependency issues
  const locationStore = useLocationStore();

  const [profile, setProfile] = useState<any>(null);
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";
  const primaryMapRef = useRef<MapFunctionsHandle | null>(null);
  const miniMapRef = useRef<MapFunctionsHandle | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Effect: fetch user profile when auth loads (location handled by post-login modal)
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
    };

    if (!isAuthLoading) {
      loadInitialData();
    }
  }, [isAuthenticated, isAuthLoading]);

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

  const handleProfileClick = () => {
    navigate("/provider/profile");
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
    { label: "Profile", to: "/provider/profile" },
    { label: "My Services", to: "/provider/services" },
    { label: "Wallet", to: "/provider/wallet" },
    { label: "Settings", to: "/provider/settings" },
    { label: "Terms & Conditions", to: "/provider/terms" },
    { label: "Report", to: "/provider/report" },
    { label: "Help & Support", to: "/provider/help" },
  ];

  const handleMenuClick = (to: string) => {
    setShowMenu(false);
    navigate(to);
  };

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  // --- Sticky mini header behavior (provider shows only location) with hysteresis + layout preservation ---
  const headerRef = useRef<HTMLDivElement | null>(null);
  // const [setHeaderHeight] = useState<number | null>(null);
  const [isMini, setIsMini] = useState(false);
  useEffect(() => {
    // Hysteresis + rAF; robustly pick the correct scroll source (container or window)
    const candidate = scrollTargetRef?.current ?? null;
    const isScrollable = (el: HTMLElement | null) =>
      !!el && el.scrollHeight > el.clientHeight + 1;
    const targetEl: Window | HTMLElement = isScrollable(candidate)
      ? (candidate as HTMLElement)
      : window;

    const getScrollY = () =>
      targetEl instanceof Window ? targetEl.scrollY : targetEl.scrollTop || 0;
    let ticking = false;
    const ENTER_MINI_AT = 140;
    const EXIT_MINI_BELOW = 100;

    const onScroll = () => {
      const y = getScrollY();
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsMini((prev) => {
            if (!prev && y > ENTER_MINI_AT) return true;
            if (prev && y < EXIT_MINI_BELOW) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    // Attach listener to chosen target; also attach to window if different to catch both flows
    if (targetEl instanceof Window) {
      targetEl.addEventListener("scroll", onScroll, { passive: true });
    } else {
      targetEl.addEventListener(
        "scroll",
        onScroll as EventListener,
        { passive: true } as AddEventListenerOptions,
      );
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      if (targetEl instanceof Window) {
        targetEl.removeEventListener("scroll", onScroll);
      } else {
        targetEl.removeEventListener("scroll", onScroll as EventListener);
        window.removeEventListener("scroll", onScroll);
      }
    };
  }, [scrollTargetRef]);

  // Toggle a body class so global layout can compensate for the fixed mini overlay
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isMini) document.body.classList.add("has-mini-header");
    else document.body.classList.remove("has-mini-header");
    return () => document.body.classList.remove("has-mini-header");
  }, [isMini]);

  // Measure header height and keep it as a minHeight when the mini overlay is shown
  // React.useLayoutEffect(() => {
  //   const measure = () => {
  //     if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
  //   };
  //   measure();
  //   window.addEventListener("resize", measure);
  //   return () => window.removeEventListener("resize", measure);
  // }, []);

  // --- Render: Header layout ---
  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 z-40 w-full max-w-full rounded-b-2xl border-b border-gray-100 bg-white p-4 shadow-sm backdrop-blur-md ${className}`}
      >
        {/* Full header content always rendered; visually hidden when mini is active to prevent layout jump */}
        <div
          className={`space-y-4 transition-all duration-300 ease-in-out ${isMini ? "pointer-events-none invisible h-0 opacity-0" : "visible opacity-100"}`}
        >
          {/* --- Desktop Header: Logo, Welcome, Profile Button --- */}
          <div className="hidden items-center justify-between md:flex">
            <div className="flex items-center space-x-6">
              <Link to="/provider/home">
                <img
                  src="/logo.svg"
                  alt="SRV Logo"
                  className="h-12 w-auto transition-transform duration-300 hover:scale-105"
                />
              </Link>
              <div className="h-8 border-l border-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  Welcome, {displayName}
                </span>
              </div>
            </div>
            {/* Profile Button */}
            {isAuthenticated && (
              <button
                onClick={handleProfileClick}
                className="group relative rounded-full bg-gray-50 p-2 transition-all hover:bg-gray-100"
                aria-label="Profile"
              >
                <UserCircleIcon className="h-8 w-8 text-gray-700 group-hover:text-blue-600" />
              </button>
            )}
          </div>

          {/* --- Mobile Header: Logo, Welcome, Profile Button --- */}
          <div className="flex items-center justify-between md:hidden">
            <Link to="/provider/home">
              <img
                src="/logo.svg"
                alt="SRV Logo"
                className="h-10 w-auto transition-transform duration-300 hover:scale-105"
              />
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold tracking-tight text-gray-900">
                Hi, {displayName}
              </span>
              {isAuthenticated && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="group relative rounded-full bg-gray-50 p-1.5 transition-all hover:bg-gray-100"
                    aria-label="Menu"
                  >
                    <Bars3Icon className="h-7 w-7 text-gray-700 group-hover:text-blue-600" />
                  </button>

                  {showMenu && (
                    <div className="animate-slide-in absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-100 bg-white shadow-lg">
                      <div className="py-2">
                        {menuItems.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => handleMenuClick(item.to!)}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            {item.label}
                          </button>
                        ))}
                        <div className="my-2 border-t border-gray-100" />
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-gray-50"
                        >
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- Location Section --- */}
          <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 shadow-sm transition-all duration-300 ease-in-out">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={handleLocationClick}
                disabled={
                  addressMode === "context" && locationStatus === "allowed"
                }
                className="flex items-center gap-2 text-left focus:outline-none disabled:cursor-not-allowed"
                aria-label="Open my location details"
              >
                <MapPinIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-bold uppercase tracking-wider text-gray-800">
                  My Location
                </span>
              </button>
            </div>
            <div className="mt-2">
              <MapFunctions ref={primaryMapRef} />
            </div>
          </div>
        </div>
      </header>
      {/* Mini sticky header as a fixed overlay so it always shows regardless of nesting/overflow */}
      {isMini && (
        <div className="mini-header fixed inset-x-0 top-0 z-50 w-full pt-[env(safe-area-inset-top)]">
          <div className="w-full border-b border-gray-100 bg-white/95 p-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2 pb-1">
              <MapPinIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-bold uppercase tracking-wider text-gray-800">
                My Location
              </span>
            </div>
            <div className="-mt-1 flex items-center gap-2">
              <MapFunctions ref={miniMapRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
