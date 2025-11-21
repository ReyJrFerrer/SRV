// SECTION: Imports — dependencies for this page
import React, { useEffect, useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import FeedbackPopup from "../../components/common/FeedbackPopup";
import Categories from "../../components/client/home page/Categories";
import ServiceList from "../../components/client/home page/ServiceListRow";
import BottomNavigation from "../../components/client/NavigationBar";
import { useServiceManagement } from "../../hooks/serviceManagement";

import ClientHeader from "../../components/client/home page/Header";
import LocationBlockedModal from "../../components/common/locationAccessPermission/LocationBlockedModal";
import LocationPermissionPromptModal from "../../components/common/locationAccessPermission/LocationPermissionPromptModal";
import {
  OneSignalBlockedModal,
  isOneSignalBlockedModalDismissed,
} from "../../components/OneSignalBlockedModal";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowPathRoundedSquareIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useNavigate, useLocation } from "react-router-dom";
import { useLocationStore } from "../../store/locationStore";

// SECTION: ClientHomePage — main page component rendering header, categories, services, and provider CTA
const ClientHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { error } = useServiceManagement();
  const { locationStatus, userProvince, userAddress, isInitialized } =
    useLocationStore();
  const [beProviderLoading, setBeProviderLoading] = useState(false);
  const { switchRole } = useUserProfile();
  const [dismissedLocationBlock, setDismissedLocationBlock] = useState<boolean>(
    () => {
      try {
        return sessionStorage.getItem("dismissedLocationBlock") === "1";
      } catch {
        return false;
      }
    },
  );
  const [showOneSignalBlockedModal, setShowOneSignalBlockedModal] =
    useState(false);

  // Check for OneSignal blocking on mount
  useEffect(() => {
    const checkOneSignalBlocking = () => {
      // Check if OneSignal SDK failed to load
      const oneSignalScript = document.querySelector(
        'script[src*="OneSignalSDK"]',
      );
      if (oneSignalScript) {
        oneSignalScript.addEventListener("error", () => {
          if (!isOneSignalBlockedModalDismissed())
            setShowOneSignalBlockedModal(true);
        });
      }

      // Also check if window.OneSignal is undefined after a delay
      setTimeout(() => {
        if (typeof window.OneSignal === "undefined") {
          if (!isOneSignalBlockedModalDismissed())
            setShowOneSignalBlockedModal(true);
        }
      }, 5000); // Give it 5 seconds to load
    };

    checkOneSignalBlocking();
  }, []);

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
  useEffect(() => {
    document.title = "Home | SRV";
  }, []);
  const {
    postLoginLocationPromptVisible,
    requestLocationFromPrompt,
    skipPostLoginLocationPrompt,
    postLoginBlockedModalVisible,
    acknowledgePostLoginBlockedModal,
    showPostLoginLocationPrompt,
  } = useAuth();

  const location = useLocation();
  useEffect(() => {
    const shouldShow = (location.state as any)?.postLoginLocationPrompt;
    if (shouldShow) {
      showPostLoginLocationPrompt();
      try {
        navigate(location.pathname, { replace: true, state: {} });
      } catch {}
    }
  }, [location, showPostLoginLocationPrompt]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-32">
      {/* SECTION: Feedback popup */}
      <FeedbackPopup />
      {/* SECTION: Location permission prompt */}
      <LocationPermissionPromptModal
        visible={postLoginLocationPromptVisible && locationStatus === "not_set"}
        onEnable={async () => {
          try {
            await requestLocationFromPrompt();
          } catch {}
        }}
        onSkip={() => {
          skipPostLoginLocationPrompt();
        }}
        onClose={() => {
          skipPostLoginLocationPrompt();
        }}
      />
      {/* SECTION: Location blocked modal */}
      {(() => {
        const realDenied =
          locationStatus === "denied" &&
          !userProvince &&
          !userAddress &&
          isInitialized;
        const visible =
          (realDenied && !dismissedLocationBlock) ||
          (permissionApiDenied &&
            !dismissedLocationBlock &&
            !userProvince &&
            !userAddress &&
            isInitialized) ||
          (postLoginBlockedModalVisible && realDenied);

        const handleBlockedClose = () => {
          setDismissedLocationBlock(true);
          try {
            sessionStorage.setItem("dismissedLocationBlock", "1");
          } catch {}
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

      {/* SECTION: OneSignal Blocked Modal */}
      {showOneSignalBlockedModal && (
        <OneSignalBlockedModal
          onClose={() => setShowOneSignalBlockedModal(false)}
        />
      )}

      {/* SECTION: Error alert */}
      {error && (
        <div className="mx-4 mt-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <span className="block sm:inline">
            Failed to load categories: {error}
          </span>
        </div>
      )}
      {/* SECTION: Main content */}

      <div className="w-full max-w-full px-4 pb-16 pt-4">
        {/* SECTION: Header */}
        <ClientHeader className="mb-6 w-full max-w-full" />
        {/* SECTION: Categories */}
        <h2 className="mb-2 text-left text-xl font-bold">Categories</h2>
        <Categories
          className="mb-4 w-full max-w-full"
          moreButtonImageUrl="/images/categories/more.svg"
          lessButtonImageUrl="/images/categories/more.svg"
        />
        {/* SECTION: Service list */}
        <ServiceList className="w-full max-w-full" />
      </div>
      {/* SECTION: Provider CTA */}
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
            className="group flex w-full items-center justify-between rounded-2xl bg-yellow-300 p-4 text-left transition-all hover:bg-blue-600"
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
                className={`text-sm font-semibold text-gray-800 group-hover:text-white md:text-lg lg:text-xl ${beProviderLoading ? "opacity-70" : ""}`}
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
      {/* SECTION: Bottom navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ClientHomePage;
