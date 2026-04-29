import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  // CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import { useCachedProviderBooking } from "../../../hooks/useCachedBooking";
import useChat from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import CancelWithReasonButton from "../../../components/common/cancellation/CancelWithReasonButton";
import { toast } from "sonner";
import { bookingCanisterService } from "../../../services/bookingCanisterService";

const ActiveServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(
    null,
  );
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({
    estimatedCommission: 0,
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { checkCommissionValidation } = useProviderBookingManagement();

  // Use cached booking hook - fetches once, shares across all pages
  const {
    booking,
    isLoading: isLoadingBooking,
    isValidating,
  } = useCachedProviderBooking(bookingId);

  // Redirect if booking doesn't exist or wrong status
  useEffect(() => {
    if (isLoadingBooking) {
      return;
    }
    // Only check status after confirming booking exists
    if (booking?.status !== "InProgress") {
      // If we are currently validating (fetching fresh data), don't redirect yet
      if (isValidating) return;

      navigate("/provider/bookings", { replace: true });
      return;
    }
  }, [booking, isLoadingBooking, bookingId, navigate, isValidating]);

  const { identity } = useAuth();
  const { conversations, createConversation } = useChat();

  useEffect(() => {
    if (booking) {
      document.title = `Active Service: ${booking.serviceName || "Service"} | SRV Provider`;
    } else {
      document.title = "Active Service | SRV Provider";
    }
  }, [booking]);

  // Check commission validation for cash bookings
  useEffect(() => {
    const validateCommission = async () => {
      // Only validate commission for cash payment bookings
      if (!booking || booking.paymentMethod !== "CashOnHand") {
        setCommissionValidation({ estimatedCommission: 0 });
        return;
      }

      try {
        const validation = await checkCommissionValidation(booking);
        setCommissionValidation(validation);
      } catch (error) {
        setCommissionValidation({ estimatedCommission: 0 });
      }
    };

    validateCommission();
  }, [booking, checkCommissionValidation]);

  const handleMarkCompleted = async () => {
    if (!booking) return;
    navigate(`/provider/complete-service/${booking.id}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageName(file.name);
      // Reset the input so the same file can be uploaded again if needed
      e.target.value = "";
    }
  };

  const handleContactClient = () => {
    if (booking?.clientPhone) {
      window.open(`tel:${booking.clientPhone}`, "_self");
    } else {
      alert(`Contact client: ${booking?.clientName || "Unknown Client"}`);
    }
  };

  // Special cancel: cancel booking (ticket is automatically created by cancelBooking)
  const handleCancelActiveService = async (reason: string) => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      // Cancel the booking - this automatically creates a ticket with structured data
      await bookingCanisterService.cancelBooking(booking.id, reason);
      toast.success("Booking cancelled successfully.");
      setIsCancelModalOpen(false);
      navigate("/provider/bookings");
    } catch (err) {
      toast.error("Unable to cancel active service. Please try again.");
      throw err;
    } finally {
      setIsCancelling(false);
    }
  };

  // Chat button handler (patterned after booking detail page)
  const handleChatClient = async () => {
    if (!booking || !identity) return;
    const clientId =
      booking.clientProfile?.id?.toString() || booking.clientId?.toString();
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
        navigate(`/provider/chat`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: booking.clientName || "Client",
            otherUserImage: booking.clientProfile?.profilePicture?.imageUrl,
          },
        });
      } else {
        // Create new conversation
        const newConversation = await createConversation(
          currentUserId,
          clientId,
        );
        if (newConversation) {
          navigate(`/provider/chat`, {
            state: {
              conversationId: newConversation.id,
              otherUserName: booking.clientName || "Client",
              otherUserImage: booking.clientProfile?.profilePicture?.imageUrl,
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

  // --- UI Section ---
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-yellow-50 pb-20 md:pb-0">
      <header className="fixed inset-x-0 top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-center px-4 py-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-black">
            Service In Progress
          </h1>
        </div>
      </header>

      <main className="container mx-auto flex-grow space-y-10 px-4 py-16 sm:px-8">
        {isLoadingBooking || !booking ? (
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        ) : booking.status !== "InProgress" ? (
          <div className="flex min-h-screen items-center justify-center p-4 text-center text-orange-500">
            {isValidating ? (
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            ) : (
              `This booking is not currently in progress. Current status: ${booking.status}`
            )}
          </div>
        ) : (
          <>
            {/* Timer removed */}

            {/* Details and Actions Section */}
            <div className="mt-6 py-14 sm:mt-8 md:flex md:gap-8 lg:gap-12">
              {/* Left Column: Booking Details */}
              <section className="w-full rounded-2xl bg-white p-6 shadow-lg sm:p-8 md:flex-1">
                <h2 className="mb-4 border-b border-blue-100 pb-3 text-xl font-bold text-blue-800 sm:text-2xl">
                  Service Details
                </h2>
                <div className="space-y-4 text-base text-gray-700">
                  <div className="flex items-center">
                    <UserIcon className="mr-3 h-6 w-6 flex-shrink-0 text-blue-400" />
                    <span className="font-semibold text-gray-800">
                      {booking.clientName || "Unknown Client"}
                    </span>
                  </div>
                  {booking.clientPhone && (
                    <div className="flex items-center">
                      <PhoneIcon className="mr-3 h-6 w-6 flex-shrink-0 text-blue-400" />
                      <a
                        href={`tel:${booking.clientPhone}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {booking.clientPhone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CalendarIcon className="mr-3 h-6 w-6 flex-shrink-0 text-blue-400" />
                    <span>
                      {booking.scheduledDate
                        ? new Date(booking.scheduledDate).toLocaleString([], {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : new Date(booking.requestedDate).toLocaleString([], {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <MapPinIcon className="mr-3 mt-1 h-6 w-6 flex-shrink-0 text-blue-400" />
                    <span className="break-words font-medium text-gray-800">
                      {booking.formattedLocation || "Location not specified"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="mr-3 h-6 w-6 flex-shrink-0 text-blue-400" />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700">
                        Price:{" "}
                        <span className="font-semibold text-green-700">
                          ₱
                          {Number(
                            booking.price +
                              commissionValidation.estimatedCommission,
                          ).toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="mr-3 h-6 w-6 flex-shrink-0 text-blue-400" />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700">
                        Client's amount to pay:{" "}
                        <span className="font-semibold text-green-700">
                          ₱{Number(booking.amountPaid).toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right Column: Actions */}
              <section className="mt-8 rounded-2xl bg-white p-6 shadow-lg sm:p-8 md:mt-0 md:w-auto md:max-w-xs lg:w-1/3 xl:w-1/4">
                <h3 className="mb-5 text-lg font-bold text-blue-800 sm:text-xl">
                  Actions
                </h3>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {uploadedImageName && (
                    <div className="mt-2 flex items-center gap-2 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      Image "{uploadedImageName}" uploaded!
                    </div>
                  )}
                  <button
                    onClick={handleContactClient}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-200 bg-white px-4 py-3 text-base font-semibold text-yellow-700 transition-colors hover:bg-yellow-50"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" /> Contact{" "}
                    {booking.clientName?.split(" ")[0] || "Client"}
                  </button>
                  <button
                    onClick={handleChatClient}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-200 bg-white px-4 py-3 text-base font-semibold text-yellow-700 transition-colors hover:bg-yellow-50"
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" /> Chat{" "}
                    {booking.clientName?.split(" ")[0] || "Client"}
                  </button>
                  <button
                    onClick={handleMarkCompleted}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-green-700"
                  >
                    <CheckCircleIcon className="h-5 w-5" /> Mark as Completed
                  </button>
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-red-700"
                  >
                    <XCircleIcon className="h-5 w-5" />
                    Cancel Service
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
      <div className="lg:hidden"></div>
      <CancelWithReasonButton
        show={isCancelModalOpen}
        onSubmit={handleCancelActiveService}
        onCancel={() => setIsCancelModalOpen(false)}
        confirmTitle="Cancel Active Service?"
        confirmDescription="Share a reason. We'll file it as a complaint ticket to the admin and cancel this service."
        textareaLabel="Reason for cancellation"
        submitText="Submit"
        cancelText="Back"
        isSubmitting={isCancelling}
      />
    </div>
  );
};

export default ActiveServicePage;
