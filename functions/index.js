/**
 * SRV Payment Integration Cloud Functions
 *
 * This file exports all the cloud functions for the SRV payment system
 */

const {setGlobalOptions} = require("firebase-functions/v2");

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
  adminUserAction,
  autoReactivateSuspendedAccounts,
} = require("./src/admin");


// Import Account Management functions
const {
  accountAction,
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
  feedbackAction,
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
  mediaAction,
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
exports.feedbackAction = feedbackAction;

// Export Chat Management Functions
exports.onMessageCreated = onMessageCreated;

// Export Notification Management Functions
exports.notificationAction = notificationAction;
exports.cleanupExpiredNotifications = cleanupExpiredNotifications;
exports.cleanupNotificationFrequency = cleanupNotificationFrequency;

// Export Media Management Functions
exports.mediaAction = mediaAction;

// Export Admin Management Functions
exports.adminUserAction = adminUserAction;

// Export Scheduled Admin Functions
exports.autoReactivateSuspendedAccounts = autoReactivateSuspendedAccounts;


// Export Contact Form Handler
const {sendContactEmail} = require("./sendContactEmail");
exports.sendContactEmail = sendContactEmail;

// Export Review Analysis Functions (Gemini AI)
const {
  analyzeNewReview,
  reviewAnalysisAction,
} = require("./src/queueReviewAnalysis");
exports.analyzeNewReview = analyzeNewReview;
exports.reviewAnalysisAction = reviewAnalysisAction;

// Export PH Location Functions
const {
  phLocationsAction,
} = require("./src/phLocations");
exports.phLocationsAction = phLocationsAction;
