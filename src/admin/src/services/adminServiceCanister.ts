// Admin Service Firebase Interface
// This file now re-exports from the modularized services for backward compatibility
// All functionality has been split into separate modules:
// - serviceTypes.ts: All interfaces and types
// - coreUtils.ts: Core utility functions
// - notificationServices.ts: Notification functions
// - userManagement.ts: User roles and user management
// - serviceManagement.ts: Service CRUD operations
// - analyticsServices.ts: System-wide analytics
// - certificateServices.ts: Certificate validation
// - feedbackServices.ts: Reviews, reports, and feedback
// - chatServices.ts: Conversations
// - index.ts: Main barrel file that combines all services

// Re-export everything from the modularized index for backward compatibility
export {
  adminServiceCanister,
  assignRole,
  removeRole,
  getUserRole,
  checkAdminRole,
  listUserRoles,
  hasAdminRole,
  getSystemStats,
  getAllUsers,
  getBookingsData,
  getUserServicesAndBookings,
  getUserServiceCount,
  lockUserAccount,
  getAllUserLockStatuses,
  updateUserReputation,
  updateCertificateValidationStatus,
  getValidatedCertificates,
  getRejectedCertificates,
  getReportsFromFeedbackCanister,
  getFeedbackStats,
  getAllFeedback,
  updateReportStatus,
  sendTicketCommentNotificationToUser,
  updateAdminActor,
} from "./index";

// Re-export all types
export * from "./serviceTypes";
