/**
 * SRV Payment Integration Cloud Functions
 *
 * This file exports all the cloud functions for the SRV payment system
 */

const {setGlobalOptions} = require("firebase-functions/v2");
const {admin} = require("./firebase-admin");

// Set global options for all functions
setGlobalOptions({
  maxInstances: 1,
  memory: "256MiB",
  region: "asia-southeast1",
});
// Import Reputation Bridge functions
const {
  reputationAction,
} = require("./src/reputation");

// Import Admin Management functions
const {
  getUserRole,
  listUserRoles,
  hasRole,
  setSettings,
  getSettings,
  getSystemStats,
  getUserServicesAndBookings,
  getUserServiceCount,
  getAllUserLockStatuses,
  lockUserAccount,
  updateUserReputation,
  getValidatedCertificates,
  getRejectedCertificates,
  getServicesWithCertificates,
  getPendingCertificateValidations,
  updateCertificateValidationStatus,
  autoReactivateSuspendedAccounts,
  getBookingsData,
  updateUserPhoneNumber,
} = require("./src/admin");


// Import Account Management functions
const {
  accountAction
} = require("./src/account");

// Import Service Management functions
const {
  serviceAction,
  processScheduledDeletions,
} = require("./src/service");

// Import Booking Management functions
const {
  bookingAction,
  cancelMissedBookings,
  sendServiceReminders,
} = require("./src/booking");


// Import Review Management functions
const {
  reviewAction,
} = require("./src/review");

// Import Feedback Management functions
const {
  submitFeedback,
  getAllFeedback,
  getMyFeedback,
  getFeedbackStats,
  getFeedbackById,
  getRecentFeedback,
  submitReport,
  getAllReports,
  getMyReports,
  updateReportStatus,
  getReportStats,
  getReportById,
  getRecentReports,
} = require("./src/feedback");

// Import Chat Management functions
const {
  onMessageCreated,
} = require("./src/chat");

// Import Notification Management functions
const {
  notificationAction,
  cleanupExpiredNotifications,
  cleanupNotificationFrequency,
} = require("./src/notification");

// Import Media Management functions
const {
  uploadMedia,
  getMediaItem,
  getFileData,
  getMediaByOwner,
  getMediaByTypeAndOwner,
  deleteMedia,
  updateMediaMetadata,
  getStorageStats,
  validateMediaItems,
  getCertificatesByValidationStatus,
} = require("./src/media");


// Export Reputation Bridge functions
exports.reputationAction = reputationAction;


// Export Account Management functions
exports.accountAction = accountAction;


// Export Service Management functions
exports.serviceAction = serviceAction;
exports.processScheduledDeletions = processScheduledDeletions;

// Export Booking Management Functions
exports.bookingAction = bookingAction;

// Export Scheduled Booking Functions (cron jobs)
exports.cancelMissedBookings = cancelMissedBookings;
exports.sendServiceReminders = sendServiceReminders;

// Export Review Management Functions
exports.reviewAction = reviewAction;


// Export Feedback Management Functions
exports.submitFeedback = submitFeedback;
exports.getAllFeedback = getAllFeedback;
exports.getMyFeedback = getMyFeedback;
exports.getFeedbackStats = getFeedbackStats;
exports.getFeedbackById = getFeedbackById;
exports.getRecentFeedback = getRecentFeedback;
exports.submitReport = submitReport;
exports.getAllReports = getAllReports;
exports.getMyReports = getMyReports;
exports.updateReportStatus = updateReportStatus;
exports.getReportStats = getReportStats;
exports.getReportById = getReportById;
exports.getRecentReports = getRecentReports;

// Export Chat Management Functions
exports.onMessageCreated = onMessageCreated;

// Export Notification Management Functions
exports.notificationAction = notificationAction;
exports.cleanupExpiredNotifications = cleanupExpiredNotifications;
exports.cleanupNotificationFrequency = cleanupNotificationFrequency;

// Export Media Management Functions
exports.uploadMedia = uploadMedia;
exports.getMediaItem = getMediaItem;
exports.getFileData = getFileData;
exports.getMediaByOwner = getMediaByOwner;
exports.getMediaByTypeAndOwner = getMediaByTypeAndOwner;
exports.deleteMedia = deleteMedia;
exports.updateMediaMetadata = updateMediaMetadata;
exports.getStorageStats = getStorageStats;
exports.validateMediaItems = validateMediaItems;
exports.getCertificatesByValidationStatus = getCertificatesByValidationStatus;

// Export Admin Management Functions
exports.getUserRole = getUserRole;
exports.listUserRoles = listUserRoles;
exports.hasRole = hasRole;
exports.setSettings = setSettings;
exports.getSettings = getSettings;
exports.getSystemStats = getSystemStats;
exports.getUserServicesAndBookings = getUserServicesAndBookings;
exports.getUserServiceCount = getUserServiceCount;
exports.getAllUserLockStatuses = getAllUserLockStatuses;
exports.lockUserAccount = lockUserAccount;
exports.updateUserReputation = updateUserReputation;
exports.updateUserPhoneNumber = updateUserPhoneNumber;
exports.getValidatedCertificates = getValidatedCertificates;
exports.getRejectedCertificates = getRejectedCertificates;
exports.getServicesWithCertificates = getServicesWithCertificates;
exports.getPendingCertificateValidations = getPendingCertificateValidations;
exports.updateCertificateValidationStatus = updateCertificateValidationStatus;
exports.getBookingsData = getBookingsData;

// Export Scheduled Admin Functions
exports.autoReactivateSuspendedAccounts = autoReactivateSuspendedAccounts;

// Export Admin Authentication Helper
const {createAdminProfile} = require("./src/adminAuth");
exports.createAdminProfile = createAdminProfile;

// Export Admin Password Functions
const {
  changeAdminPassword,
  verifyAdminPassword,
  isAdminPasswordSet,
} = require("./src/admin");
exports.changeAdminPassword = changeAdminPassword;
exports.verifyAdminPassword = verifyAdminPassword;
exports.isAdminPasswordSet = isAdminPasswordSet;

// Export Contact Form Handler
const {sendContactEmail} = require("./sendContactEmail");
exports.sendContactEmail = sendContactEmail;

// Export Review Analysis Functions (Gemini AI)
const {
  analyzeNewReview,
  queueReviewAnalysis,
  batchAnalyzeReviews,
} = require("./src/queueReviewAnalysis");
exports.analyzeNewReview = analyzeNewReview;
exports.queueReviewAnalysis = queueReviewAnalysis;
exports.batchAnalyzeReviews = batchAnalyzeReviews;

// Export PH Location Functions
const {
  phLocationsAction,
} = require("./src/phLocations");
exports.phLocationsAction = phLocationsAction;
