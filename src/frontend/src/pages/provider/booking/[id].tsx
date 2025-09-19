import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUserImage } from "../../../hooks/useMediaLoader";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  StarIcon,
  CheckCircleIcon,
  PhoneIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import useChat from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import {
  ProviderEnhancedBooking,
  useProviderBookingManagement,
} from "../../../hooks/useProviderBookingManagement";
import { useReputation } from "../../../hooks/useReputation";

// --- Client Reputation Score Section (patterned after ServiceDetailPageComponent) ---
const ClientReputationScore: React.FC<{ clientId: string }> = ({
  clientId,
}) => {
  const { fetchUserReputation } = useReputation();
  const [reputationScore, setReputationScore] = useState<number>(50); // Default score
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadReputation = async () => {
      try {
        setLoading(true);
        const reputation = await fetchUserReputation(clientId);
        if (reputation && typeof reputation.trustScore === "number") {
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

    if (clientId) {
      loadReputation();
    }
  }, [clientId, fetchUserReputation]);

  const score = reputationScore;
  let iconColor = "text-blue-500";
  let textColor = "text-blue-700";
  if (score >= 80) {
    iconColor = "text-blue-500";
    textColor = "text-blue-700";
  } else if (score >= 60) {
    iconColor = "text-blue-400";
    textColor = "text-blue-700";
  } else if (score >= 40) {
    iconColor = "text-yellow-400";
    textColor = "text-yellow-700";
  } else {
    iconColor = "text-yellow-600";
    textColor = "text-yellow-700";
  }

  if (loading) {
    return (
      <span
        className="flex items-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600"
        style={{ minWidth: 0 }}
      >
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
        <span>Loading reputation...</span>
      </span>
    );
  }

  return (
    <span
      className={`flex items-center rounded-lg px-3 py-1 text-sm font-medium ${textColor}`}
      style={{ minWidth: 0 }}
    >
      <StarIcon className={`mr-2 h-5 w-5 ${iconColor}`} />
      <span className="mr-1">Reputation:</span>
      <span className="font-bold">{score}</span>
    </span>
  );
};

// Progress tracker section component
const BookingProgressSection: React.FC<{ status?: string }> = ({ status }) => {
  const steps = [
    { key: "requested", label: "Requested" },
    { key: "accepted", label: "Accepted" },
    { key: "in_progress", label: "Current" },
    { key: "completed", label: "Completed" },
  ];

  const normalizedStatus = (status || "").toLowerCase().replace(/ /g, "_");
  let currentStep = 0;
  switch (normalizedStatus) {
    case "requested":
    case "pending":
      currentStep = 0;
      break;
    case "accepted":
    case "confirmed":
      currentStep = 1;
      break;
    case "in_progress":
    case "inprogress":
      currentStep = 2;
      break;
    case "completed":
      currentStep = 3;
      break;
    case "declined":
    case "cancelled":
      currentStep = -1;
      break;
    default:
      currentStep = 0;
  }

  if (currentStep === -1) {
    return (
      <section className="my-4 flex flex-col rounded-2xl bg-white p-4 shadow">
        <h3 className="mr-10 mb-3 w-full text-left text-lg font-bold text-blue-700">
          Progress Tracker
        </h3>
        <div className="flex items-center justify-center rounded-lg bg-red-50 px-4 py-3 font-semibold text-red-700">
          Booking {status}
        </div>
      </section>
    );
  }

  // Helper to determine color classes for steps and lines
  const getStepCircle = (idx: number) => {
    // Completed (for completed status, all are checked blue)
    if (normalizedStatus === "completed") {
      return {
        bg: "bg-blue-500 border-blue-500 text-white",
        icon: (
          <CheckCircleIcon className="h-7 w-7 text-white md:h-10 md:w-10" />
        ),
      };
    }
    // Steps before current: blue
    if (idx < currentStep) {
      return {
        bg: "bg-blue-500 border-blue-500 text-white",
        icon: (
          <CheckCircleIcon className="h-7 w-7 text-white md:h-10 md:w-10" />
        ),
      };
    }
    // Current step: yellow
    if (idx === currentStep) {
      return {
        bg: "bg-yellow-400 border-yellow-400 text-white",
        icon: (
          <span className="text-lg font-bold text-white md:text-2xl">
            {idx + 1}
          </span>
        ),
      };
    }
    // Untouched: yellow outline, white bg, yellow text
    return {
      bg: "bg-white border-yellow-500 text-yellow-500",
      icon: (
        <span className="text-lg font-bold text-yellow-500 md:text-2xl">
          {idx + 1}
        </span>
      ),
    };
  };

  const getLineColor = (idx: number) => {
    // Completed: all blue
    if (normalizedStatus === "completed") return "bg-blue-500";
    // Before current: blue
    if (idx < currentStep) return "bg-blue-500";
    // Untouched: yellow
    return "bg-yellow-300";
  };

  const getLabelColor = (idx: number) => {
    // Completed: all blue
    if (normalizedStatus === "completed") return "text-blue-700";
    // Before current: blue
    if (idx < currentStep) return "text-blue-700";
    // Current: yellow
    if (idx === currentStep) return "text-yellow-600";
    // Untouched: yellow
    return "text-yellow-400";
  };

  return (
    <section className="my-4 flex flex-col items-center rounded-2xl bg-white p-4 shadow">
      <h3 className="mt-1 mb-3 ml-5 w-full text-left text-lg font-bold text-blue-700">
        Progress Tracker
      </h3>
      <div className="flex w-full max-w-xl items-center justify-center gap-0 sm:gap-4 md:max-w-3xl">
        {steps.map((step, idx) => {
          const { bg, icon } = getStepCircle(idx);
          const labelColor = getLabelColor(idx);
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center rounded-full border-2 ${bg} h-10 w-10 transition-colors duration-200 md:h-14 md:w-14`}
                >
                  {icon}
                </div>
                <span
                  className={`mt-1 text-xs font-medium md:text-base ${labelColor} transition-colors duration-200`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-1 w-8 sm:w-16 md:w-32 ${getLineColor(idx)} transition-colors duration-200`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

const ProviderBookingDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [specificBooking, setSpecificBooking] =
    useState<ProviderEnhancedBooking | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // State for decline confirmation dialog
  const [showDeclineConfirm, setShowDeclineConfirm] = useState<boolean>(false);
  const [isDeclinining, setIsDeclinining] = useState<boolean>(false);
  
  const { identity } = useAuth();
  const { conversations, createConversation } = useChat();

  // Set document title
  useEffect(() => {
    if (specificBooking) {
      const serviceName =
        specificBooking?.serviceDetails?.description ||
        specificBooking?.packageName ||
        "Service";
      document.title = `Booking: ${serviceName} | SRV Provider`;
    } else {
      document.title = "Booking Details | SRV Provider";
    }
  }, [specificBooking]);

  const { userImageUrl } = useUserImage(
    specificBooking?.clientProfile?.profilePicture?.imageUrl,
  );

  const {
    bookings,
    acceptBookingById,
    declineBookingById,
    startBookingById,
    completeBookingById,
    isBookingActionInProgress,
    loading: hookLoading,
    error: hookError,
    refreshBookings,
    clearError,
    checkCommissionValidation,
    // canAcceptCashBooking,
    // getWalletBalance,
  } = useProviderBookingManagement();

  // Commission validation state
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
    hasInsufficientBalance: boolean;
    commissionValidationMessage?: string;
    loading: boolean;
  }>({
    estimatedCommission: 0,
    hasInsufficientBalance: false,
    commissionValidationMessage: "",
    loading: false,
  });

  // Find specific booking from the hook's bookings array
  useEffect(() => {
    if (id && typeof id === "string") {
      setLocalLoading(true);
      setLocalError(null);

      if (!hookLoading && bookings.length >= 0) {
        const foundBooking = bookings.find((booking) => booking.id === id);

        if (foundBooking) {
          setSpecificBooking(foundBooking);
        } else {
          setLocalError("Booking not found");
        }

        setLocalLoading(false);
      }
    }
  }, [id, bookings, hookLoading]);

  // Check commission validation when booking changes
  useEffect(() => {
    const validateCommission = async () => {
      if (!specificBooking) {
        setCommissionValidation({
          estimatedCommission: 0,
          hasInsufficientBalance: false,
          commissionValidationMessage: "",
          loading: false,
        });
        return;
      }

      // Only check for cash payment bookings that can be accepted
      if (
        specificBooking.paymentMethod !== "CashOnHand" ||
        !specificBooking.canAccept
      ) {
        setCommissionValidation({
          estimatedCommission: 0,
          hasInsufficientBalance: false,
          commissionValidationMessage: "No commission validation needed",
          loading: false,
        });
        return;
      }

      try {
        setCommissionValidation((prev) => ({ ...prev, loading: true }));
        const validation = await checkCommissionValidation(specificBooking);
        setCommissionValidation({
          ...validation,
          loading: false,
        });
      } catch (error) {
        //console.error("Error validating commission:", error);
        setCommissionValidation({
          estimatedCommission: 0,
          hasInsufficientBalance: true,
          commissionValidationMessage: "Error checking commission requirements",
          loading: false,
        });
      }
    };

    validateCommission();
  }, [specificBooking, checkCommissionValidation]);

  // Handle retry functionality
  const handleRetry = async () => {
    setLocalError(null);
    clearError();
    try {
      await refreshBookings();
    } catch {
      // silent
    }
  };

  // Action handlers
  const handleAcceptBooking = async () => {
    if (!specificBooking) return;

    // Check commission validation for cash bookings before accepting
    if (specificBooking.paymentMethod === "CashOnHand") {
      if (commissionValidation.loading) {
        alert("Please wait while we validate commission requirements.");
        return;
      }

      if (commissionValidation.hasInsufficientBalance) {
        alert(
          `Cannot accept booking: ${commissionValidation.commissionValidationMessage || "Insufficient wallet balance for commission fee."}\n\nPlease top up your wallet and try again.`,
        );
        return;
      }
    }

    const success = await acceptBookingById(specificBooking.id);
    if (success) {
      await refreshBookings();
      const updatedBooking = bookings.find(
        (booking) => booking.id === specificBooking.id,
      );
      if (updatedBooking) {
        setSpecificBooking(updatedBooking);
      }
    }
  };

  const handleDeclineBooking = async () => {
    if (!specificBooking) return;
    
    // Show confirmation dialog instead of window.confirm
    setShowDeclineConfirm(true);
  };

  // New function to handle the actual decline after confirmation
  const handleConfirmDecline = async () => {
    if (!specificBooking) return;
    
    setIsDeclinining(true);
    try {
      const success = await declineBookingById(
        specificBooking.id,
        "Declined by provider",
      );
      if (success) {
        await refreshBookings();
        const updatedBooking = bookings.find(
          (booking) => booking.id === specificBooking.id,
        );
        if (updatedBooking) {
          setSpecificBooking(updatedBooking);
        }
      }
    } finally {
      setIsDeclinining(false);
      setShowDeclineConfirm(false);
    }
  };

  const handleStartService = async () => {
    if (!specificBooking) return;
    const success = await startBookingById(specificBooking.id);
    if (success) {
      const actualStartTime = new Date().toISOString();
      navigate(
        `/provider/active-service/${specificBooking.id}?startTime=${actualStartTime}`,
      );
    }
  };

  const handleCompleteService = async () => {
    if (!specificBooking) return;
    const success = await completeBookingById(specificBooking.id);
    if (success) {
      await refreshBookings();
      const updatedBooking = bookings.find(
        (booking) => booking.id === specificBooking.id,
      );
      if (updatedBooking) {
        setSpecificBooking(updatedBooking);
      }
    }
  };

  // Chat button handler (ProviderBookingItemCard logic)
  const handleChatClient = async () => {
    if (!specificBooking || !identity) return;
    const clientId =
      specificBooking.clientProfile?.id?.toString() ||
      specificBooking.clientId?.toString();
    if (!clientId) {
      alert("Client chat unavailable.");
      return;
    }
    try {
      const currentUserId = identity.getPrincipal().toString();
      // Check for existing conversation
      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === clientId) ||
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === clientId),
      );
      if (existingConversation) {
        navigate(`/provider/chat/${clientId}`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: specificBooking.clientName || "Client",
            otherUserImage:
              specificBooking.clientProfile?.profilePicture?.imageUrl,
          },
        });
      } else {
        // Create new conversation
        const newConversation = await createConversation(
          currentUserId,
          clientId,
        );
        if (newConversation) {
          navigate(`/provider/chat/${clientId}`, {
            state: {
              conversationId: newConversation.id,
              otherUserName: specificBooking.clientName || "Client",
              otherUserImage: specificBooking.clientProfile?.profilePicture,
            },
          });
        }
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Could not start conversation. Please try again.",
      );
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString([], {
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

  // Check if today is the service date and time, or after
  const canStartServiceNow = () => {
    if (!specificBooking) return false;

    // Use scheduledDate if available, otherwise fall back to requestedDate
    const serviceDateTime =
      specificBooking.scheduledDate || specificBooking.requestedDate;
    if (!serviceDateTime) return false;

    try {
      const serviceDateTimeObj = new Date(serviceDateTime);
      const now = new Date();

      // Allow starting service on or after the scheduled date and time
      return now.getTime() >= serviceDateTimeObj.getTime();
    } catch {
      return false;
    }
  };

  // Contact client handler
  const handleContactClient = () => {
    if (!specificBooking) return;
    const phone =
      specificBooking.clientPhone || specificBooking.clientProfile?.phone || "";
    if (phone) {
      window.open(`tel:${phone}`, "_self");
    } else {
      alert(
        `Contact client: ${specificBooking.clientName || "Unknown Client"}`,
      );
    }
  };

  // Determine loading state
  const isLoading = hookLoading || localLoading;
  const displayError = localError || hookError;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (displayError && !specificBooking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {localError === "Booking not found"
              ? "Booking Not Found"
              : "Error Loading Booking"}
          </h1>
          <p className="mb-4 text-gray-600">{displayError}</p>
          <div className="space-x-3">
            <Link
              to="/provider/booking"
              className="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
            >
              Back to My Bookings
            </Link>
            <button
              onClick={handleRetry}
              disabled={isBookingActionInProgress("refresh", "refresh")}
              className="rounded-lg bg-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-400 disabled:opacity-50"
            >
              {isBookingActionInProgress("refresh", "refresh")
                ? "Retrying..."
                : "Retry"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No booking found (after loading completed)
  if (!specificBooking && !isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50 p-4">
        <h1 className="mb-4 text-xl font-semibold text-red-600">
          Booking Not Found
        </h1>
        <Link
          to="/provider/booking"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to My Bookings
        </Link>
      </div>
    );
  }

  // Extract booking data
  const serviceName =
    specificBooking?.serviceDetails?.description ||
    specificBooking?.packageName ||
    "Service";
  const clientName = specificBooking?.clientName || "Unknown Client";
  const clientContact =
    specificBooking?.clientPhone ||
    specificBooking?.clientProfile?.phone ||
    "Contact not available";

  const providerImage = userImageUrl || "/default-client.svg";
  const clientId =
    specificBooking?.clientProfile?.id?.toString() ||
    specificBooking?.clientId?.toString();

  // Format location string
  let bookingLocation = "Location not specified";
  if (
    typeof specificBooking?.location === "string" &&
    (specificBooking.location as string).trim() !== ""
  ) {
    bookingLocation = specificBooking.location as string;
  } else if (
    typeof specificBooking?.serviceDetails?.location === "string" &&
    (specificBooking.serviceDetails.location as string).trim() !== ""
  ) {
    bookingLocation = specificBooking.serviceDetails.location as string;
  } else if (
    typeof specificBooking?.formattedLocation === "string" &&
    (specificBooking.formattedLocation as string).trim() !== ""
  ) {
    bookingLocation = specificBooking.formattedLocation as string;
  }

  const price =
    specificBooking?.price ??
    specificBooking?.packageDetails?.price ??
    specificBooking?.serviceDetails?.price;
  const duration = specificBooking?.duration ?? "N/A";
  const amountToPay = specificBooking?.amountPaid ?? 0;

  // --- Main Page Layout ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 pb-20 md:pb-0">
      {/* Decline Confirmation Dialog */}
      {showDeclineConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-red-700">
              Decline Booking?
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Are you sure you want to decline this booking from{" "}
              <b>{specificBooking?.clientName || 'this client'}</b>? This action cannot be undone and the client will be notified.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setShowDeclineConfirm(false)}
                disabled={isDeclinining}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={handleConfirmDecline}
                disabled={isDeclinining}
              >
                {isDeclinining ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 shadow-sm backdrop-blur">
        <div className="container mx-auto flex items-center px-4 py-3">
          <button
            onClick={() => navigate("/provider/bookings")}
            className="mr-2 rounded-full p-2 hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="m-2 p-2 text-xl font-extrabold text-black sm:text-2xl md:text-3xl">
            Booking Details
          </h1>
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-4 sm:p-6">
        {/* Side by side layout for provider and service details */}
        <div className="mt-4 flex flex-col gap-6 md:flex-row">
          {/* Provider (client) info card - left */}
          <div className="relative max-w-md min-w-[320px] flex-1 overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex flex-col items-center gap-2 border-b border-blue-100 bg-gradient-to-r from-blue-100 to-yellow-50 px-6 py-8">
              {/* Client image */}
              <img
                src={providerImage}
                alt="Client"
                className="h-24 w-24 rounded-full border-4 border-white bg-gray-100 object-cover shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/default-client.svg";
                }}
              />
              {/* Name at the top, centered */}
              <h2 className="w-full text-center text-2xl font-bold text-slate-800">
                {clientName}
              </h2>
              {/* Bottom row: reputation score left, phone right */}
              <div className="flex w-full flex-col gap-2 sm:mt-2 sm:flex-row sm:items-center sm:justify-between">
                {clientId ? (
                  <div className="flex w-full justify-center sm:w-auto sm:justify-start">
                    <ClientReputationScore clientId={clientId} />
                  </div>
                ) : (
                  <div />
                )}
                {clientContact && clientContact !== "Contact not available" && (
                  <div className="flex w-full items-center justify-center text-sm font-medium text-gray-600 sm:w-auto sm:justify-end">
                    <PhoneIcon className="mr-2 h-5 w-5 text-blue-500" />
                    <span>{clientContact}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service and package details - right */}
          <div className="min-w-[320px] flex-1 rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-bold text-blue-700">
              Service Section
            </h3>
            <div className="mb-2 flex items-center gap-2">
              <BriefcaseIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-700">
                Service:{" "}
                <span className="font-semibold text-blue-900">
                  {serviceName}
                </span>
              </span>
            </div>
            {specificBooking?.packageDetails?.title && (
              <div className="mb-2 flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-700">
                  Package:{" "}
                  <span className="font-normal text-gray-700">
                    {specificBooking.packageName}
                  </span>
                </span>
              </div>
            )}
            {/* Booking date */}
            <div className="mb-2 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-700">
                Date:{" "}
                <span className="font-normal text-gray-700">
                  {formatDate(
                    specificBooking?.requestedDate ||
                      specificBooking?.createdAt,
                  )}
                </span>
              </span>
            </div>
            {/* Booking location */}
            <div className="mb-2 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-700">
                Location:{" "}
                <span className="font-normal text-gray-700">
                  {bookingLocation}
                </span>
              </span>
            </div>
            {/* Booking price */}
            {price !== undefined && (
              <div className="mb-2 flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-700">
                  Price:{" "}
                  <span className="font-semibold text-green-700">
                    ₱{(price + commissionValidation.estimatedCommission).toFixed(2)} 
                  </span>
                </span>
              </div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-700">
                Client's amount to pay:{" "}
                <span className="font-semibold text-green-700">
                  ₱{amountToPay.toFixed(2)}
                </span>
              </span>
            </div>

            {/* Booking duration */}
            {duration !== "N/A" && (
              <div className="mb-2 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-700">
                  Duration:{" "}
                  <span className="font-normal text-gray-700">{duration}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Booking Progress Section */}
        <BookingProgressSection status={specificBooking?.status} />

        {/* Commission Validation Section for Cash Bookings */}
        {specificBooking?.paymentMethod === "CashOnHand" &&
          specificBooking?.canAccept && (
            <div className="rounded-2xl bg-white p-4 shadow-lg">
              <h3 className="mb-3 text-lg font-bold text-blue-700">
                Commission Information
              </h3>
              {commissionValidation.loading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <span>Calculating commission...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {commissionValidation.estimatedCommission > 0 && (
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-gray-700">
                        Estimated Commission:{" "}
                        <span className="font-semibold text-red-600">
                          ₱{commissionValidation.estimatedCommission.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  )}

                  {commissionValidation.hasInsufficientBalance ? (
                    <div className="rounded-lg bg-red-50 p-3">
                      <div className="flex items-start gap-2">
                        <XCircleIcon className="mt-0.5 h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium text-red-800">
                            Insufficient Wallet Balance
                          </p>
                          <p className="mt-1 text-sm text-red-700">
                            {commissionValidation.commissionValidationMessage}
                          </p>
                          <Link
                            to="/provider/wallet"
                            className="mt-2 inline-flex items-center text-sm font-medium text-red-600 underline hover:text-red-800"
                          >
                            Top up your wallet →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    commissionValidation.estimatedCommission > 0 && (
                      <div className="rounded-lg bg-green-50 p-3">
                        <div className="flex items-start gap-2">
                          <CheckCircleIcon className="mt-0.5 h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium text-green-800">
                              Wallet Balance Sufficient: ₱
                              {commissionValidation.commissionValidationMessage}
                            </p>
                            <p className="mt-1 text-sm text-green-700">
                              Result: ₱
                              {commissionValidation.commissionValidationMessage}{" "}
                              - ₱
                              {commissionValidation.estimatedCommission.toFixed(
                                2,
                              )}{" "}
                              = ₱
                              {Number(
                                commissionValidation.commissionValidationMessage,
                              ) - commissionValidation.estimatedCommission}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg sm:flex-row sm:gap-4">
          <button
            onClick={handleChatClient}
            className="flex flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:text-blue-900"
          >
            <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" /> Chat{" "}
            {specificBooking?.clientName?.split(" ")[0] || "Client"}
          </button>

          <button
            onClick={handleContactClient}
            className="flex flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:text-blue-900"
          >
            <PhoneIcon className="mr-2 h-5 w-5" /> Contact{" "}
            {specificBooking?.clientName?.split(" ")[0] || "Client"}
          </button>

          {/* Show "Go to Active Service" button if status is InProgress */}
          {specificBooking?.status === "InProgress" && (
            <button
              onClick={() => {
                // Try to get the stored start time
                const storedStartTime = localStorage.getItem(
                  `activeServiceStartTime:${specificBooking.id}`,
                );
                // Fallback to requestedDate if not found
                const startTime =
                  storedStartTime ||
                  specificBooking.scheduledDate ||
                  specificBooking.requestedDate ||
                  new Date().toISOString();
                navigate(
                  `/provider/active-service/${specificBooking.id}?startTime=${encodeURIComponent(startTime)}`,
                );
              }}
              className="flex flex-1 items-center justify-center rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-yellow-700 shadow-sm transition hover:bg-yellow-100 hover:text-yellow-900"
            >
              <ArrowPathIcon className="mr-2 h-5 w-5" />
              Go to Active Service
            </button>
          )}

          {specificBooking?.canAccept && specificBooking?.canDecline && (
            <>
              <button
                onClick={handleDeclineBooking}
                disabled={isBookingActionInProgress(
                  specificBooking?.id || "",
                  "decline",
                )}
                className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
              >
                <XCircleIcon className="mr-2 h-5 w-5" />
                {isBookingActionInProgress(specificBooking?.id || "", "decline")
                  ? "Declining..."
                  : "Decline"}
              </button>
              <button
                onClick={handleAcceptBooking}
                disabled={
                  isBookingActionInProgress(
                    specificBooking?.id || "",
                    "accept",
                  ) ||
                  (specificBooking?.paymentMethod === "CashOnHand" &&
                    (commissionValidation.loading ||
                      commissionValidation.hasInsufficientBalance))
                }
                className={`flex flex-1 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                  specificBooking?.paymentMethod === "CashOnHand" &&
                  (commissionValidation.loading ||
                    commissionValidation.hasInsufficientBalance)
                    ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500"
                    : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                } disabled:opacity-50`}
                title={
                  specificBooking?.paymentMethod === "CashOnHand" &&
                  commissionValidation.hasInsufficientBalance
                    ? "Insufficient wallet balance for commission fee"
                    : ""
                }
              >
                <CheckCircleIcon className="mr-2 h-5 w-5" />
                {isBookingActionInProgress(specificBooking?.id || "", "accept")
                  ? "Accepting..."
                  : commissionValidation.loading
                    ? "Checking..."
                    : "Accept"}
              </button>
            </>
          )}

          {specificBooking?.canStart && (
            <button
              onClick={handleStartService}
              disabled={
                isBookingActionInProgress(specificBooking?.id || "", "start") ||
                !canStartServiceNow()
              }
              className={`flex flex-1 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition ${
                !canStartServiceNow()
                  ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900"
              } disabled:opacity-50`}
              title={
                !canStartServiceNow()
                  ? "Service can only be started on or after the scheduled date and time"
                  : ""
              }
            >
              <ArrowPathIcon className="mr-2 h-5 w-5" />
              {isBookingActionInProgress(specificBooking?.id || "", "start")
                ? "Starting..."
                : "Start Service"}
            </button>
          )}

          {specificBooking?.canComplete && (
            <button
              onClick={handleCompleteService}
              disabled={isBookingActionInProgress(
                specificBooking?.id || "",
                "complete",
              )}
              className="flex flex-1 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-700 shadow-sm transition hover:bg-teal-100 hover:text-teal-900 disabled:opacity-50"
            >
              <CheckCircleIcon className="mr-2 h-5 w-5" />
              {isBookingActionInProgress(specificBooking?.id || "", "complete")
                ? "Completing..."
                : "Mark Completed"}
            </button>
          )}

          {specificBooking?.status === "Completed" && (
            <Link
              to={`/provider/review/${specificBooking?.id}`}
              className="flex flex-1 items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-center text-sm font-medium text-yellow-700 shadow-sm transition hover:bg-yellow-100 hover:text-yellow-900"
            >
              <StarIcon className="mr-2 h-5 w-5" /> View Review
            </Link>
          )}
        </div>
      </main>

      <div></div>
    </div>
  );
};

export default ProviderBookingDetailsPage;
