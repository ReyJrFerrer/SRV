import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  TicketDetailsHeader,
  TicketDetailsCard,
  TicketComments,
  TicketStatusActions,
  TicketInfo,
  ImageAttachmentModal,
} from "../components";
import {
  Ticket,
  Comment,
  convertReportsToTickets,
  getStatusColor,
  getCategoryColor,
  formatDate,
} from "../utils/ticketUtils";

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshUsers, users: backendUsers } = useAdmin();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [imageDataUrls, setImageDataUrls] = useState<Record<string, string>>(
    {},
  );
  const [loadingImages, setLoadingImages] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Initialize firestore references and refresh data
  useEffect(() => {
    const initializeData = async () => {
      try {
        await refreshUsers();
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, [, refreshUsers]);

  // Load reports from firestore
  const loadReportsAsTickets = async (): Promise<Ticket[]> => {
    try {
      const { getReportsFromFeedbackCanister } = await import(
        "../services/adminServiceCanister"
      );
      const reports = await getReportsFromFeedbackCanister();
      const reportTickets = convertReportsToTickets(reports, backendUsers);
      return reportTickets;
    } catch (error) {
      console.error("Error loading reports:", error);
      return [];
    }
  };

  // Find ticket by ID from reports
  useEffect(() => {
    if (id && backendUsers.length > 0) {
      const loadTicket = async () => {
        setLoading(true);
        try {
          const reportTickets = await loadReportsAsTickets();
          const foundTicket = reportTickets.find((t) => t.id === id);

          setTicket(foundTicket || null);
        } catch (error) {
          console.error("Error loading ticket:", error);
          setTicket(null);
        } finally {
          setLoading(false);
        }
      };

      loadTicket();
    }
  }, [id, backendUsers]);

  // Load images using the media service
  useEffect(() => {
    if (ticket && ticket.attachments && ticket.attachments.length > 0) {
      const loadImages = async () => {
        setLoadingImages(true);
        const urls: Record<string, string> = {};

        try {
          // Import Firestore utilities and media service
          const { collection, query, where, getDocs } = await import(
            "firebase/firestore"
          );
          const { getFirebaseFirestore } = await import(
            "../services/firebaseApp"
          );
          const { getMediaItem } = await import(
            "../services/mediaServiceCanister"
          );

          const firestore = getFirebaseFirestore();
          for (const attachment of ticket.attachments!) {
            try {
              let mediaId = attachment;

              if (
                attachment.startsWith("http://") ||
                attachment.startsWith("https://")
              ) {
                console.log("Processing legacy URL attachment:", attachment);

                // Query Firestore to find media document with this URL
                const mediaCollection = collection(firestore, "media");
                const q = query(
                  mediaCollection,
                  where("url", "==", attachment),
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                  mediaId = querySnapshot.docs[0].id;
                  console.log(
                    "Found media ID for legacy URL:",
                    mediaId,
                    "URL:",
                    attachment,
                  );
                } else {
                  console.warn("No media found for URL:", attachment);
                  // Use URL directly as fallback
                  urls[attachment] = attachment;
                  continue;
                }
              } else {
                console.log("Processing media ID:", mediaId);
              }

              // Get media item which contains the public URL
              const mediaItem = await getMediaItem(mediaId);
              console.log("Got media item:", mediaItem);

              if (mediaItem && mediaItem.url) {
                let imageUrl = mediaItem.url;

                // Add timestamp to prevent caching issues
                if (!imageUrl.includes("&token=")) {
                  imageUrl = `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
                }

                console.log("Final image URL:", imageUrl);
                urls[attachment] = imageUrl;
                console.log("Successfully loaded image URL for:", attachment);
              } else {
                console.warn("Failed to get media item for:", attachment);
                urls[attachment] =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EError%3C/text%3E%3C/svg%3E";
              }
            } catch (error) {
              console.error(
                "Error loading image for attachment:",
                attachment,
                error,
              );
              urls[attachment] =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EError%3C/text%3E%3C/svg%3E";
            }
          }

          setImageDataUrls(urls);
        } catch (error) {
          console.error("Error in image loading process:", error);
        } finally {
          setLoadingImages(false);
        }
      };

      loadImages();
    }
  }, [ticket]);


  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    setUpdatingStatus(true);
    try {
      const reportId = ticket.id.replace("REPORT-", "");
      const oldStatus = ticket.status;

      // Call backend to update status with notification
      const { updateReportStatus } = await import(
        "../services/adminServiceCanister"
      );
      const success = await updateReportStatus(
        reportId,
        newStatus,
        ticket.submittedById,
        ticket.title,
        oldStatus,
      );

      if (success) {
        // Update local state
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus as Ticket["status"],
                lastUpdated: new Date().toISOString(),
                assignedTo:
                  newStatus === "in_progress"
                    ? "Admin_001"
                    : newStatus === "open"
                      ? undefined
                      : ticket.assignedTo,
              }
            : null,
        );

        console.log(`Ticket ${ticket.id} status updated to: ${newStatus}`);

        // Show success feedback
        const statusText = newStatus
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        console.log(
          `Status changed to "${statusText}" - persisted to backend and notification sent`,
        );
      } else {
        console.error("Failed to update status in backend");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!ticket || !newComment.trim()) return;

    const comment: Comment = {
      id: `COMMENT-${Date.now()}`,
      author: "Admin_001",
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
      isInternal,
    };

    setTicket((prev) =>
      prev
        ? {
            ...prev,
            comments: [...(prev.comments || []), comment],
            lastUpdated: new Date().toISOString(),
          }
        : null,
    );

    // Send notification to user about the new comment
    try {
      const { sendTicketCommentNotificationToUser } = await import(
        "../services/adminServiceCanister"
      );
      const reportId = ticket.id.replace("REPORT-", "");

      await sendTicketCommentNotificationToUser(
        ticket.submittedById,
        reportId,
        ticket.title,
        newComment.trim(),
        isInternal,
      );

      console.log(
        `Comment notification sent to user ${ticket.submittedById} for ticket ${ticket.id}`,
      );
    } catch (error) {
      console.error("Error sending comment notification:", error);
    }

    setNewComment("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm text-gray-500">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="h-12 w-12"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Ticket not found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            The ticket you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/ticket-inbox")}
            className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  console.log("From ticketDetails", ticket);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Image Modal */}
      {modalImage && (
        <ImageAttachmentModal
          src={modalImage}
          onClose={() => setModalImage(null)}
        />
      )}

      <TicketDetailsHeader ticketId={ticket.id} ticketTitle={ticket.title} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <TicketDetailsCard
              ticket={ticket}
              imageDataUrls={imageDataUrls}
              loadingImages={loadingImages}
              onImageClick={(url) => setModalImage(url)}
              getStatusColor={getStatusColor}
            />

            <TicketComments
              comments={ticket.comments}
              newComment={newComment}
              isInternal={isInternal}
              onCommentChange={setNewComment}
              onInternalChange={setIsInternal}
              onAddComment={handleAddComment}
              formatDate={formatDate}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <TicketStatusActions
              status={ticket.status}
              updatingStatus={updatingStatus}
              onStatusChange={handleStatusChange}
            />

            <TicketInfo
              ticket={ticket}
              formatDate={formatDate}
              getCategoryColor={getCategoryColor}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
