// SECTION: Imports — dependencies for this page
import React, { useEffect, useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import FeedbackPopup from "../../components/common/FeedbackPopup";
import Categories from "../../components/client/home page/Categories";
import ServiceList from "../../components/client/home page/ServiceListRow";
import BottomNavigation from "../../components/client/NavigationBar";
import { useServiceManagement } from "../../hooks/serviceManagement";
import ClientHeader from "../../components/client/home page/Header";
import {
  OneSignalBlockedModal,
  isOneSignalBlockedModalDismissed,
} from "../../components/OneSignalBlockedModal";
import {
  ArrowPathRoundedSquareIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

// SECTION: ClientHomePage — main page component rendering header, categories, services, and provider CTA
const ClientHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { error } = useServiceManagement();
  const [beProviderLoading, setBeProviderLoading] = useState(false);
  const { switchRole } = useUserProfile();
  const [showOneSignalBlockedModal, setShowOneSignalBlockedModal] =
    useState(false);

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

  useEffect(() => {
    document.title = "Home | SRV";
  }, []);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-32">
      {/* SECTION: Feedback popup */}
      <FeedbackPopup />

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
        <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-center text-lg font-semibold text-blue-700">
            Not enough services in your area?
          </h3>
          <p className="mb-4 text-center text-sm text-gray-700">
            Be a{" "}
            <span className="font-bold text-blue-700">SRVice Provider</span> and
            add more to your City/Municipality!
          </p>
          <button
            className="group flex w-full items-center justify-between rounded-2xl bg-blue-600 px-5 py-3.5 text-left transition-all hover:bg-blue-700 font-black active:scale-95 shadow-sm"
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
                className={`mr-4 h-7 w-7 text-white transition-transform duration-300 ${beProviderLoading ? "animate-spin" : ""}`}
              />
              <span
                className={`text-sm font-medium text-white md:text-lg lg:text-xl ${beProviderLoading ? "opacity-70" : ""}`}
              >
                {beProviderLoading ? "Switching..." : "Be a SRVice Provider"}
              </span>
            </div>
            <ChevronRightIcon
              className={`h-6 w-6 text-white ${beProviderLoading ? "opacity-70" : ""}`}
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
