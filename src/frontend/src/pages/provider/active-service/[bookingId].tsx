import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CalendarDaysIcon,
  MapPinIcon,
  PhotoIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCachedProviderBooking } from "../../../hooks/useCachedBooking";
import useChat from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import CancelWithReasonButton from "../../../components/common/cancellation/CancelWithReasonButton";
import ClientAttachments from "../../../components/common/MediaAttachments";
import { toast } from "sonner";
import { bookingCanisterService } from "../../../services/bookingCanisterService";
import { uploadProblemProofMedia } from "../../../services/mediaService";

const ActiveServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    index: number;
    url: string;
  }>({ open: false, index: 0, url: "" });

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
    if (booking?.status !== "InProgress") {
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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  // Lightbox keyboard handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox((s) => ({ ...s, open: false }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleMarkCompleted = async () => {
    if (!booking) return;
    navigate(`/provider/complete-service/${booking.id}`);
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (incoming.length === 0) {
        toast.error("Please select image files only.");
        return;
      }
      const remaining = 10 - selectedFiles.length;
      if (remaining <= 0) {
        toast.error("Maximum 10 images allowed.");
        return;
      }
      const toAdd = incoming.slice(0, remaining);
      if (incoming.length > remaining) {
        toast.warning(
          `Only ${remaining} more image(s) allowed. ${incoming.length - remaining} file(s) skipped.`,
        );
      }
      setSelectedFiles((prev) => [...prev, ...toAdd]);
      setPreviews((prev) => [
        ...prev,
        ...toAdd.map((f) => URL.createObjectURL(f)),
      ]);
    },
    [selectedFiles.length],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!booking || selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      const urls = await uploadProblemProofMedia(selectedFiles);
      if (urls.length === 0) {
        toast.error("No images were uploaded. Please try again.");
        return;
      }
      await bookingCanisterService.updateProviderAttachments(
        booking.id,
        urls,
      );
      toast.success(
        `${urls.length} image(s) uploaded successfully.`,
      );
      // Cleanup previews
      previews.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviews([]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to upload images. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleContactClient = () => {
    if (booking?.clientPhone) {
      window.open(`tel:${booking.clientPhone}`, "_self");
    } else {
      alert(`Contact client: ${booking?.clientName || "Unknown Client"}`);
    }
  };

  const handleCancelActiveService = async (reason: string) => {
    if (!booking) return;
    setIsCancelling(true);
    try {
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

  const existingAttachments: string[] =
    (booking as any)?.providerAttachments || [];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-yellow-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white py-4 shadow-sm">
        <div className="flex w-full items-center justify-center px-4">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            Service In Progress
          </h1>
        </div>
      </header>

      <main className="container mx-auto flex-grow space-y-10 px-4 pb-16 pt-28 sm:px-8">
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
            {/* Details and Actions Section */}
            <div className="mt-4 space-y-4 sm:mt-6 md:flex md:gap-6 md:space-y-0 lg:gap-8">
              {/* Left Column: Booking Details */}
              <section className="w-full overflow-hidden rounded-2xl bg-white shadow-sm md:flex-1">
                <div className="p-5">
                  <h2 className="mb-4 text-lg font-bold text-gray-900">
                    Service Details
                  </h2>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-semibold text-gray-900">
                      {booking.clientName || "Unknown Client"}
                    </p>
                  </div>

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

                  <div className="mb-4 flex items-start gap-3">
                    <MapPinIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">
                        {booking.formattedLocation || "Location not specified"}
                      </p>
                    </div>
                  </div>

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

            {/* Service Proof Images Section */}
            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <PhotoIcon className="h-5 w-5 text-blue-600" />
                Service Proof Images
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                Upload photos as proof of service. These will be visible to the
                client.
              </p>

              {/* Upload Zone */}
              <div
                className={`relative mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                  isDragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    <span className="text-blue-600">Click to browse</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, WebP up to 450KB
                  </p>
                </div>
              </div>

              {/* Selected File Previews */}
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {previews.map((src, idx) => (
                      <div
                        key={`${selectedFiles[idx].name}-${idx}`}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
                      >
                        <img
                          src={src}
                          alt={`Preview ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx);
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur-sm transition hover:bg-red-500 hover:text-white"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isUploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <PhotoIcon className="h-4 w-4" />
                        Upload {selectedFiles.length} Image
                        {selectedFiles.length > 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Already Uploaded Images */}
              {existingAttachments.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">
                    Uploaded Images
                  </h4>
                  <ClientAttachments attachments={existingAttachments} />
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Lightbox */}
      {lightbox.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLightbox((s) => ({ ...s, open: false }))}
          aria-modal
          role="dialog"
        >
          <div
            className="relative max-h-[85vh] w-full max-w-3xl rounded-xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-2 top-2 rounded-full bg-white/50 p-2 text-gray-700 hover:bg-white"
              onClick={() => setLightbox((s) => ({ ...s, open: false }))}
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="flex items-center justify-center">
              <img
                src={lightbox.url}
                className="max-h-[75vh] w-full max-w-full object-contain"
                alt="Preview"
              />
            </div>
          </div>
        </div>
      )}

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
