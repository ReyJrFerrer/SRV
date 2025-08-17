import React, { useEffect, useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import Header from "../../components/client/Header";
import Categories from "../../components/client/Categories";
import ServiceList from "../../components/client/ServiceListRow";
import BottomNavigation from "../../components/client/BottomNavigation";
import { useServiceManagement } from "../../hooks/serviceManagement";
import { useBookingManagement } from "../../hooks/bookingManagement";
import {
  ArrowPathRoundedSquareIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";

// --- Client Home Page ---
const ClientHomePage: React.FC = () => {
  // Navigation
  const navigate = useNavigate();
  // --- State: Service category error ---
  const { error } = useServiceManagement();
  // --- State: Location permission ---
  const [, setLocationStatus] = useState<"pending" | "allowed" | "denied">(
    "pending",
  );
  const [, setGeoLocation] = useState<{
    province: string;
    municipality: string;
  } | null>(null);
  const { bookings } = useBookingManagement();
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  // --- State: Star rating for feedback ---
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  // --- State: Button loading for provider CTA ---
  const [beProviderLoading, setBeProviderLoading] = useState(false);
  const { switchRole } = useUserProfile();

  // --- Effect: Set page title and check geolocation permission status on mount ---
  useEffect(() => {
    document.title = "Home | SRV";
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Permission accepted
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            );
            const data = await res.json();
            const province =
              data.address.county ||
              data.address.state ||
              data.address.region ||
              data.address.province ||
              "";
            const municipality =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              "";
            setGeoLocation({ province, municipality });
            setLocationStatus("allowed");
          } catch {
            setLocationStatus("denied");
          }
        },
        (_err) => {
          // Permission denied
          setLocationStatus("denied");
        },
      );
    } else {
      setLocationStatus("denied");
    }
  }, []);

  useEffect(() => {
    // Show feedback popup after first completed booking
    const hasSeenFeedback = localStorage.getItem("hasSeenFeedbackPopup");
    const completedBookings = bookings.filter((b) => b.status === "Completed");
    if (!hasSeenFeedback && completedBookings.length === 1) {
      setShowFeedbackPopup(true);
      localStorage.setItem("hasSeenFeedbackPopup", "true");
    }
  }, [bookings]);

  // --- Render: Client Home Page Layout ---
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-32">
      {/* Feedback popup after first completed booking */}
      {showFeedbackPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            {/* Girl character at the top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <img
                src="/images/srv characters (SVG)/girl.svg"
                alt="SRV Girl Character"
                className="h-24 w-24 rounded-full border-4 border-white bg-yellow-100 shadow-lg"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="mt-14">
              <h2 className="mb-4 text-center text-xl font-bold text-blue-700">
                We value your feedback!
              </h2>
              <p className="mb-4 text-center text-gray-700">
                You just completed your first booking. Please let us know about
                your experience.
              </p>
              {/* Star rating input */}
              <div className="mb-4 flex items-center justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    className={
                      `mx-1 text-3xl transition-colors ` +
                      (feedbackRating >= star
                        ? "text-yellow-400"
                        : "text-gray-300 hover:text-yellow-400")
                    }
                    onClick={() => setFeedbackRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                className="mb-4 w-full rounded-lg border border-gray-300 p-3"
                rows={4}
                placeholder="Share your thoughts..."
              />
              <button
                className="btn-primary w-full"
                onClick={() => setShowFeedbackPopup(false)}
              >
                Submit Feedback
              </button>
              <button
                className="mt-2 w-full text-sm text-gray-500 hover:text-blue-700"
                onClick={() => setShowFeedbackPopup(false)}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Show location blocked message if location is denied */}
      {/* Error: Service categories failed to load */}
      {error && (
        <div className="mx-4 mt-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <span className="block sm:inline">
            Failed to load categories: {error}
          </span>
        </div>
      )}
      {/* Main content: header, categories, service list */}
      <div className="w-full max-w-full px-4 pt-4 pb-16">
        {/* Header: displays welcome and location */}
        <Header className="mb-6 w-full max-w-full" />
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
