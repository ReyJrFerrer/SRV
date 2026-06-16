// Main barrel file that combines all admin services
import * as userManagement from "./userManagement";
import * as serviceManagement from "./serviceManagement";
import * as analyticsServices from "./analyticsServices";
import * as certificateServices from "./certificateServices";
import * as feedbackServices from "./feedbackServices";
import * as chatServices from "./chatServices";
import * as adminSettingsService from "./adminSettingsService";

// Main service object that combines all services
export const adminServiceCanister = {
  // User Role Management
  getUserRole: userManagement.getUserRole,
  checkAdminRole: userManagement.checkAdminRole,
  listUserRoles: userManagement.listUserRoles,
  hasAdminRole: userManagement.hasAdminRole,

  // User Management Functions
  lockUserAccount: userManagement.lockUserAccount,
  deleteUserAccount: userManagement.deleteUserAccount,
  restoreUserAccount: userManagement.restoreUserAccount,
  permanentDeleteUser: userManagement.permanentDeleteUser,
  getAllUserLockStatuses: userManagement.getAllUserLockStatuses,
  updateUserReputation: userManagement.updateUserReputation,
  updateUserPhoneNumber: userManagement.updateUserPhoneNumber,
  getUserAnalytics: userManagement.getUserAnalytics,
  getUserReviews: userManagement.getUserReviews,
  getUserReputation: userManagement.getUserReputation,
  getUserBookings: userManagement.getUserBookings,

  // Analytics & Reporting
  getSystemStats: analyticsServices.getSystemStats,
  getAllUsers: analyticsServices.getAllUsers,
  getBookingsData: analyticsServices.getBookingsData,

  // Service Management
  deleteService: serviceManagement.deleteService,
  getServicePackages: serviceManagement.getServicePackages,
  getServiceData: serviceManagement.getServiceData,
  getUserServicesAndBookings: serviceManagement.getUserServicesAndBookings,
  getUserServiceCount: serviceManagement.getUserServiceCount,

  // Certificate Validation
  getServicesWithCertificates: certificateServices.getServicesWithCertificates,
  getPendingCertificateValidations:
    certificateServices.getPendingCertificateValidations,
  updateCertificateValidationStatus:
    certificateServices.updateCertificateValidationStatus,
  getValidatedCertificates: certificateServices.getValidatedCertificates,
  getRejectedCertificates: certificateServices.getRejectedCertificates,

  // Reviews
  getServiceReviews: feedbackServices.getServiceReviews,
  getUserDetailedReviews: feedbackServices.getUserDetailedReviews,
  deleteReview: feedbackServices.deleteReview,
  restoreReview: feedbackServices.restoreReview,
  bulkUpdateReviewStatus: feedbackServices.bulkUpdateReviewStatus,

  // Conversations
  getUserConversations: chatServices.getUserConversations,
  getConversationMessages: chatServices.getConversationMessages,

  // Settings & Password
  getSettings: adminSettingsService.getSettings,
  setSettings: adminSettingsService.setSettings,
  isAdminPasswordSet: adminSettingsService.isAdminPasswordSet,
  verifyAdminPassword: adminSettingsService.verifyAdminPassword,
  changeAdminPassword: adminSettingsService.changeAdminPassword,
};

// Export individual functions for direct use
export const {
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
  deleteUserAccount,
  restoreUserAccount,
  permanentDeleteUser,
  getAllUserLockStatuses,
  updateUserReputation,
  updateUserPhoneNumber,
  updateCertificateValidationStatus,
  getValidatedCertificates,
  getRejectedCertificates,
} = adminServiceCanister;

// Export report/feedback functions
export {
  getReportsFromFeedbackCanister,
  getFeedbackStats,
  getAllFeedback,
  updateReportStatus,
  addReportComment,
} from "./feedbackServices";

// Export notification function
export { sendTicketCommentNotificationToUser } from "./notificationServices";

// Export settings & password functions
export {
  getSettings,
  setSettings,
  isAdminPasswordSet,
  verifyAdminPassword,
  changeAdminPassword,
} from "./adminSettingsService";
export type { FrontendSystemSettings } from "./adminSettingsService";

// Export core utilities
export { updateAdminActor } from "./coreUtils";

// Re-export all types
export * from "./serviceTypes";
