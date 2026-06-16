// Admin Service Firebase Interface
export {
  adminServiceCanister,
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
  updateCertificateValidationStatus,
  getValidatedCertificates,
  getRejectedCertificates,
  getReportsFromFeedbackCanister,
  getFeedbackStats,
  getAllFeedback,
  updateReportStatus,
  addReportComment,
  sendTicketCommentNotificationToUser,
  updateAdminActor,
} from "./index";
export * from "./serviceTypes";
export {
  getSettings,
  setSettings,
  isAdminPasswordSet,
  verifyAdminPassword,
  changeAdminPassword,
} from "./adminSettingsService";
export type { FrontendSystemSettings } from "./adminSettingsService";
