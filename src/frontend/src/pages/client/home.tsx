import React, { useEffect, useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useFeedback } from "../../hooks/useFeedback";
import Categories from "../../components/client/Categories";
import ServiceList from "../../components/client/ServiceListRow";
import BottomNavigation from "../../components/client/BottomNavigation";
import { useServiceManagement } from "../../hooks/serviceManagement";
import { useBookingManagement } from "../../hooks/bookingManagement";
import ClientHeader from "../../components/client/Header";
import LocationBlockedModal from "../../components/common/LocationBlockedModal";
import {
  StarIcon,
  ArrowPathRoundedSquareIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useLocationStore } from "../../store/locationStore";
import { toast } from "sonner";
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
  const { bookings } = useBookingManagement();
  const { submitFeedback, submitting } = useFeedback();
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  // --- State: Star rating for feedback ---
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  // --- State: Feedback comment ---
  const [feedbackComment, setFeedbackComment] = useState<string>("");
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

  // --- Effect: Set page title on mount ---
  useEffect(() => {
    document.title = "Home | SRV";
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
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
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
              <div className="mb-3 flex justify-center space-x-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    className="transition-transform hover:scale-110 focus:scale-110 focus:outline-none"
                    onClick={() => setFeedbackRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                  >
                    <StarIcon
                      className={`h-12 w-12 drop-shadow transition-colors ${
                        (hoveredRating ?? feedbackRating) >= star
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill={
                        (hoveredRating ?? feedbackRating) >= star
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="mb-4 w-full rounded-lg border border-gray-300 p-3"
                rows={4}
                placeholder="Share your thoughts..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
              <button
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  if (feedbackRating === 0) {
                    toast.error("Please select a rating before submitting.");
                    return;
                  }

                  try {
                    await submitFeedback(feedbackRating, feedbackComment);

                    // Reset form
                    setFeedbackRating(0);
                    setFeedbackComment("");
                    setShowFeedbackPopup(false);

                    // Show success message
                    toast.success("Thank you for your feedback!");
                  } catch (error) {
                    //console.error("Failed to submit feedback:", error);
                    toast.error("Failed to submit feedback. Please try again.");
                  }
                }}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
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

      {/* Show location blocked message if location is denied (dismissible) */}
      <LocationBlockedModal
        visible={locationStatus === "denied" && !dismissedLocationBlock}
        onClose={() => {
          setDismissedLocationBlock(true);
          try {
            sessionStorage.setItem("dismissedLocationBlock", "1");
          } catch {}
        }}
      />

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
