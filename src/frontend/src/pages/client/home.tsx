import React, { useEffect, useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
// feedback popup moved to a separate component
import FeedbackPopup from "../../components/common/FeedbackPopup";
import Categories from "../../components/client/home page/Categories";
import ServiceList from "../../components/client/home page/ServiceListRow";
import BottomNavigation from "../../components/client/NavigationBar";
import { useServiceManagement } from "../../hooks/serviceManagement";

import ClientHeader from "../../components/client/home page/Header";
import LocationBlockedModal from "../../components/common/locationAccessPermission/LocationBlockedModal";
import LocationPermissionPromptModal from "../../components/common/locationAccessPermission/LocationPermissionPromptModal";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowPathRoundedSquareIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useNavigate, useLocation } from "react-router-dom";
import { useLocationStore } from "../../store/locationStore";
// import PWAInstall from "../../components/PWAInstall";
// import NotificationSettings from "../../components/NotificationSettings";

// --- Client Home Page ---
const ClientHomePage: React.FC = () => {
  //Navigation
  const navigate = useNavigate();
  // --- State: Service category error ---
  const { error } = useServiceManagement();

  // --- Use Zustand location store for location permission status ---
  const { locationStatus } = useLocationStore();

  // --- State: Button loading for provider CTA ---
  const [beProviderLoading, setBeProviderLoading] = useState(false);
  const { switchRole } = useUserProfile();

  // --- Dismissible location overlay state ---
  const [dismissedLocationBlock, setDismissedLocationBlock] = useState<boolean>(
    () => {
      try {
        return sessionStorage.getItem("dismissedLocationBlock") === "1";
      } catch {
        return false;
      }
    },
  );

  // Fallback: Permissions API check for geolocation denied state.
  // This covers cases where the location store hasn't initialized but the
  // browser already has location blocked for the site.
  const [permissionApiDenied, setPermissionApiDenied] = useState(false);
  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== "undefined" && (navigator as any).permissions) {
      try {
        (navigator as any).permissions
          .query({ name: "geolocation" })
          .then((p: any) => {
            if (!mounted) return;
            if (p && p.state === "denied") setPermissionApiDenied(true);
            if (p && typeof p.onchange === "function") {
              p.onchange = () => {
                if (!mounted) return;
                setPermissionApiDenied(p.state === "denied");
              };
            }
          })
          .catch(() => {});
      } catch {}
    }
    return () => {
      mounted = false;
    };
  }, []);

  // --- Effect: Set page title on mount ---
  useEffect(() => {
    document.title = "Home | SRV";
  }, []);

  // --- Post-login prompt controls from AuthContext ---
  const {
    postLoginLocationPromptVisible,
    requestLocationFromPrompt,
    skipPostLoginLocationPrompt,
    postLoginBlockedModalVisible,
    acknowledgePostLoginBlockedModal,
    showPostLoginLocationPrompt,
  } = useAuth();

  const location = useLocation();

  // If we arrived from create-profile with the navigation state asking for the
  // post-login prompt, trigger it now. This covers the create-profile -> Home
  // redirect case where the AuthContext decision is owned by auth but the UI
  // is rendered by Home.
  useEffect(() => {
    const shouldShow = (location.state as any)?.postLoginLocationPrompt;
    if (shouldShow) {
      showPostLoginLocationPrompt();
      try {
        // Clear the navigation state so we don't retrigger on future mounts
        navigate(location.pathname, { replace: true, state: {} });
      } catch {
        // ignore navigation replace errors
      }
    }
  }, [location, showPostLoginLocationPrompt]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-32">
      {/* Feedback popup after first completed booking (extracted) */}
      <FeedbackPopup />

      {/* Show location blocked message if location is denied (dismissible) */}
      {/* Post-login: friendly permission prompt (rendered here so Home can control messaging/placement) */}
      {/* Only show the friendly permission prompt when the permission state is unknown */}
      <LocationPermissionPromptModal
        visible={postLoginLocationPromptVisible && locationStatus === "not_set"}
        onEnable={async () => {
          // Request device location via the store (AuthContext helper tracks awaiting state)
          try {
            await requestLocationFromPrompt();
          } catch {}
        }}
        onSkip={() => {
          // Hide prompt and show blocked/manual-selection modal
          skipPostLoginLocationPrompt();
        }}
        onClose={() => {
          skipPostLoginLocationPrompt();
        }}
      />

      {/* Manual/blocked modal triggered either by denied status or by the post-login flow.
          Render a single modal to avoid duplicates and handle close for both cases. */}
      {(() => {
        const visible =
          (locationStatus === "denied" && !dismissedLocationBlock) ||
          (permissionApiDenied && !dismissedLocationBlock) ||
          postLoginBlockedModalVisible;

        const handleBlockedClose = () => {
          // Always mark the blocked modal as dismissed for this session so it
          // doesn't immediately reappear after the user picks a manual
          // location or closes the modal. Previously we only set this when
          // `locationStatus === 'denied'`, which missed cases where the
          // Permissions API reported denied but the store hadn't updated yet.
          setDismissedLocationBlock(true);
          try {
            sessionStorage.setItem("dismissedLocationBlock", "1");
          } catch {}

          // Also acknowledge any post-login blocked modal flag so the
          // AuthContext flow doesn't reopen the modal.
          if (postLoginBlockedModalVisible) {
            acknowledgePostLoginBlockedModal();
          }
        };

        return (
          <LocationBlockedModal
            visible={visible}
            onClose={handleBlockedClose}
          />
        );
      })()}

      {/* Error: Service categories failed to load */}
      {error && (
        <div className="mx-4 mt-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <span className="block sm:inline">
            Failed to load categories: {error}
          </span>
        </div>
      )}
      {/* Main content: header, categories, service list */}

      {/**  <PWAInstall />
       *
       * <NotificationSettings />
       */}

      <div className="w-full max-w-full px-4 pb-16 pt-4">
        {/* Header: displays welcome and location */}
        <ClientHeader className="mb-6 w-full max-w-full" />
        {/* Categories section */}
        <h2 className="mb-2 text-left text-xl font-bold">Categories</h2>
        <Categories
          className="mb-8 w-full max-w-full"
          moreButtonImageUrl="/images/categories/more.svg"
          lessButtonImageUrl="/images/categories/more.svg"
        />
        {/* Service list section */}
        <ServiceList className="w-full max-w-full" />
      </div>
      {/* Call-to-action: Become a SRVice Provider (non-sticky) */}
      <div className="flex w-full flex-col items-center justify-center">
        <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-blue-100 bg-white p-6 shadow-lg">
          <h3 className="mb-2 text-center text-lg font-semibold text-blue-700">
            Not enough services in your area?
          </h3>
          <p className="mb-4 text-center text-sm text-gray-700">
            Be a{" "}
            <span className="font-bold text-blue-700">SRVice Provider</span> and
            add more to your City/Municipality!
          </p>
          <button
            className="group flex w-full items-center justify-between rounded-2xl bg-yellow-300 p-5 text-left transition-all hover:bg-blue-600"
            onClick={async () => {
              setBeProviderLoading(true);
              const success = await switchRole();
              if (success) {
                navigate("/provider/home");
              } else {
                setBeProviderLoading(false);
              }
            }}
            disabled={beProviderLoading}
          >
            <div className="flex items-center">
              <ArrowPathRoundedSquareIcon
                className={`mr-4 h-7 w-7 text-black transition-transform duration-300 group-hover:text-white ${beProviderLoading ? "animate-spin" : ""}`}
              />
              <span
                className={`text-lg font-semibold text-gray-800 group-hover:text-white ${beProviderLoading ? "opacity-70" : ""}`}
              >
                {beProviderLoading ? "Switching..." : "Be a SRVice Provider"}
              </span>
            </div>
            <ChevronRightIcon
              className={`h-6 w-6 text-black group-hover:text-white ${beProviderLoading ? "opacity-70" : ""}`}
            />
          </button>
        </div>
      </div>
      {/* Bottom navigation bar */}
      <BottomNavigation />
    </div>
  );
};

export default ClientHomePage;
