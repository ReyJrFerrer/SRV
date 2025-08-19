import React, { useState, useEffect } from "react";
import { useReputation } from "../../../hooks/useReputation";
// Reputation Score Component (from ServiceDetailPageComponent.tsx)
const ReputationScore: React.FC<{ providerId: string }> = ({ providerId }) => {
  const { fetchUserReputation } = useReputation();
  const [reputationScore, setReputationScore] = useState<number>(50); // Default score
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadReputation = async () => {
      try {
        setLoading(true);
        const reputation = await fetchUserReputation(providerId);
        if (reputation) {
          setReputationScore(Math.round(reputation.trustScore));
        } else {
          setReputationScore(50); // Fallback to default
        }
      } catch (error) {
        setReputationScore(50); // Fallback to default on error
      } finally {
        setLoading(false);
      }
    };

    if (providerId) {
      loadReputation();
    }
  }, [providerId, fetchUserReputation]);

  const score = reputationScore;

  if (loading) {
    return (
      <span
        className="mt-2 mb-2 flex items-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600"
        style={{ minWidth: 0 }}
      >
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
        <span className="mr-2">Loading reputation...</span>
      </span>
    );
  }

  return (
    <span
      className="text-md mt-2 mb-2 flex items-center gap-2 font-semibold text-gray-900"
      style={{ minWidth: 0 }}
    >
      <span>Reputation Score:</span>
      <span>{score}</span>
    </span>
  );
};
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  XCircleIcon,
  StarIcon,
  CheckCircleIcon,
  PhoneIcon,
  BriefcaseIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/solid";
import {
  EnhancedBooking,
  useBookingManagement,
} from "../../../hooks/bookingManagement";
import { reviewCanisterService } from "../../../services/reviewCanisterService";
import { authCanisterService } from "../../../services/authCanisterService";
import BottomNavigation from "../../../components/client/BottomNavigation";
import { useChat } from "../../../hooks/useChat"; // Import the chat hook
import { useAuth } from "../../../context/AuthContext"; // Import auth context

type BookingStatus =
  | "Requested"
  | "Accepted"
  | "InProgress"
  | "Completed"
  | "Cancelled"
  | "Declined"
  | "Disputed";

