// Section: Client Booking Item Card
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EnhancedBooking } from "../../hooks/bookingManagement";
import { reviewCanisterService } from "../../services/reviewCanisterService";
import { authCanisterService } from "../../services/authCanisterService";
import {
  CalendarDaysIcon,
  MapPinIcon,
  XCircleIcon,
  StarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { UserIcon } from "@heroicons/react/24/solid";
import { useUserImage } from "../../hooks/useMediaLoader";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";
import ActionButtons from "./booking-details/ActionButtons";
import { dispatchBookingInteracted } from "../../utils/interactionEvents";

interface ClientBookingItemCardProps {
  booking: EnhancedBooking;
  onCancelClick: (booking: EnhancedBooking) => void;
  // Optional pre-fetched rating/reviews provided by parent (My Bookings page)
  averageRating?: number | null;
  reviewCount?: number | null;
  reviews?: any[];
  reputation: any;
}

const ClientBookingItemCard: React.FC<ClientBookingItemCardProps> = ({
  booking,
  onCancelClick,
  averageRating,
  reviewCount,
  reputation,
}) => {
  const navigate = useNavigate();
  const { checkCommissionValidation } = useProviderBookingManagement();
  const { conversations, createConversation } = useChat();
  const { identity } = useAuth();

  // Section: State
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

  // Section: Effects
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
        setCommissionValidation({ estimatedCommission: 0 });
      }
    };

    validateCommission();
  }, [booking, checkCommissionValidation]);

  // Section: Effects (review status)
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

  // Section: Data extraction
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

  const providerId =
    booking?.providerProfile?.id?.toString() || booking?.providerId?.toString();

  // Determine if provider data has been loaded
  const hasProviderData =
    averageRating !== undefined &&
    averageRating !== null &&
    reviewCount !== undefined &&
    reviewCount !== null &&
    reputation !== null;

  // Section: Utilities
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

  // Section: Utilities (date helpers)
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

  // Section: Utilities (status)
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "REQUESTED":
      case "PENDING":
        return "text-amber-700 bg-amber-50 border border-amber-100";
      case "ACCEPTED":
      case "CONFIRMED":
        return "text-emerald-700 bg-emerald-50 border border-emerald-100";
      case "INPROGRESS":
      case "IN_PROGRESS":
        return "text-blue-700 bg-blue-50 border border-blue-100";
      case "COMPLETED":
        return "text-indigo-700 bg-indigo-50 border border-indigo-100";
      case "CANCELLED":
        return "text-rose-700 bg-rose-50 border border-rose-100";
      case "DECLINED":
        return "text-slate-700 bg-slate-50 border border-slate-100";
      case "DISPUTED":
        return "text-orange-700 bg-orange-50 border border-orange-100";
      default:
        return "text-slate-700 bg-slate-50 border border-slate-100";
    }
  };

  // Section: Handlers
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
        navigate(`/client/chat`, {
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
        navigate(`/client/chat`, {
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

  // Emit booking-interacted when user performs actions from the card
  const emitInteraction = useCallback(() => {
    try {
      dispatchBookingInteracted(booking.id);
    } catch {}
  }, [booking.id]);

  const handleBookAgain = () => {
    emitInteraction();
    if (booking.serviceId) {
      navigate(`/client/book/${booking.serviceId}`);
    } else {
      toast.error("Service information not available to book again.");
      navigate("/client/home");
    }
  };

  // Add handler for viewing reviews when already reviewed
  const handleViewReviews = () => {
    emitInteraction();
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
        icon: <XCircleIcon className="mr-1.5 h-4 w-4 shrink-0 text-gray-400" />,
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
        icon: (
          <CheckCircleIcon className="mr-1.5 h-4 w-4 shrink-0 text-gray-400" />
        ),
        className: "bg-green-500 hover:bg-green-600",
        disabled: false,
        onClick: handleViewReviews,
        href: undefined,
      };
    }

    if (canUserReview === true) {
      // User can submit a review
      return {
        text: (
          <>
            <span className="sm:hidden">Rate</span>
            <span className="hidden sm:inline">Rate Provider</span>
          </>
        ),
        icon: <StarIcon className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />,
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
      icon: <StarIcon className="mr-1.5 h-4 w-4 shrink-0 text-gray-400" />,
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

  // Section: Render
  return (
    <Link
      to={`/client/booking/${booking.id}`}
      className="block cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      onClick={() => {
        // If this booking is Accepted we trigger interaction so badge decrements
        if (booking.status === "Accepted") {
          dispatchBookingInteracted(booking.id);
        }
      }}
    >
      <div className="flex flex-col">
        {/* Header Section */}
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          {fallbackImage && (
            <img
              src={fallbackImage}
              alt={providerName || serviceTitle || "Provider"}
              className="h-16 w-16 shrink-0 rounded-xl bg-gray-50 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-provider.svg";
              }}
            />
          )}

          {/* Right Details */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-xs font-bold uppercase tracking-wider text-indigo-500">
                {serviceTitle}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusColor(booking.status)}`}
              >
                {booking.status.replace("_", " ")}
              </span>
            </div>

            <h3
              className="mt-0.5 truncate text-base font-bold text-gray-900"
              title={booking.packageName}
            >
              {booking.packageName}
            </h3>

            {/* Provider details inline horizontally */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
              <span className="flex items-center gap-1 font-medium text-gray-800">
                <UserIcon className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="max-w-[120px] truncate">{providerName}</span>
              </span>

              {providerId && hasProviderData && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1 font-semibold text-gray-800">
                    <StarIcon className="h-3.5 w-3.5 text-yellow-400" />
                    <span>{(averageRating as number).toFixed(1)}</span>
                    <span className="font-normal text-gray-500">
                      ({reviewCount})
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Booking Details Pill */}
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-2 md:flex md:items-start md:justify-between md:gap-4">
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span className="font-medium leading-snug">
              {booking.scheduledDate
                ? formatDateRange(
                    booking.requestedDate || booking.createdAt,
                    booking.scheduledDate,
                  )
                : formatDate(booking.requestedDate || booking.createdAt)}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600 md:flex-1">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span className="line-clamp-2 leading-snug">{bookingLocation}</span>
          </div>
          {notes && (
            <div className="mt-2 flex items-start gap-2 border-t border-gray-200/60 pt-2 text-xs text-gray-500 sm:col-span-2 md:border-t-0 md:pt-0">
              <span className="shrink-0 font-semibold text-gray-700">
                Note:
              </span>
              <span className="line-clamp-2">{notes}</span>
            </div>
          )}
        </div>

        {/* Bottom Area: Price & Actions */}
        <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          {booking.price ? (
            <div className="flex flex-col">
              <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Total Amount
              </span>
              <span className="text-lg font-bold leading-none text-gray-900">
                ₱
                {(
                  booking.price + commissionValidation.estimatedCommission
                ).toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="hidden sm:block"></div>
          )}

          <div className="flex w-full shrink-0 justify-end sm:w-auto">
            <ActionButtons
              compact={true}
              onChat={() => {
                emitInteraction();
                handleChat();
              }}
              chatLoading={false}
              onRequestCancel={() => {
                emitInteraction();
                onCancelClick(booking);
              }}
              canCancel={canCancel}
              onBookAgain={
                isCompleted && booking.serviceId
                  ? () => {
                      emitInteraction();
                      handleBookAgain();
                    }
                  : undefined
              }
              bookAgainLabel={"Book Again"}
              reviewButtonContent={
                reviewButtonContent
                  ? (() => {
                      const r = reviewButtonContent as any;
                      if (r.href) {
                        return {
                          text: r.text,
                          icon: r.icon,
                          onClick: () => {
                            emitInteraction();
                            navigate(r.href.pathname, {
                              state: r.href.query || ({ providerName } as any),
                            });
                          },
                          to: undefined,
                          state: undefined,
                          disabled: r.disabled,
                          className: r.className,
                        } as any;
                      }

                      return {
                        text: r.text,
                        icon: r.icon,
                        onClick: () => {
                          emitInteraction();
                          if (r.onClick) r.onClick();
                        },
                        to: r.href ? r.href.pathname : undefined,
                        state: r.href
                          ? r.href.query || { providerName }
                          : undefined,
                        disabled: r.disabled,
                        className: r.className,
                      } as any;
                    })()
                  : null
              }
              status={booking.status}
              onReport={() => {
                emitInteraction();
                navigate(`/client/report`, {
                  state: { bookingId: booking.id },
                });
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ClientBookingItemCard;
