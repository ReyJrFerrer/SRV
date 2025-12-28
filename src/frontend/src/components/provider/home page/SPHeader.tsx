// --- Imports ---
import React, { useState, useEffect, useRef } from "react";
import { MapPinIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import authCanisterService from "../../../services/authCanisterService";
import { useLocationStore } from "../../../store/locationStore";
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
  
  // --- Use Zustand location store ---
  const { locationStatus, addressMode } = useLocationStore();
  
  // Get requestLocation function separately to avoid dependency issues
  const locationStore = useLocationStore();
  
  const [profile, setProfile] = useState<any>(null);
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";
  const primaryMapRef = useRef<MapFunctionsHandle | null>(null);
  const miniMapRef = useRef<MapFunctionsHandle | null>(null);

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
        className={`sticky top-0 z-40 w-full max-w-full rounded-2xl border border-blue-100 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-4 px-4 shadow-lg backdrop-blur ${className}`}
      >
        {/* Full header content always rendered; visually hidden when mini is active to prevent layout jump */}
        <div
          className={`space-y-6 transition-all duration-300 ease-in-out ${isMini ? "pointer-events-none invisible opacity-0" : "visible opacity-100"}`}
        >
          {/* --- Desktop Header: Logo, Welcome, Notification Button --- */}
          <div className="hidden items-center justify-between md:flex">
            <div className="flex items-center space-x-6">
              <Link to="/provider/home">
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
                  <span className="text-2xl font-bold text-gray-800">
                    {displayName}
                  </span>
                </span>
              </div>
            </div>
            {/* Profile Button */}
            {isAuthenticated && (
              <button
                onClick={handleProfileClick}
                className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
                aria-label="Profile"
              >
                <UserCircleIcon className="h-10 w-10 text-blue-700 transition-colors group-hover:text-yellow-500" />
              </button>
            )}
          </div>

          {/* --- Mobile Header: Logo, Welcome, Notification Button --- */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              <Link to="/provider/home">
                <img
                  src="/logo.svg"
                  alt="SRV Logo"
                  className="h-16 w-auto drop-shadow-md transition-transform duration-300 hover:scale-110"
                />
              </Link>
              {isAuthenticated && (
                <button
                  onClick={handleProfileClick}
                  className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
                  aria-label="Profile"
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
              <span className="text-xl font-bold text-gray-800">
                {displayName}
              </span>
            </div>
          </div>

          {/* --- Location Section --- */}
          <div className="rounded-2xl border border-blue-100 bg-yellow-200 p-6 shadow transition-all duration-300 ease-in-out">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                 <button
                  type="button"
                  onClick={handleLocationClick}
                  disabled={addressMode === "context" && locationStatus === "allowed"}
                  className="flex items-center gap-2 rounded-xl border border-transparent bg-white/0 text-left transition hover:border-blue-200 focus:border-blue-300 focus:outline-none disabled:cursor-not-allowed"
                  aria-label="Open my location details"
                >
                  <MapPinIcon className="h-6 w-6 text-blue-600" />
                  <span className="text-base font-bold text-gray-800">
                    My Location
                  </span>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <MapFunctions ref={primaryMapRef} />
            </div>
          </div>
        </div>
      </header>
      {/* Mini sticky header as a fixed overlay so it always shows regardless of nesting/overflow */}
      {isMini && (
        <div className="mini-header fixed inset-x-0 top-0 z-50 w-full pt-[env(safe-area-inset-top)]">
          <div className="w-full rounded-b-xl border border-blue-100 bg-yellow-100/90 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
            <div className="flex items-center gap-2 pb-1">
              <MapPinIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">
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
