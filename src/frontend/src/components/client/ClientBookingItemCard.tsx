// --- Client Booking Item Card ---
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EnhancedBooking } from "../../hooks/bookingManagement";
import { reviewCanisterService } from "../../services/reviewCanisterService";
import { authCanisterService } from "../../services/authCanisterService";
import {
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  XCircleIcon,
  StarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { useUserImage } from "../../hooks/useMediaLoader";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";
import ReputationScore from "./service-detail/ReputationScore";
import ActionButtons from "./booking-details/ActionButtons";
import { StarRatingDisplay } from "./service-detail/ReviewsSection";

interface ClientBookingItemCardProps {
  booking: EnhancedBooking;
  onCancelClick: (booking: EnhancedBooking) => void;
  // Optional pre-fetched rating/reviews provided by parent (My Bookings page)
  averageRating?: number | null;
  reviewCount?: number | null;
  reviews?: any[];
  loadingStats?: boolean;
  reputation: any;
}

const ClientBookingItemCard: React.FC<ClientBookingItemCardProps> = ({
  booking,
  onCancelClick,
  averageRating,
  reviewCount,
  loadingStats,
  reputation,
}) => {
  const navigate = useNavigate();
  const { checkCommissionValidation } = useProviderBookingManagement();
  const { conversations, createConversation } = useChat();
  const { identity } = useAuth();

  // --- State: Review status ---
  const [canUserReview, setCanUserReview] = useState<boolean | null>(null);
  const [checkingReviewStatus, setCheckingReviewStatus] = useState(false);
  const { userImageUrl, refetch } = useUserImage(
    booking?.providerProfile?.profilePicture?.imageUrl,
  );

  // Refetch provider avatar if changed
  useEffect(() => {
    if (userImageUrl) {
      refetch();
    }
  }, [userImageUrl, refetch]);

  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({
    estimatedCommission: 0,
  });

  // --- Effect: Check commission validation for cash bookings ---
  useEffect(() => {
    const validateCommission = async () => {
      // Only validate commission for cash payment bookings
      if (!booking || booking.paymentMethod !== "CashOnHand") {
        setCommissionValidation({ estimatedCommission: 0 });
        return;
      }

      try {
        const validation = await checkCommissionValidation(booking);
        setCommissionValidation({
          estimatedCommission: validation.estimatedCommission,
        });
      } catch (error) {
        console.error("Error checking commission:", error);
        setCommissionValidation({ estimatedCommission: 0 });
      }
    };

    validateCommission();
  }, [booking, checkCommissionValidation]);

  // --- Effect: Check review status when booking is finished ---
  useEffect(() => {
    const checkReviewStatus = async () => {
      if (booking.status !== "Completed" || !booking.id) {
        if (booking.status === "Cancelled") {
          setCanUserReview(false);
        }
        return;
      }
      try {
        setCheckingReviewStatus(true);
        const userProfile = await authCanisterService.getMyProfile();
        if (!userProfile?.id) {
          setCanUserReview(false);
          return;
        }
        const canReview = await reviewCanisterService.canUserReviewBooking(
          booking.id,
          userProfile.id,
        );
        setCanUserReview(canReview);
      } catch (error) {
        setCanUserReview(true);
      } finally {
        setCheckingReviewStatus(false);
      }
    };
    checkReviewStatus();
  }, [booking.id, booking.status]);

  // --- Extract booking data with fallbacks ---
  const serviceTitle = booking.serviceName;

  // Use provider profile image directly, do not use useMediaLoader for booking image
  let fallbackImage = userImageUrl;
  if (
    !fallbackImage ||
    fallbackImage === "/default-provider.svg" ||
    fallbackImage === "" ||
    fallbackImage === undefined
  ) {
    let rawSlug = booking.serviceDetails?.category?.slug;
    if (rawSlug && typeof rawSlug !== "string") {
      rawSlug = String(rawSlug);
    }
    if (!rawSlug && booking.serviceDetails?.title) {
      rawSlug = booking.serviceDetails.title.toLowerCase().replace(/\s+/g, "-");
    }
    if (rawSlug) {
      fallbackImage = `/images/ai-sp/${rawSlug}.svg` || "/default-provider.svg";
    } else {
      fallbackImage = "/default-provider.svg";
    }
  }
  const providerName = booking.providerProfile?.name;

  const notes = (booking as any)?.notes;

  const bookingLocation =
    booking.formattedLocation ||
    (typeof booking.location === "string"
      ? booking.location
      : "Location not specified");

  // --- Format date function ---
  const formatDate = (date: Date | string | number) => {
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Date not available";
    }
  };

  // --- Date range formatting helper ---
  const formatDateRange = (
    requestedDate: Date | string | number,
    scheduledDate: Date | string | number,
  ) => {
    try {
      const requestedDateObj = new Date(requestedDate);
      const scheduledDateObj = new Date(scheduledDate);

      const requestedDateStr = requestedDateObj.toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const requestedTimeStr = requestedDateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const scheduledTimeStr = scheduledDateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Check if both dates are on the same day
      const isSameDay =
        requestedDateObj.toDateString() === scheduledDateObj.toDateString();

      if (isSameDay) {
        return `${requestedDateStr} at ${requestedTimeStr} to ${scheduledTimeStr}`;
      } else {
        const scheduledDateStr = scheduledDateObj.toLocaleDateString([], {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        return `${requestedDateStr} at ${requestedTimeStr} to ${scheduledDateStr} at ${scheduledTimeStr}`;
      }
    } catch {
      return "Date range not available";
    }
  };

  // --- Status color mapping ---
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "REQUESTED":
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "ACCEPTED":
      case "CONFIRMED":
        return "text-green-600 bg-green-100";
      case "INPROGRESS":
      case "IN_PROGRESS":
        return "text-blue-600 bg-blue-100";
      case "COMPLETED":
        return "text-indigo-600 bg-indigo-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      case "DECLINED":
        return "text-gray-600 bg-gray-100";
      case "DISPUTED":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // --- Event Handlers ---
  const handleChat = useCallback(async () => {
    if (!booking.providerProfile?.id) {
      toast.error("Provider information is missing.");
      return;
    }
    if (!identity) {
      toast.error("You must be logged in to start a conversation.");
      return;
    }

    try {
      const currentUserId = identity.getPrincipal().toString();
      const providerIdString = booking.providerProfile.id.toString();

      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === providerIdString) ||
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === providerIdString),
      );

      if (existingConversation) {
        navigate(`/client/chat/${existingConversation.conversation.id}`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: existingConversation.otherUserName,
            otherUserImage:
              booking.providerProfile?.profilePicture?.imageUrl || undefined,
          },
        });
        return;
      }

      const newConv = await createConversation(currentUserId, providerIdString);
      if (newConv && newConv.id) {
        navigate(`/client/chat/${newConv.id}`, {
          state: {
            conversationId: newConv.id,
            otherUserName: booking.providerProfile?.name || "Provider",
            otherUserImage:
              booking.providerProfile?.profilePicture?.imageUrl || undefined,
          },
        });
        return;
      }

      toast.error(
        "Could not start a new conversation. Please try again later.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not start conversation. Please try again.",
      );
    }
  }, [booking, conversations, createConversation, identity, navigate]);

  const handleBookAgain = () => {
    if (booking.serviceId) {
      navigate(`/client/book/${booking.serviceId}`);
    } else {
      toast.error("Service information not available to book again.");
      navigate("/client/home");
    }
  };

  // Add handler for viewing reviews when already reviewed
  const handleViewReviews = () => {
    if (booking.serviceId) {
      navigate(`/client/service/reviews/${booking.serviceId}`);
    } else {
      toast.error("Service information not available.");
    }
  };

  // --- Check if booking can be cancelled ---
  const canCancel = ["Requested", "Accepted", "Confirmed"].includes(
    booking.status,
  );

  // --- Check if booking is completed/cancelled for actions ---
  const isCompleted = booking.status === "Completed";
  const isCancelled = booking.status === "Cancelled";

  // --- Review button content logic ---
  const getReviewButtonContent = () => {
    // Handle cancelled bookings first
    if (isCancelled) {
      return {
        text: "Service Cancelled",
        icon: <XCircleIcon className="mr-1.5 h-4 w-4" />,
        className: "bg-gray-400 cursor-not-allowed",
        disabled: true,
        onClick: undefined,
        href: undefined,
        tooltip: "Cannot review cancelled bookings",
      };
    }

    // Only show review options for completed bookings
    if (!isCompleted) {
      return null; // Don't show review button for non-completed bookings
    }

    if (checkingReviewStatus) {
      return {
        text: "Checking...",
        icon: (
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
        ),
        className: "bg-gray-400 cursor-not-allowed",
        disabled: true,
        onClick: undefined,
        href: undefined,
      };
    }

    if (canUserReview === false) {
      // User has already reviewed
      return {
        text: "View Reviews",
        icon: <CheckCircleIcon className="mr-1.5 h-4 w-4" />,
        className: "bg-green-500 hover:bg-green-600",
        disabled: false,
        onClick: handleViewReviews,
        href: undefined,
      };
    }

    if (canUserReview === true) {
      // User can submit a review
      return {
        text: "Rate Provider",
        icon: <StarIcon className="mr-1.5 h-4 w-4" />,
        className: "bg-yellow-500 hover:bg-yellow-600",
        disabled: false,
        onClick: undefined,
        href: {
          pathname: `/client/review/${booking.id}`,
          query: { providerName: providerName },
        },
      };
    }

    // Default state (null - still loading or error)
    return {
      text: "Rate Provider",
      icon: <StarIcon className="mr-1.5 h-4 w-4" />,
      className: "bg-yellow-500 hover:bg-yellow-600",
      disabled: false,
      onClick: undefined,
      href: {
        pathname: `/client/review/${booking.id}`,
        query: { providerName: providerName },
      },
    };
  };

  const reviewButtonContent = getReviewButtonContent();

  console.log(booking);

  // --- Render: Booking Card Layout ---
  return (
    <Link
      to={`/client/booking/${booking.id}`}
      className="block cursor-pointer overflow-hidden rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
    >
      <div className="md:flex">
        {fallbackImage && (
          <div className="md:flex-shrink-0">
            <div className="relative h-full w-full object-cover md:w-48">
              <img
                src={fallbackImage}
                alt={providerName || serviceTitle || "Provider"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/default-provider.svg";
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-grow flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                {serviceTitle}
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(booking.status)}`}
              >
                {booking.status.replace("_", " ")}
              </span>
            </div>

            <h3
              className="mt-1 truncate text-lg font-bold text-slate-800 md:text-xl"
              title={serviceTitle}
            >
              {booking.packageName}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Provided by: {providerName}
            </p>
            {/* Reputation + Rating (real frontend display using shared components) */}
            <div className="left-0 flex flex-col items-start lg:flex-row">
              <div className="flex-shrink-0">
                <ReputationScore reputation={reputation} />
              </div>

              <div className="flex items-center gap-2 rounded-full py-1 pr-3 text-sm font-semibold text-gray-800">
                {loadingStats ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600" />
                    <span className="text-xs text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <StarRatingDisplay rating={averageRating ?? 0} />
                      <span className="ml-1 font-bold">
                        {averageRating != null
                          ? (averageRating as number).toFixed(1)
                          : "N/A"}
                      </span>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">
                      ({reviewCount ?? 0})
                    </span>
                  </>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Contact: {booking.providerProfile?.phone}
            </p>

            <div className="mt-3 space-y-1.5 text-xs text-gray-600">
              <p className="flex items-start">
                <CalendarDaysIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                {booking.scheduledDate
                  ? formatDateRange(
                      booking.requestedDate || booking.createdAt,
                      booking.scheduledDate,
                    )
                  : formatDate(booking.requestedDate || booking.createdAt)}
              </p>

              <p className="flex items-start">
                <MapPinIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                <span className="truncate">{bookingLocation}</span>
              </p>

              {booking.price && (
                <p className="flex items-start">
                  <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-green-600">
                    ₱
                    {(
                      booking.price + commissionValidation.estimatedCommission
                    ).toFixed(2)}
                  </span>
                </p>
              )}
            </div>

            {/* Booking Notes (if any) */}
            {notes && (
              <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900">
                <strong>Booking Notes:</strong> {notes}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col space-y-2 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0">
            {/* Map our existing reviewButtonContent to the shape ActionButtons expects */}
            <ActionButtons
              compact={true}
              onChat={handleChat}
              chatLoading={false}
              onRequestCancel={() => onCancelClick(booking)}
              canCancel={canCancel}
              // provide Book Again handler so the shared component renders it
              onBookAgain={
                isCompleted && booking.serviceId ? handleBookAgain : undefined
              }
              bookAgainLabel={"Book Again"}
              reviewButtonContent={
                reviewButtonContent
                  ? {
                      text: reviewButtonContent.text,
                      icon: reviewButtonContent.icon,
                      onClick: reviewButtonContent.onClick ?? undefined,
                      to: reviewButtonContent.href
                        ? reviewButtonContent.href.pathname
                        : undefined,
                      state: reviewButtonContent.href
                        ? reviewButtonContent.href.query || { providerName }
                        : undefined,
                      disabled: reviewButtonContent.disabled,
                      className: reviewButtonContent.className,
                    }
                  : null
              }
              status={booking.status}
              onReport={() =>
                navigate(`/client/report`, { state: { bookingId: booking.id } })
              }
            />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ClientBookingItemCard;
