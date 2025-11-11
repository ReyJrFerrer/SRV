import React, { useEffect, useState } from "react";
import { StarIcon } from "@heroicons/react/24/outline";
import { useFeedback } from "../../hooks/useFeedback";
import { useBookingManagement } from "../../hooks/bookingManagement";
import { toast } from "sonner";

const FeedbackPopup: React.FC = () => {
  const { bookings } = useBookingManagement();
  const { submitFeedback, submitting } = useFeedback();

  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState<string>("");

  useEffect(() => {
    const hasSeenFeedback = localStorage.getItem("hasSeenFeedbackPopup");
    const completedBookings = bookings.filter((b) => b.status === "Completed");
    if (!hasSeenFeedback && completedBookings.length === 1) {
      setShowFeedbackPopup(true);
      localStorage.setItem("hasSeenFeedbackPopup", "true");
    }
  }, [bookings]);

  if (!showFeedbackPopup) return null;

  return (
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
            You just completed your first booking. Please let us know about your
            experience.
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
  );
};

export default FeedbackPopup;
