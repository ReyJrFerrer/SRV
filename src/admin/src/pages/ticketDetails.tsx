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
import { REPORT_PREFIX, COMMENT_PREFIX, ADMIN_USER_ID } from "../utils/constants";

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

  useEffect(() => {
    const initializeData = async () => {
      try {
        await refreshUsers();
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, [refreshUsers]);

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

  useEffect(() => {
    if (!ticket?.attachments?.length) return;

    const loadImages = async () => {
      setLoadingImages(true);
      try {
        const { getFirebaseFirestore } = await import(
          "../services/firebaseApp"
        );
        const { getMediaItem } = await import(
          "../services/mediaServiceCanister"
        );
        const { loadTicketAttachmentImages } = await import(
          "../utils/imageUtils"
        );

        const firestore = getFirebaseFirestore();
        const urls = await loadTicketAttachmentImages(
          ticket.attachments!,
          firestore,
          getMediaItem,
        );
        setImageDataUrls(urls);
      } catch (error) {
        console.error("Error in image loading process:", error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImages();
  }, [ticket]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    setUpdatingStatus(true);
    try {
      const reportId = ticket.id.replace(REPORT_PREFIX, "");
      const oldStatus = ticket.status;

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
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus as Ticket["status"],
                lastUpdated: new Date().toISOString(),
                assignedTo:
                  newStatus === "in_progress"
                    ? ADMIN_USER_ID
                    : newStatus === "open"
                      ? undefined
                      : ticket.assignedTo,
              }
            : null,
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
      id: `${COMMENT_PREFIX}${Date.now()}`,
      author: ADMIN_USER_ID,
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
      const reportId = ticket.id.replace(REPORT_PREFIX, "");

      await sendTicketCommentNotificationToUser(
        ticket.submittedById,
        reportId,
        ticket.title,
        newComment.trim(),
        isInternal,
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