// Progress tracker for booking status
const BookingProgressTracker: React.FC<{ currentStatus: BookingStatus }> = ({
  currentStatus,
}) => {
  const statuses: BookingStatus[] = [
    "Requested",
    "Accepted",
    "InProgress",
    "Completed",
  ];
  const currentIndex = statuses.findIndex((status) => status === currentStatus);
  const isAllCompleted = currentStatus === "Completed";

  if (currentIndex === -1) {
    return (
      <div className="py-4 text-center">
        <p className="font-medium text-gray-600">
          This booking is not in an active progress state.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full">
        <div className="flex w-full items-center justify-between gap-1 px-0 sm:gap-4 sm:px-2">
          {statuses.map((status, index) => {
            const isActive = index === currentIndex;
            const isCompleted =
              index < currentIndex || (isAllCompleted && index === 3);
            const isLast = index === statuses.length - 1;
            return (
              <React.Fragment key={status}>
                <div
                  className="flex flex-col items-center text-center"
                  style={{ width: "56px" }}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-4 shadow-lg transition-all duration-300 sm:h-12 sm:w-12 ${
                      isAllCompleted
                        ? "border-yellow-400 bg-yellow-400 text-white"
                        : isCompleted
                          ? "border-yellow-400 bg-yellow-400 text-white"
                          : isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 bg-gray-100 text-gray-400"
                    } `}
                  >
                    {(isAllCompleted && isLast) ||
                    (isCompleted && index !== 3) ? (
                      <CheckCircleIcon className="h-5 w-5 text-white sm:h-7 sm:w-7" />
                    ) : (
                      <span className="text-base font-bold sm:text-lg">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold sm:mt-3 sm:text-sm ${
                      isAllCompleted
                        ? "text-yellow-600"
                        : isCompleted
                          ? "text-yellow-600"
                          : isActive
                            ? "text-blue-700"
                            : "text-gray-400"
                    } `}
                  >
                    {status === "InProgress" ? "Current" : status}
                  </p>
                </div>
                {index < statuses.length - 1 && (
                  <div className="flex min-w-[16px] flex-1 items-center sm:min-w-[40px]">
                    <div
                      className={`h-1 w-full rounded-full transition-colors duration-300 sm:h-2 ${
                        isAllCompleted
                          ? "bg-yellow-400"
                          : index < currentIndex - 1
                            ? "bg-yellow-400"
                            : index === currentIndex - 1
                              ? "bg-blue-600"
                              : "bg-gray-200"
                      } `}
                    ></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const BookingDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Get booking ID from URL params
  const [specificBooking, setSpecificBooking] =
    useState<EnhancedBooking | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [canUserReview, setCanUserReview] = useState<boolean | null>(null);
  const [checkingReviewStatus, setCheckingReviewStatus] = useState(false);

  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { identity } = useAuth();
  const { conversations, loading: chatLoading, createConversation } = useChat(); // Add the useChat hook
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);

  const {
    bookings,
    updateBookingStatus: updateBookingStatusHook,
    loading: hookLoading,
    refreshBookings,
    clearError,
    isOperationInProgress,
  } = useBookingManagement();

  // Set document title
  useEffect(() => {
    document.title = `Booking: ${specificBooking?.serviceName || "Details"} | SRV`;
  }, [specificBooking?.serviceName]);

  // Find the specific booking from the list once bookings are loaded
  useEffect(() => {
    if (id && typeof id === "string" && !hookLoading) {
      const foundBooking = bookings.find((booking) => booking.id === id);
      if (foundBooking) {
        setSpecificBooking(foundBooking);
      } else {
        setLocalError("Booking not found");
      }
      setLocalLoading(false);
    }
  }, [id, bookings, hookLoading]);

  // Fetch review statistics for the service
  useEffect(() => {
    const fetchReviewStats = async () => {
      if (specificBooking?.serviceId) {
        setLoadingStats(true);
        try {
          const [avgRating, reviews] = await Promise.all([
            reviewCanisterService.calculateServiceRating(
              specificBooking.serviceId,
            ),
            reviewCanisterService.getServiceReviews(specificBooking.serviceId),
          ]);
          setAverageRating(avgRating);
          setReviewCount(reviews.length);
        } catch (error) {
          console.error("Failed to fetch review stats:", error);
          setAverageRating(null);
          setReviewCount(null);
        } finally {
          setLoadingStats(false);
        }
      }
    };
    fetchReviewStats();
  }, [specificBooking?.serviceId]);

  // Check if the current user can review this booking
  useEffect(() => {
    const checkReviewStatus = async () => {
      if (!specificBooking?.id || specificBooking.status !== "Completed") {
        setCanUserReview(false);
        return;
      }
      setCheckingReviewStatus(true);
      try {
        const userProfile = await authCanisterService.getMyProfile();
        if (!userProfile?.id) {
          setCanUserReview(false);
          return;
        }
        const canReview = await reviewCanisterService.canUserReviewBooking(
          specificBooking.id,
          userProfile.id,
        );
        setCanUserReview(canReview);
      } catch (error) {
        console.error("Error checking review status:", error);
        setCanUserReview(true); // Default to true if check fails to allow user to try
      } finally {
        setCheckingReviewStatus(false);
      }
    };
    checkReviewStatus();
  }, [specificBooking]);

  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: BookingStatus,
  ) => {
    await updateBookingStatusHook(bookingId, newStatus);
    const updatedBooking = bookings.find((b) => b.id === bookingId);
    if (updatedBooking) setSpecificBooking(updatedBooking);
  };

  const handleRetry = () => {
    setLocalError(null);
    clearError();
    refreshBookings();
  };

  const handleCancelBooking = async () => {
    if (!specificBooking) return;
    await handleUpdateBookingStatus(specificBooking.id, "Cancelled");
    alert(`Booking has been cancelled.`);
  };

  const handleChatWithProvider = async () => {
    if (!specificBooking?.providerId) {
      setChatErrorMessage("Provider information is missing.");
      return;
    }

    if (!identity) {
      setChatErrorMessage("You must be logged in to start a conversation.");
      return;
    }

    setChatErrorMessage(null);

    try {
      const currentUserId = identity.getPrincipal().toString();
      const providerIdString = specificBooking.providerId.toString();

      // Check if there's an existing conversation with this provider
      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === providerIdString) ||
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === providerIdString),
      );

      if (existingConversation) {
        // Navigate to existing conversation
        navigate(`/client/chat/${existingConversation.conversation.id}`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: existingConversation.otherUserName,
          },
        });
        return;
      }

      // If no existing conversation, create a new one
      const newConv = await createConversation(currentUserId, providerIdString);
      if (newConv && newConv.id) {
        navigate(`/client/chat/${newConv.id}`, {
          state: {
            conversationId: newConv.id,
            otherUserName: specificBooking.providerProfile?.name || "Provider",
          },
        });
        return;
      }
      setChatErrorMessage(
        "Could not start a new conversation. Please try again later.",
      );
    } catch (error) {
      console.error("Failed to handle chat:", error);
      setChatErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start conversation. Please try again.",
      );
    }
  };

  const handleViewReviews = () => {
    if (specificBooking?.serviceId)
      navigate(`/client/service/reviews/${specificBooking.serviceId}`);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusPillStyle = (status: string) => {
    const styles: { [key: string]: string } = {
      REQUESTED: "bg-yellow-100 text-yellow-700",
      ACCEPTED: "bg-green-100 text-green-700",
      INPROGRESS: "bg-blue-100 text-blue-700",
      COMPLETED: "bg-indigo-100 text-indigo-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return styles[status?.toUpperCase()] || "bg-gray-100 text-gray-700";
  };

  const getReviewButtonContent = () => {
    if (!specificBooking || specificBooking.status !== "Completed") return null;
    if (checkingReviewStatus) {
      return {
        text: "Checking...",
        icon: (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
        ),
        disabled: true,
        className: "bg-gray-400",
      };
    }
    if (canUserReview === false) {
      return {
        text: "View Your Review",
        icon: <CheckCircleIcon className="mr-2 h-5 w-5" />,
        onClick: handleViewReviews,
        className: "bg-green-500 hover:bg-green-600",
      };
    }
    return {
      text: "Rate Provider",
      icon: <StarIcon className="mr-2 h-5 w-5" />,
      to: `/client/review/${specificBooking.id}`,
      state: { providerName: specificBooking.providerProfile?.name },
      className: "bg-yellow-500 hover:bg-yellow-600",
    };
  };

  if (hookLoading || localLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (localError && !specificBooking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 text-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-red-600">
            Error Loading Booking
          </h1>
          <p className="mb-4 text-gray-600">{localError}</p>
          <button
            onClick={handleRetry}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!specificBooking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="mb-4 text-xl font-semibold text-red-600">
          Booking Not Found
        </h1>
        <Link
          to="/client/booking"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to Bookings
        </Link>
      </div>
    );
  }

  const {
    providerProfile,
    packageName,
    requestedDate,
    createdAt,
    formattedLocation,
    price,
    status,
  } = specificBooking;
  const canCancel = ["Requested", "Accepted"].includes(status || "");
  const reviewButtonContent = getReviewButtonContent();

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="container mx-auto flex items-center px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="truncate text-lg font-semibold text-slate-800">
            Booking Details
          </h1>
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Section 1: Provider Details */}
          <div className="h-fit rounded-3xl border border-blue-100 bg-white p-7 shadow-2xl backdrop-blur-md lg:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-tight text-blue-700">
              <PhoneIcon className="h-5 w-5 text-blue-400" /> Provider Details
            </h3>
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0">
                <img
                  src={
                    providerProfile?.profilePicture?.imageUrl ||
                    "/default-provider.svg"
                  }
                  alt={providerProfile?.name || "Provider"}
                  className="h-20 w-20 rounded-full border-4 border-blue-100 object-cover shadow"
                />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900">
                  {providerProfile?.name || "N/A"}
                </p>
                <ReputationScore providerId={providerProfile?.id || ""} />
                <p className="mt-1 flex items-center text-sm text-gray-500">
                  <PhoneIcon className="mr-1.5 h-4 w-4" />
                  {providerProfile?.phone || "No contact number"}
                </p>
                <div className="mt-2 flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    {loadingStats ? (
                      <p className="text-sm text-gray-400">
                        Loading reviews...
                      </p>
                    ) : averageRating != null && reviewCount != null ? (
                      <>
                        <div className="flex items-center text-sm font-bold text-yellow-500">
                          <StarIcon className="mr-1 h-4 w-4" />
                          <span>{averageRating.toFixed(1)}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          ({reviewCount}{" "}
                          {reviewCount === 1 ? "review" : "reviews"})
                        </span>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No reviews yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Service Details */}
          <div className="h-fit rounded-3xl border border-yellow-200 bg-white p-7 shadow-2xl lg:col-span-3">
            <div className="flex items-start justify-between">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-tight text-yellow-700">
                <BriefcaseIcon className="h-5 w-5 text-yellow-400" /> Service
                Details
              </h3>
              <span
                className={`rounded-full px-4 py-2 text-base font-bold shadow-lg ${getStatusPillStyle(status || "")}`}
              >
                {status?.replace("_", " ") || "Unknown"}
              </span>
            </div>
            <div className="space-y-3 text-base">
              <div className="flex items-start">
                <ArchiveBoxIcon className="mt-0.5 mr-2 h-5 w-5 text-blue-600" />
                <span>
                  <strong>Package:</strong> {packageName}
                </span>
              </div>
              <div className="flex items-start">
                <CalendarDaysIcon className="mt-0.5 mr-2 h-5 w-5 text-blue-600" />
                <span>
                  <strong>Scheduled:</strong>{" "}
                  {formatDate(requestedDate || createdAt)}
                </span>
              </div>
              <div className="flex items-start">
                <MapPinIcon className="mt-0.5 mr-2 h-5 w-5 text-blue-600" />
                <span>
                  <strong>Location:</strong>{" "}
                  {(formattedLocation || "Not specified")
                    .split(" ")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase(),
                    )
                    .join(" ")}
                </span>
              </div>
              {price != null && (
                <div className="flex items-start">
                  <CurrencyDollarIcon className="mt-0.5 mr-2 h-5 w-5 text-blue-600" />
                  <span>
                    <strong>Payment:</strong> ₱{price.toFixed(2)} (Cash)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Progress Tracker */}
        <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-2xl backdrop-blur-md">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-extrabold tracking-tight text-blue-700">
            <CalendarDaysIcon className="h-5 w-5 text-blue-400" /> Booking
            Progress
          </h3>
          <div className="px-2 sm:px-8">
            <BookingProgressTracker currentStatus={status as BookingStatus} />
          </div>
        </div>

        {/* Chat Error Message */}
        {chatErrorMessage && (
          <div className="mx-4 my-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            <span className="block sm:inline">{chatErrorMessage}</span>
            <button
              onClick={() => setChatErrorMessage(null)}
              className="ml-2 text-red-900 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-lg">
          <button
            onClick={handleChatWithProvider}
            disabled={chatLoading}
            className="flex min-w-[150px] flex-1 items-center justify-center rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {chatLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                Creating Chat...
              </>
            ) : (
              <>
                <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" /> Chat with
                Provider
              </>
            )}
          </button>

          {canCancel && (
            <button
              onClick={handleCancelBooking}
              disabled={isOperationInProgress(`update-${id}`)}
              className="flex min-w-[150px] flex-1 items-center justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              <XCircleIcon className="mr-2 h-5 w-5" />
              {isOperationInProgress(`update-${id}`)
                ? "Cancelling..."
                : "Cancel"}
            </button>
          )}

          {reviewButtonContent &&
            (reviewButtonContent.to ? (
              <Link
                to={reviewButtonContent.to}
                state={reviewButtonContent.state}
                className={`flex min-w-[150px] flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white ${reviewButtonContent.className}`}
              >
                {reviewButtonContent.icon} {reviewButtonContent.text}
              </Link>
            ) : (
              <button
                onClick={reviewButtonContent.onClick}
                disabled={reviewButtonContent.disabled}
                className={`flex min-w-[150px] flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white ${reviewButtonContent.className} ${reviewButtonContent.disabled ? "cursor-not-allowed" : ""}`}
              >
                {reviewButtonContent.icon} {reviewButtonContent.text}
              </button>
            ))}
        </div>
      </main>

      <div>
        <BottomNavigation />
      </div>
    </div>
  );
};

export default BookingDetailsPage;
