import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CalendarDaysIcon,
  MapPinIcon,
  PhotoIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white py-4 shadow-sm">
        <div className="flex w-full items-center justify-center px-4">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            Service In Progress
          </h1>
        </div>
      </header>

      <main className="container mx-auto flex-grow space-y-10 px-4 pt-28 pb-16 sm:px-8">
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
            <div className="mt-4 space-y-4 sm:mt-6 md:flex md:gap-6 md:space-y-0 lg:gap-8">
              {/* Left Column: Booking Details */}
              <section className="w-full overflow-hidden rounded-2xl bg-white shadow-sm md:flex-1">
                <div className="p-5">
                  <h2 className="mb-4 text-lg font-bold text-gray-900">
                    Service Details
                  </h2>

                  {/* Client Name */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-semibold text-gray-900">
                      {booking.clientName || "Unknown Client"}
                    </p>
                  </div>

                  {/* Phone */}
                  {booking.clientPhone && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Phone</p>
                      <a
                        href={`tel:${booking.clientPhone}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {booking.clientPhone}
                      </a>
                    </div>
                  )}

                  {/* Date/Time */}
                  <div className="mb-4 flex items-start gap-3">
                    <CalendarDaysIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Scheduled</p>
                      <p className="font-medium text-gray-900">
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
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="mb-4 flex items-start gap-3">
                    <MapPinIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">
                        {booking.formattedLocation || "Location not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₱{Number(booking.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Right Column: Actions */}
              <section className="w-full overflow-hidden rounded-2xl bg-white shadow-sm md:w-auto md:max-w-xs lg:w-1/3 xl:w-1/4">
                <div className="p-5">
                  <h3 className="mb-4 text-lg font-bold text-gray-900">
                    Actions
                  </h3>

                  <div className="space-y-3">
                    {/* Upload Photo Button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {uploadedImageName && (
                      <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        Photo uploaded: {uploadedImageName}
                      </div>
                    )}

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <PhotoIcon className="h-4 w-4" />
                      Upload Photo
                    </button>

                    <button
                      onClick={handleContactClient}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      Contact {booking.clientName?.split(" ")[0] || "Client"}
                    </button>

                    <button
                      onClick={handleChatClient}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      Chat
                    </button>

                    <button
                      onClick={handleMarkCompleted}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Mark as Completed
                    </button>

                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Cancel Service
                    </button>
                  </div>
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
