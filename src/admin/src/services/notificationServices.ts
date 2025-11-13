import { notificationCanisterService } from "../../../frontend/src/services/notificationCanisterService";
import { callFirebaseFunction } from "./coreUtils";

/**
 * Helper function to send ticket status update notification
 * Sends to both client and provider if ticket is related to a booking
 */
export const sendTicketStatusNotification = async (
  userId: string,
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  ticketTitle: string,
) => {
  try {
    const statusText = newStatus
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const oldStatusText = oldStatus
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const title = "Ticket Status Updated";
    const message = `Your ticket "${ticketTitle}" status has been updated from ${oldStatusText} to ${statusText}.`;

    // Fetch the report to check if it's related to a booking and determine user type
    let relatedProviderId: string | undefined;
    let relatedClientId: string | undefined;
    let userType: "client" | "provider" = "client";

    try {
      // Use getReportById instead of getAllReports for better performance
      // The Firebase function expects: data.data.data || data, so we wrap in data
      const result = await callFirebaseFunction("getReportById", {
        data: { reportId: ticketId },
      });
      if (result) {
        const report = result as any;
        // Parse the description to check for booking-related data and source
        try {
          const parsedData = JSON.parse(report.description || "{}");

          // Determine user type based on source (always check this)
          if (
            parsedData.source === "provider_report" ||
            parsedData.source === "provider_cancellation"
          ) {
            userType = "provider";
          } else if (
            parsedData.source === "client_report" ||
            parsedData.source === "client_cancellation"
          ) {
            userType = "client";
          }

          // If ticket is related to a booking, get the related parties
          if (parsedData.bookingId) {
            relatedProviderId = parsedData.providerId;
            relatedClientId = parsedData.clientId;
          }
        } catch (e) {
          // Description might not be JSON, default to client
          console.warn("Could not parse report description:", e);
        }
      }
    } catch (e) {
      console.warn("Could not fetch report data for notification:", e);
      // Continue with default userType if we can't fetch the report
    }

    // Send notification to the ticket submitter
    await notificationCanisterService.createNotification(
      userId,
      userType,
      "generic",
      title,
      message,
      undefined, // No related entity ID to prevent navigation
      {
        ticketId,
        oldStatus,
        newStatus,
        ticketTitle,
      },
    );

    // If ticket is related to a booking, send notification to the other party
    if (relatedProviderId && relatedClientId) {
      const otherPartyId =
        userId === relatedClientId ? relatedProviderId : relatedClientId;
      const otherPartyType = userId === relatedClientId ? "provider" : "client";

      if (otherPartyId && otherPartyId !== userId) {
        // Add a small delay to avoid rate limiting when sending multiple notifications
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
          await notificationCanisterService.createNotification(
            otherPartyId,
            otherPartyType,
            "generic",
            title,
            message,
            undefined,
            {
              ticketId,
              oldStatus,
              newStatus,
              ticketTitle,
            },
          );
        } catch (otherPartyError) {
          console.error(
            `[sendTicketStatusNotification] Failed to notify related party ${otherPartyId}:`,
            otherPartyError,
          );
          // Don't throw - the main notification was sent successfully
        }
      }
    }
  } catch (error) {
    console.error(
      "[sendTicketStatusNotification] Error sending notification:",
      error,
    );
    // Don't throw error to avoid breaking the main flow
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
    let relatedProviderId: string | undefined;
    let relatedClientId: string | undefined;
    let userType: "client" | "provider" = "client";

    try {
      // Use getReportById instead of getAllReports for better performance
      // The Firebase function expects: data.data.data || data, so we wrap in data
      const result = await callFirebaseFunction("getReportById", {
        data: { reportId: ticketId },
      });
      if (result) {
        const report = result as any;
        // Parse the description to check for booking-related data and source
        try {
          const parsedData = JSON.parse(report.description || "{}");

          // Determine user type based on source (always check this)
          if (
            parsedData.source === "provider_report" ||
            parsedData.source === "provider_cancellation"
          ) {
            userType = "provider";
          } else if (
            parsedData.source === "client_report" ||
            parsedData.source === "client_cancellation"
          ) {
            userType = "client";
          }

          // If ticket is related to a booking, get the related parties
          if (parsedData.bookingId) {
            relatedProviderId = parsedData.providerId;
            relatedClientId = parsedData.clientId;
          }
        } catch (e) {
          // Description might not be JSON, default to client
          console.warn("Could not parse report description:", e);
        }
      }
    } catch (e) {
      console.warn("Could not fetch report data for notification:", e);
      // Continue with default userType if we can't fetch the report
    }

    // Send notification to the ticket submitter
    await notificationCanisterService.createNotification(
      userId,
      userType,
      "generic",
      title,
      message,
      undefined, // No related entity ID to prevent navigation
      {
        ticketId,
        ticketTitle,
        commentText,
        isInternal,
      },
    );

    // If ticket is related to a booking, send notification to the other party
    if (relatedProviderId && relatedClientId) {
      const otherPartyId =
        userId === relatedClientId ? relatedProviderId : relatedClientId;
      const otherPartyType = userId === relatedClientId ? "provider" : "client";

      if (otherPartyId && otherPartyId !== userId) {
        // Add a small delay to avoid rate limiting when sending multiple notifications
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
          await notificationCanisterService.createNotification(
            otherPartyId,
            otherPartyType,
            "generic",
            title,
            message,
            undefined,
            {
              ticketId,
              ticketTitle,
              commentText,
              isInternal,
            },
          );
        } catch (otherPartyError) {
          console.error(
            `[sendTicketCommentNotification] Failed to notify related party ${otherPartyId}:`,
            otherPartyError,
          );
          // Don't throw - the main notification was sent successfully
        }
      }
    }
  } catch (error) {
    console.error(
      "[sendTicketCommentNotification] Error sending notification:",
      error,
    );
    // Don't throw error to avoid breaking the main flow
  }
};

/**
 * Send ticket comment notification (exported function)
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
