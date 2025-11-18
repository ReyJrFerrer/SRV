import { notificationCanisterService } from "../../../frontend/src/services/notificationCanisterService";
import { callFirebaseFunction } from "./coreUtils";

/**
 * Helper function to format status text (e.g., "in_progress" -> "In Progress")
 */
const formatStatusText = (status: string): string => {
  return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Interface for report data extracted from ticket
 */
interface TicketReportData {
  userType: "client" | "provider";
  relatedProviderId?: string;
  relatedClientId?: string;
}

/**
 * Helper function to fetch and parse report data for a ticket
 * Returns user type and related party IDs if ticket is related to a booking
 */
const getTicketReportData = async (
  ticketId: string,
): Promise<TicketReportData> => {
  const defaultData: TicketReportData = {
    userType: "client",
  };

  try {
    const result = await callFirebaseFunction("getReportById", {
      data: { reportId: ticketId },
    });

    if (!result) {
      return defaultData;
    }

    const report = result as any;
    try {
      const parsedData = JSON.parse(report.description || "{}");

      const data: TicketReportData = {
        userType: "client",
      };

      // Determine user type based on source
      if (
        parsedData.source === "provider_report" ||
        parsedData.source === "provider_cancellation"
      ) {
        data.userType = "provider";
      } else if (
        parsedData.source === "client_report" ||
        parsedData.source === "client_cancellation"
      ) {
        data.userType = "client";
      }

      // If ticket is related to a booking, get both users
      if (parsedData.bookingId) {
        data.relatedProviderId = parsedData.providerId;
        data.relatedClientId = parsedData.clientId;
      }

      return data;
    } catch (e) {
      console.warn("Could not parse report description:", e);
      return defaultData;
    }
  } catch (e) {
    console.warn("Could not fetch report data for notification:", e);
    return defaultData;
  }
};

/**
 * Helper function to send notification to the other party in a booking-related ticket
 */
const sendNotificationToOtherParty = async (
  userId: string,
  relatedProviderId: string | undefined,
  relatedClientId: string | undefined,
  title: string,
  message: string,
  metadata: Record<string, any>,
  functionName: string,
): Promise<void> => {
  if (!relatedProviderId || !relatedClientId) {
    return;
  }

  const otherPartyId =
    userId === relatedClientId ? relatedProviderId : relatedClientId;
  const otherPartyType = userId === relatedClientId ? "provider" : "client";

  if (!otherPartyId || otherPartyId === userId) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    await notificationCanisterService.createNotification(
      otherPartyId,
      otherPartyType,
      "generic",
      title,
      message,
      undefined,
      metadata,
    );
  } catch (otherPartyError) {
    console.error(
      `[${functionName}] Failed to notify related party ${otherPartyId}:`,
      otherPartyError,
    );
  }
};

/**
 * Helper function to send ticket status update notification
 */
export const sendTicketStatusNotification = async (
  userId: string,
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  ticketTitle: string,
) => {
  try {
    const statusText = formatStatusText(newStatus);
    const oldStatusText = formatStatusText(oldStatus);

    const title = "Ticket Status Updated";
    const message = `Your ticket "${ticketTitle}" status has been updated from ${oldStatusText} to ${statusText}.`;

    // Fetch the report to check if it's related to a booking and determine user type
    const reportData = await getTicketReportData(ticketId);
    const { userType, relatedProviderId, relatedClientId } = reportData;

    const metadata = {
      ticketId,
      oldStatus,
      newStatus,
      ticketTitle,
    };

    // Send notification to the ticket submitter
    await notificationCanisterService.createNotification(
      userId,
      userType,
      "generic",
      title,
      message,
      undefined,
      metadata,
    );

    // If ticket is related to a booking, send notification to other
    await sendNotificationToOtherParty(
      userId,
      relatedProviderId,
      relatedClientId,
      title,
      message,
      metadata,
      "sendTicketStatusNotification",
    );
  } catch (error) {
    console.error(
      "[sendTicketStatusNotification] Error sending notification:",
      error,
    );
  }
};

/**
 * Helper function to send ticket comment notification
 * Sends to both client and provider if ticket is related to a booking
 */
export const sendTicketCommentNotification = async (
  userId: string,
  ticketId: string,
  ticketTitle: string,
  commentText: string,
  isInternal: boolean = false,
) => {
  try {
    const title = isInternal ? "Internal Comment Added" : "New Comment Added";
    const message = isInternal
      ? `An internal comment has been added to your ticket "${ticketTitle}".`
      : `A new comment has been added to your ticket "${ticketTitle}": "${commentText.substring(0, 100)}${commentText.length > 100 ? "..." : ""}"`;

    // Fetch the report to check if it's related to a booking and determine user type
    const reportData = await getTicketReportData(ticketId);
    const { userType, relatedProviderId, relatedClientId } = reportData;

    const metadata = {
      ticketId,
      ticketTitle,
      commentText,
      isInternal,
    };

    // Send notification to the ticket submitter
    await notificationCanisterService.createNotification(
      userId,
      userType,
      "generic",
      title,
      message,
      undefined, // No related entity ID to prevent navigation
      metadata,
    );

    // If ticket is related to a booking, send notification to other
    await sendNotificationToOtherParty(
      userId,
      relatedProviderId,
      relatedClientId,
      title,
      message,
      metadata,
      "sendTicketCommentNotification",
    );
  } catch (error) {
    console.error(
      "[sendTicketCommentNotification] Error sending notification:",
      error,
    );
  }
};

/**
 * Send ticket comment notification
 */
export const sendTicketCommentNotificationToUser = async (
  userId: string,
  ticketId: string,
  ticketTitle: string,
  commentText: string,
  isInternal: boolean = false,
): Promise<boolean> => {
  try {
    await sendTicketCommentNotification(
      userId,
      ticketId,
      ticketTitle,
      commentText,
      isInternal,
    );

    return true;
  } catch (error) {
    console.error("Error sending ticket comment notification", error);
    return false;
  }
};
